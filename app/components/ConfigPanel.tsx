"use client";

import { useMemo, useState } from "react";
import { modelsForTaskType, metricsForTaskType } from "@/lib/modelRules";
import { formatMetricLabel, formatModelName, formatVariableName } from "@/lib/format";
import { AnalyzeResults, ColumnInfo, ManualConfig, TaskType } from "@/lib/types";

interface Props {
  columns: ColumnInfo[];
  results: AnalyzeResults;
  disabled: boolean;
  canReset: boolean;
  onSubmit: (config: ManualConfig) => void;
  onReset: () => void;
}

function inferTaskType(column: ColumnInfo | undefined): TaskType {
  if (!column) return "regression";
  if (column.kind === "numeric" && column.unique_count > 12) return "regression";
  return "classification";
}

export default function ConfigPanel({ columns, results, disabled, canReset, onSubmit, onReset }: Props) {
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(results.target_variable);
  const [features, setFeatures] = useState<Set<string>>(new Set(results.feature_variables));
  const [taskType, setTaskType] = useState<TaskType>(results.task_type);
  const [model, setModel] = useState(results.model);
  const [metrics, setMetrics] = useState<Set<string>>(new Set(Object.keys(results.metrics)));
  const [formError, setFormError] = useState<string | null>(null);

  const availableModels = useMemo(() => modelsForTaskType(taskType), [taskType]);
  const availableMetrics = useMemo(() => metricsForTaskType(taskType), [taskType]);
  const targetColumn = columns.find((c) => c.name === target);
  const taskTypeOptions: TaskType[] =
    targetColumn?.kind === "categorical" ? ["classification"] : ["regression", "classification"];

  function selectTarget(name: string) {
    setTarget(name);
    setFeatures((prev) => {
      const next = new Set(prev);
      next.delete(name);
      return next;
    });
    const suggested = inferTaskType(columns.find((c) => c.name === name));
    setTaskType(suggested);
    setModel(modelsForTaskType(suggested)[0]);
    setMetrics(new Set(metricsForTaskType(suggested).slice(0, 2)));
  }

  function changeTaskType(next: TaskType) {
    setTaskType(next);
    setModel(modelsForTaskType(next)[0]);
    setMetrics(new Set(metricsForTaskType(next).slice(0, 2)));
  }

  function toggleFeature(name: string) {
    setFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function toggleMetric(name: string) {
    setMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function handleSubmit() {
    if (features.size === 0) {
      setFormError("Pick at least one feature variable");
      return;
    }
    if (metrics.size === 0) {
      setFormError("Pick at least one metric");
      return;
    }
    setFormError(null);
    onSubmit({
      target_variable: target,
      feature_variables: Array.from(features),
      task_type: taskType,
      model,
      metrics: Array.from(metrics),
    });
  }

  return (
    <div className="border-t border-border pt-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-ink-muted transition-colors hover:text-ink-secondary"
      >
        <span className={`inline-block transition-transform duration-200 ${open ? "rotate-90" : ""}`}>
          &rsaquo;
        </span>
        Configure manually
      </button>

      {open && (
        <div className="mt-4 flex flex-col gap-5 rounded-xl border border-border bg-surface-2 p-5">
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-wide text-ink-muted">
              Predict
            </label>
            <select
              value={target}
              onChange={(e) => selectTarget(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            >
              {columns.map((c) => (
                <option key={c.name} value={c.name}>
                  {formatVariableName(c.name)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-wide text-ink-muted">
              Using features
            </label>
            <div className="flex flex-wrap gap-2">
              {columns
                .filter((c) => c.name !== target)
                .map((c) => (
                  <button
                    key={c.name}
                    onClick={() => toggleFeature(c.name)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      features.has(c.name)
                        ? "border-accent bg-accent/10 text-accent"
                        : "border-border text-ink-secondary hover:border-ink-muted"
                    }`}
                  >
                    {formatVariableName(c.name)}
                  </button>
                ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-5">
            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-wide text-ink-muted">
                Task
              </label>
              <div className="inline-flex rounded-lg border border-border p-0.5">
                {taskTypeOptions.map((t) => (
                  <button
                    key={t}
                    onClick={() => changeTaskType(t)}
                    className={`rounded-md px-3 py-1.5 text-xs capitalize transition-colors ${
                      taskType === t ? "bg-accent text-bg" : "text-ink-secondary hover:text-ink"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              {taskTypeOptions.length === 1 && (
                <p className="mt-1 text-[10px] text-ink-muted">
                  {formatVariableName(target)} isn&apos;t numeric, so only classification applies
                </p>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-[10px] uppercase tracking-wide text-ink-muted">
                Model
              </label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink focus:border-accent focus:outline-none"
              >
                {availableModels.map((m) => (
                  <option key={m} value={m}>
                    {formatModelName(m)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-wide text-ink-muted">
              Metrics
            </label>
            <div className="flex flex-wrap gap-2">
              {availableMetrics.map((m) => (
                <button
                  key={m}
                  onClick={() => toggleMetric(m)}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    metrics.has(m)
                      ? "border-series-predicted bg-series-predicted/10 text-series-predicted"
                      : "border-border text-ink-secondary hover:border-ink-muted"
                  }`}
                >
                  {formatMetricLabel(m)}
                </button>
              ))}
            </div>
          </div>

          {formError && <p className="text-sm text-status-critical">{formError}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSubmit}
              disabled={disabled}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              Re-run with these settings
            </button>
            {canReset && (
              <button
                onClick={onReset}
                disabled={disabled}
                className="text-sm text-ink-secondary underline decoration-border underline-offset-4 hover:text-ink disabled:opacity-50"
              >
                Reset to AI&apos;s pick
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
