const MODEL_LABELS: Record<string, string> = {
  linear_regression: "Linear Regression",
  ridge_regression: "Ridge Regression",
  logistic_regression: "Logistic Regression",
  random_forest: "Random Forest",
  gradient_boosting: "Gradient Boosting",
  knn: "K-Nearest Neighbors",
};

export function formatModelName(model: string): string {
  return MODEL_LABELS[model] ?? model;
}

const METRIC_LABELS: Record<string, string> = {
  r2: "R²",
  mae: "MAE",
  rmse: "RMSE",
  mape: "MAPE",
  accuracy: "Accuracy",
  f1: "F1 Score",
  precision: "Precision",
  recall: "Recall",
  roc_auc: "ROC AUC",
};

export function formatMetricLabel(metric: string): string {
  return METRIC_LABELS[metric] ?? metric;
}

const PERCENT_METRICS = new Set(["accuracy", "f1", "precision", "recall", "roc_auc", "mape"]);

export function formatMetricValue(metric: string, value: number | null): string {
  if (value === null) return "N/A";
  if (PERCENT_METRICS.has(metric)) return `${(value * 100).toFixed(1)}%`;
  if (Math.abs(value) >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return value.toFixed(3);
}

export function formatVariableName(name: string): string {
  return name.replace(/_/g, " ");
}
