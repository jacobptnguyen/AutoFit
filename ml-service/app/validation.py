"""Shared validation for a modeling config (target/features/task_type/model/
metrics), used by both the Claude tool-output path (reasoning.py) and the
manual refit path (a user's own picks in __init__.py's /api/refit route).
"""

MODEL_SHORTLIST = [
    "linear_regression",
    "ridge_regression",
    "logistic_regression",
    "random_forest",
    "gradient_boosting",
    "knn",
]

REGRESSION_METRICS = ["r2", "mae", "rmse", "mape"]
CLASSIFICATION_METRICS = ["accuracy", "f1", "precision", "recall", "roc_auc"]

REGRESSION_ONLY_MODELS = {"linear_regression", "ridge_regression"}
CLASSIFICATION_ONLY_MODELS = {"logistic_regression"}


class ConfigValidationError(ValueError):
    pass


def validate_config(config: dict, columns: set[str]) -> None:
    target = config.get("target_variable")
    features = config.get("feature_variables") or []
    task_type = config.get("task_type")
    model = config.get("model")
    metrics = config.get("metrics") or []

    if target not in columns:
        raise ConfigValidationError(f"Target variable {target!r} is not present in the dataset")
    unknown_features = set(features) - columns
    if unknown_features:
        raise ConfigValidationError(f"Unknown feature variables: {sorted(unknown_features)}")
    if not features:
        raise ConfigValidationError("At least one feature variable is required")
    if target in features:
        raise ConfigValidationError("Target variable cannot also be a feature variable")

    if task_type not in ("regression", "classification"):
        raise ConfigValidationError(f"Invalid task_type: {task_type!r}")

    if model not in MODEL_SHORTLIST:
        raise ConfigValidationError(f"Unknown model: {model!r}")
    if task_type == "classification" and model in REGRESSION_ONLY_MODELS:
        raise ConfigValidationError(f"{model} is not valid for a classification task")
    if task_type == "regression" and model in CLASSIFICATION_ONLY_MODELS:
        raise ConfigValidationError(f"{model} is not valid for a regression task")

    if not metrics:
        raise ConfigValidationError("At least one metric is required")
    allowed_metrics = REGRESSION_METRICS if task_type == "regression" else CLASSIFICATION_METRICS
    bad_metrics = [m for m in metrics if m not in allowed_metrics]
    if bad_metrics:
        raise ConfigValidationError(f"Metrics {bad_metrics} do not match task_type {task_type}")
