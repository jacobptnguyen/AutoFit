"use client";

import { AnalyzeResults, ColumnInfo, ManualConfig } from "@/lib/types";
import { formatMetricLabel, formatMetricValue, formatModelName, formatVariableName } from "@/lib/format";
import ActualVsPredictedChart from "./charts/ActualVsPredictedChart";
import FeatureImportanceChart from "./charts/FeatureImportanceChart";
import ConfigPanel from "./ConfigPanel";

interface Props {
  results: AnalyzeResults;
  columns: ColumnInfo[];
  refitting: boolean;
  canReset: boolean;
  onRefit: (config: ManualConfig) => void;
  onReset: () => void;
}

export default function ResultsPanel({ results, columns, refitting, canReset, onRefit, onReset }: Props) {
  return (
    <div className="rise flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6" style={{ animationDelay: "80ms" }}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">
            Predicting {formatVariableName(results.target_variable)}
          </p>
          <h2 className="mt-1 font-display text-2xl italic text-ink">
            {formatModelName(results.model)}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-border px-3 py-1 text-xs uppercase tracking-wide text-ink-secondary">
            {results.task_type}
          </span>
          <span
            className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide ${
              results.source === "auto"
                ? "border border-accent/40 bg-accent/10 text-accent"
                : "border border-series-predicted/40 bg-series-predicted/10 text-series-predicted"
            }`}
          >
            {results.source === "auto" ? "AI-picked" : "Custom"}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        {Object.entries(results.metrics).map(([key, value]) => (
          <div key={key} className="rounded-lg border border-border bg-surface-2 px-4 py-2">
            <p className="text-[10px] uppercase tracking-wide text-ink-muted">{formatMetricLabel(key)}</p>
            <p className="font-display text-xl text-accent">{formatMetricValue(key, value)}</p>
          </div>
        ))}
      </div>

      {results.modeling_rationale && (
        <p className="text-sm leading-relaxed text-ink-secondary">{results.modeling_rationale}</p>
      )}

      <ActualVsPredictedChart
        points={results.actual_vs_predicted}
        taskType={results.task_type}
        targetLabel={formatVariableName(results.target_variable)}
      />

      {results.feature_importance && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.18em] text-ink-muted">
            What drove the prediction
          </p>
          <FeatureImportanceChart features={results.feature_importance} />
        </div>
      )}

      <p className="text-xs text-ink-muted">
        Trained on {results.train_set_size.toLocaleString()} rows, evaluated on{" "}
        {results.test_set_size.toLocaleString()} held-out rows.
      </p>

      <ConfigPanel
        columns={columns}
        results={results}
        disabled={refitting}
        canReset={canReset}
        onSubmit={onRefit}
        onReset={onReset}
      />
    </div>
  );
}
