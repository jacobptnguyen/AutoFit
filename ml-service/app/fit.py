"""Deterministic model fitting. Claude only picks target/features/model/
metrics - the actual training and scoring happens here in plain
scikit-learn so results are reproducible and easy to sanity-check.
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import (
    HistGradientBoostingClassifier, HistGradientBoostingRegressor,
    RandomForestClassifier, RandomForestRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.metrics import (
    accuracy_score, f1_score, mean_absolute_error, mean_absolute_percentage_error,
    precision_score, r2_score, recall_score, roc_auc_score, root_mean_squared_error,
)
from sklearn.neighbors import KNeighborsClassifier, KNeighborsRegressor
from sklearn.model_selection import train_test_split

MAX_CHART_POINTS = 200
MAX_CATEGORIES_PER_COLUMN = 20


class FitError(RuntimeError):
    pass


def _build_estimator(model: str, task_type: str):
    builders = {
        ("linear_regression", "regression"): lambda: LinearRegression(),
        ("ridge_regression", "regression"): lambda: Ridge(),
        ("logistic_regression", "classification"): lambda: LogisticRegression(max_iter=1000),
        ("random_forest", "regression"): lambda: RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1),
        ("random_forest", "classification"): lambda: RandomForestClassifier(n_estimators=200, random_state=42, n_jobs=-1),
        ("gradient_boosting", "regression"): lambda: HistGradientBoostingRegressor(random_state=42),
        ("gradient_boosting", "classification"): lambda: HistGradientBoostingClassifier(random_state=42),
        ("knn", "regression"): lambda: KNeighborsRegressor(),
        ("knn", "classification"): lambda: KNeighborsClassifier(),
    }
    key = (model, task_type)
    if key not in builders:
        raise FitError(f"No estimator for model={model!r} task_type={task_type!r}")
    return builders[key]()


def _cap_categories(series: pd.Series, max_categories: int) -> pd.Series:
    top_values = series.value_counts().head(max_categories).index
    return series.where(series.isin(top_values), "__other__")


def _prepare_features(df: pd.DataFrame, features: list[str]) -> pd.DataFrame:
    X = df[features].copy()
    numeric_cols = X.select_dtypes(include="number").columns
    categorical_cols = X.columns.difference(numeric_cols)

    if len(numeric_cols):
        non_empty_numeric = [c for c in numeric_cols if X[c].notna().any()]
        empty_numeric = [c for c in numeric_cols if c not in non_empty_numeric]
        if non_empty_numeric:
            X[non_empty_numeric] = SimpleImputer(strategy="median").fit_transform(X[non_empty_numeric])
        if empty_numeric:
            X = X.drop(columns=empty_numeric)
    if len(categorical_cols):
        for col in categorical_cols:
            X[col] = X[col].fillna("__missing__")
            if X[col].nunique() > MAX_CATEGORIES_PER_COLUMN:
                X[col] = _cap_categories(X[col], MAX_CATEGORIES_PER_COLUMN)
        X = pd.get_dummies(X, columns=list(categorical_cols), drop_first=True)

    return X


METRIC_FUNCS = {
    "r2": lambda y, p: r2_score(y, p),
    "mae": lambda y, p: mean_absolute_error(y, p),
    "rmse": lambda y, p: root_mean_squared_error(y, p),
    "mape": lambda y, p: mean_absolute_percentage_error(y, p),
    "accuracy": lambda y, p: accuracy_score(y, p),
    "f1": lambda y, p: f1_score(y, p, average="weighted"),
    "precision": lambda y, p: precision_score(y, p, average="weighted", zero_division=0),
    "recall": lambda y, p: recall_score(y, p, average="weighted", zero_division=0),
}


def fit_and_evaluate(df: pd.DataFrame, analysis: dict) -> dict:
    target = analysis["target_variable"]
    features = analysis["feature_variables"]
    task_type = analysis["task_type"]
    model_key = analysis["model"]
    metric_names = analysis["metrics"]

    data = df.dropna(subset=[target]).copy()
    if len(data) < 10:
        raise FitError("Not enough non-null target rows to fit a model")

    y = data[target]
    if task_type == "classification":
        y = y.astype(str)
    elif not pd.api.types.is_numeric_dtype(y):
        example = next((str(v) for v in y.unique() if pd.notna(v)), "")
        raise FitError(
            f"'{target}' isn't numeric (e.g. contains values like {example!r}), "
            "so it can't be a regression target. Try classification instead."
        )

    X = _prepare_features(data, features)

    can_stratify = task_type == "classification" and y.nunique() > 1 and y.value_counts().min() >= 2
    stratify = y if can_stratify else None

    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=stratify,
        )
        estimator = _build_estimator(model_key, task_type)
        estimator.fit(X_train, y_train)
        predictions = estimator.predict(X_test)
    except ValueError as exc:
        raise FitError(f"Could not fit this combination of target/features/model: {exc}") from exc

    metrics = {}
    for name in metric_names:
        if name == "roc_auc":
            metrics[name] = _safe_roc_auc(estimator, X_test, y_test)
            continue
        func = METRIC_FUNCS.get(name)
        if func is None:
            continue
        try:
            metrics[name] = round(float(func(y_test, predictions)), 4)
        except Exception:
            metrics[name] = None

    feature_importance = _extract_feature_importance(estimator, X.columns, X_test, y_test)

    actual_vs_predicted = [
        {"actual": _jsonable(a), "predicted": _jsonable(p)}
        for a, p in zip(y_test.tolist()[:MAX_CHART_POINTS], predictions.tolist()[:MAX_CHART_POINTS])
    ]

    return {
        "metrics": metrics,
        "feature_importance": feature_importance,
        "actual_vs_predicted": actual_vs_predicted,
        "test_set_size": len(y_test),
        "train_set_size": len(y_train),
    }


def _safe_roc_auc(estimator, X_test, y_test):
    try:
        if hasattr(estimator, "predict_proba"):
            proba = estimator.predict_proba(X_test)
            if proba.shape[1] == 2:
                return round(float(roc_auc_score(y_test, proba[:, 1])), 4)
            return round(float(roc_auc_score(y_test, proba, multi_class="ovr")), 4)
    except Exception:
        pass
    return None


def _extract_feature_importance(estimator, columns, X_test, y_test):
    values = None
    if hasattr(estimator, "feature_importances_"):
        values = estimator.feature_importances_
    elif hasattr(estimator, "coef_"):
        coef = np.asarray(estimator.coef_)
        values = np.abs(coef).mean(axis=0) if coef.ndim > 1 else np.abs(coef)
    elif X_test.shape[1] <= 50:
        result = permutation_importance(estimator, X_test, y_test, n_repeats=3, random_state=42, n_jobs=-1)
        values = result.importances_mean

    if values is None:
        return None

    pairs = sorted(zip(columns, values), key=lambda p: -abs(p[1]))[:15]
    return [{"feature": name, "importance": round(float(val), 4)} for name, val in pairs]


def _jsonable(value):
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return round(float(value), 4)
    return value
