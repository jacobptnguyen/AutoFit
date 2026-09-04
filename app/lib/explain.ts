import { AnalyzeResults } from "./types";
import { formatMetricValue, formatVariableName } from "./format";

export interface ResultsExplanation {
  relationshipExplanation: string;
  metricsExplanation: string;
}

export function explainResults(results: AnalyzeResults): ResultsExplanation {
  return {
    relationshipExplanation: explainRelationship(results),
    metricsExplanation: explainMetrics(results),
  };
}

function explainRelationship(results: AnalyzeResults): string {
  const target = formatVariableName(results.target_variable);
  const top = results.feature_importance?.length
    ? [...results.feature_importance].sort((a, b) => b.importance - a.importance)[0]
    : null;

  if (top) {
    return `${formatVariableName(top.feature)} is the biggest driver of ${target} here — it influenced the model's predictions more than any other factor it considered.`;
  }

  const features = results.feature_variables.map(formatVariableName);
  const featureList =
    features.length > 1
      ? `${features.slice(0, -1).join(", ")} and ${features[features.length - 1]}`
      : (features[0] ?? "the selected columns");
  return `The model looked at ${featureList} together to predict ${target}, without a clear single factor standing out above the rest.`;
}

type MetricClause = (value: number, target: string) => string;

const METRIC_CLAUSES: Record<string, MetricClause> = {
  r2: (v, target) =>
    `R² (${formatMetricValue("r2", v)}) says the model explains ${describeR2(v)} of what makes ${target} go up or down`,
  mae: (v, target) =>
    `MAE (${formatMetricValue("mae", v)}) is the average size of a miss — a typical prediction lands about that far from the real ${target}`,
  rmse: (v) =>
    `RMSE (${formatMetricValue("rmse", v)}) is a similar error measure that penalizes big misses more than MAE does`,
  mape: (v) =>
    `MAPE (${formatMetricValue("mape", v)}) is the average error as a percentage, so it's easy to judge even without knowing the units`,
  accuracy: (v) =>
    `Accuracy (${formatMetricValue("accuracy", v)}) is the share of test rows the model classified correctly`,
  f1: (v) =>
    `F1 Score (${formatMetricValue("f1", v)}) blends "did it catch the real cases" and "did it avoid false alarms" into one number`,
  precision: (v) =>
    `Precision (${formatMetricValue("precision", v)}) is how often the model was right when it predicted a positive case`,
  recall: (v) =>
    `Recall (${formatMetricValue("recall", v)}) is how many of the real positive cases the model actually caught`,
  roc_auc: (v) =>
    `ROC AUC (${formatMetricValue("roc_auc", v)}) measures how well the model separates the classes — 50% is a coin flip, 100% is perfect`,
};

function describeR2(v: number): string {
  if (v >= 0.9) return "almost all";
  if (v >= 0.7) return "most";
  if (v >= 0.4) return "some, but not most";
  if (v >= 0) return "very little";
  return "essentially none — it's doing worse than just guessing the average";
}

function explainMetrics(results: AnalyzeResults): string {
  const target = formatVariableName(results.target_variable);
  const clauses = Object.entries(results.metrics)
    .filter((e): e is [string, number] => e[1] !== null && e[0] in METRIC_CLAUSES)
    .map(([key, value]) => METRIC_CLAUSES[key](value, target));

  if (clauses.length === 0) return "No evaluation metrics were available for this run.";

  const intro =
    results.task_type === "regression"
      ? `Here's what the scores above actually mean for predicting ${target}:`
      : `Here's what the scores above actually mean for sorting ${target} into the right category:`;

  return `${intro} ${clauses.join(". ")}.`;
}
