"use client";

import { useMemo } from "react";
import Plot from "./Plot";
import { basePlotlyLayout, plotlyConfig } from "@/lib/chartTheme";
import { FeatureImportance } from "@/lib/types";
import { formatVariableName } from "@/lib/format";

interface Props {
  features: FeatureImportance[];
}

// Light -> dark, low -> high magnitude. Lightest step reads as "near zero".
const SEQUENTIAL_TEAL = ["#8bd8cc", "#4fc0b1", "#1fa898", "#1a8578", "#146e64", "#0e5750"];

export default function FeatureImportanceChart({ features }: Props) {
  const { data, layout, height } = useMemo(() => {
    const sorted = [...features].sort((a, b) => a.importance - b.importance).slice(-10);
    const maxImportance = Math.max(...sorted.map((f) => f.importance), 1e-9);

    const data: Partial<Plotly.Data>[] = [
      {
        type: "bar",
        orientation: "h",
        x: sorted.map((f) => f.importance),
        y: sorted.map((f) => formatVariableName(f.feature)),
        marker: {
          color: sorted.map((f) =>
            SEQUENTIAL_TEAL[
              Math.min(
                SEQUENTIAL_TEAL.length - 1,
                Math.floor((f.importance / maxImportance) * (SEQUENTIAL_TEAL.length - 1)),
              )
            ],
          ),
        },
        hovertemplate: "%{y}: %{x:.3f}<extra></extra>",
      },
    ];

    const layout: Partial<Plotly.Layout> = {
      ...basePlotlyLayout,
      showlegend: false,
      xaxis: { ...basePlotlyLayout.xaxis, title: { text: "Relative importance" } },
      yaxis: { ...basePlotlyLayout.yaxis, automargin: true },
    };

    return { data, layout, height: Math.max(220, sorted.length * 34) };
  }, [features]);

  return (
    <Plot
      data={data}
      layout={layout}
      config={plotlyConfig}
      style={{ width: "100%", height: `${height}px` }}
      useResizeHandler
    />
  );
}
