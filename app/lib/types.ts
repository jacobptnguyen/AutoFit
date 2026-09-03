export interface SampleDataset {
  id: string;
  name: string;
  description: string;
}

export interface QualityHeuristics {
  missing_pct: number;
  duplicate_row_pct: number;
  avg_round_number_ratio: number;
  constant_like_columns: string[];
  row_count: number;
  column_count: number;
}

export type TaskType = "regression" | "classification";
export type ResultSource = "auto" | "manual";

export interface FeatureImportance {
  feature: string;
  importance: number;
}

export interface ActualPredictedPoint {
  actual: number | string;
  predicted: number | string;
}

export interface ColumnInfo {
  name: string;
  kind: "numeric" | "categorical";
  unique_count: number;
}

export type AnalysisSource = { file: File } | { sampleId: string };

export interface ManualConfig {
  target_variable: string;
  feature_variables: string[];
  task_type: TaskType;
  model: string;
  metrics: string[];
}

export interface AnalyzeResults {
  target_variable: string;
  feature_variables: string[];
  task_type: TaskType;
  model: string;
  modeling_rationale: string | null;
  source: ResultSource;
  metrics: Record<string, number | null>;
  feature_importance: FeatureImportance[] | null;
  actual_vs_predicted: ActualPredictedPoint[];
  test_set_size: number;
  train_set_size: number;
}

export interface AnalyzeResponse {
  quality: {
    rating: number;
    rationale: string;
    heuristics: QualityHeuristics;
  };
  results: AnalyzeResults;
  dataset: { row_count: number; column_count: number };
  columns: ColumnInfo[];
}

export interface ApiError {
  error: string;
}
