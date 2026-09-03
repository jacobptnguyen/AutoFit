import { TaskType } from "./types";

// Mirrors ml-service/app/validation.py. The backend re-validates regardless;
// this only filters the manual-config form's options.
export const MODEL_SHORTLIST = [
  "linear_regression",
  "ridge_regression",
  "logistic_regression",
  "random_forest",
  "gradient_boosting",
  "knn",
] as const;

export const REGRESSION_METRICS = ["r2", "mae", "rmse", "mape"] as const;
export const CLASSIFICATION_METRICS = ["accuracy", "f1", "precision", "recall", "roc_auc"] as const;

const REGRESSION_ONLY_MODELS = new Set(["linear_regression", "ridge_regression"]);
const CLASSIFICATION_ONLY_MODELS = new Set(["logistic_regression"]);

export function modelsForTaskType(taskType: TaskType): string[] {
  return MODEL_SHORTLIST.filter((model) => {
    if (taskType === "classification" && REGRESSION_ONLY_MODELS.has(model)) return false;
    if (taskType === "regression" && CLASSIFICATION_ONLY_MODELS.has(model)) return false;
    return true;
  });
}

export function metricsForTaskType(taskType: TaskType): readonly string[] {
  return taskType === "regression" ? REGRESSION_METRICS : CLASSIFICATION_METRICS;
}
