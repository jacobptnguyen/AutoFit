"use client";

import { useMemo } from "react";
import Plot from "./Plot";
import { basePlotlyLayout, plotlyConfig, CHART_COLORS } from "@/lib/chartTheme";
import { ActualPredictedPoint, TaskType } from "@/lib/types";

interface Props {
  points: ActualPredictedPoint[];
  taskType: TaskType;
  targetLabel: string;
}

interface LegendItem {
  label: string;
  color: string;
  dashed?: boolean;
}

export default function ActualVsPredictedChart({ points, taskType, targetLabel }: Props) {
  const { data, layout, legendItems } = useMemo(() => {
    if (taskType === "regression") {
      const actual = points.map((p) => Number(p.actual));
      const predicted = points.map((p) => Number(p.predicted));
      const min = Math.min(...actual, ...predicted);
      const max = Math.max(...actual, ...predicted);

      const data: Partial<Plotly.Data>[] = [
        {
          type: "scatter",
          mode: "markers",
          x: actual,
          y: predicted,
          name: "Prediction",
          marker: { color: CHART_COLORS.predicted, size: 7, opacity: 0.75 },
          hovertemplate: `Actual: %{x:,.2f}<br>Predicted: %{y:,.2f}<extra></extra>`,
        },
        {
          type: "scatter",
          mode: "lines",
          x: [min, max],
          y: [min, max],
          name: "Perfect prediction",
          line: { color: CHART_COLORS.inkMuted, dash: "dash", width: 1.5 },
          hoverinfo: "skip",
        },
      ];

      const layout: Partial<Plotly.Layout> = {
        ...basePlotlyLayout,
        showlegend: false,
        xaxis: { ...basePlotlyLayout.xaxis, title: { text: `Actual ${targetLabel}` } },
        yaxis: { ...basePlotlyLayout.yaxis, title: { text: `Predicted ${targetLabel}` } },
      };

      const legendItems: LegendItem[] = [
        { label: "Prediction", color: CHART_COLORS.predicted },
        { label: "Perfect prediction", color: CHART_COLORS.inkMuted, dashed: true },
      ];

      return { data, layout, legendItems };
    }

    const classes = Array.from(
      new Set([...points.map((p) => String(p.actual)), ...points.map((p) => String(p.predicted))]),
    ).sort();
    const countBy = (key: "actual" | "predicted") =>
      classes.map((cls) => points.filter((p) => String(p[key]) === cls).length);

    const data: Partial<Plotly.Data>[] = [
      {
        type: "bar",
        x: classes,
        y: countBy("actual"),
        name: "Actual",
        marker: { color: CHART_COLORS.actual },
      },
      {
        type: "bar",
        x: classes,
        y: countBy("predicted"),
        name: "Predicted",
        marker: { color: CHART_COLORS.predicted },
      },
    ];

    const layout: Partial<Plotly.Layout> = {
      ...basePlotlyLayout,
      showlegend: false,
      barmode: "group",
      xaxis: { ...basePlotlyLayout.xaxis, title: { text: targetLabel } },
      yaxis: { ...basePlotlyLayout.yaxis, title: { text: "Count (test set)" } },
    };

    const legendItems: LegendItem[] = [
      { label: "Actual", color: CHART_COLORS.actual },
      { label: "Predicted", color: CHART_COLORS.predicted },
    ];

    return { data, layout, legendItems };
  }, [points, taskType, targetLabel]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Predicted vs. actual</p>
        <div className="flex items-center gap-5">
          {legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-2 text-xs text-ink-secondary">
              {item.dashed ? (
                <svg width="22" height="8" className="shrink-0">
                  <line x1="0" y1="4" x2="22" y2="4" stroke={item.color} strokeWidth="1.5" strokeDasharray="7 5" />
                </svg>
              ) : (
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              )}
              {item.label}
            </div>
          ))}
        </div>
      </div>
      <Plot
        data={data}
        layout={layout}
        config={plotlyConfig}
        style={{ width: "100%", height: "320px" }}
        useResizeHandler
      />
    </div>
  );
}
