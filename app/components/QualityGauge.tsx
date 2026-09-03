"use client";

import { CSSProperties } from "react";
import { QualityHeuristics } from "@/lib/types";

interface Props {
  rating: number;
  rationale: string;
  heuristics: QualityHeuristics;
}

const STATUS_BY_RATING: Record<number, { color: string; label: string }> = {
  1: { color: "var(--status-critical)", label: "Unreliable" },
  2: { color: "var(--status-serious)", label: "Shaky" },
  3: { color: "var(--status-warning)", label: "Workable" },
  4: { color: "var(--status-good)", label: "Solid" },
  5: { color: "var(--status-good)", label: "Excellent" },
};

const RADIUS = 80;
const ARC_LENGTH = Math.PI * RADIUS; // half circumference

export default function QualityGauge({ rating, rationale, heuristics }: Props) {
  const status = STATUS_BY_RATING[rating] ?? STATUS_BY_RATING[3];
  const fraction = Math.max(0, Math.min(1, rating / 5));
  const targetOffset = ARC_LENGTH * (1 - fraction);

  const gaugeStyle = {
    "--dash-full": ARC_LENGTH,
    "--dash-target": targetOffset,
  } as CSSProperties;

  return (
    <div className="rise flex h-full flex-col gap-6 rounded-2xl border border-border bg-surface p-6">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-ink-muted">Data quality</p>
        <h2 className="mt-1 font-display text-2xl italic text-ink">Is this worth modeling?</h2>
      </div>

      <div className="flex flex-col items-center">
        <svg viewBox="0 0 200 110" className="w-full max-w-[240px]">
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={status.color}
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={ARC_LENGTH}
            strokeDashoffset={targetOffset}
            className="gauge-sweep"
            style={gaugeStyle}
          />
          <text
            x="100"
            y="88"
            textAnchor="middle"
            className="font-display"
            style={{ fontSize: "42px", fill: "var(--ink)" }}
          >
            {rating}
            <tspan style={{ fontSize: "20px", fill: "var(--ink-muted)" }}>/5</tspan>
          </text>
        </svg>
        <p className="-mt-1 text-sm font-medium tracking-wide" style={{ color: status.color }}>
          {status.label}
        </p>
      </div>

      <p className="text-sm leading-relaxed text-ink-secondary">{rationale}</p>

      <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
        <div>
          <dt className="text-ink-muted">Missing data</dt>
          <dd className="mt-0.5 font-medium text-ink">{heuristics.missing_pct}%</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Duplicate rows</dt>
          <dd className="mt-0.5 font-medium text-ink">{heuristics.duplicate_row_pct}%</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-ink-muted">Suspiciously round values</dt>
          <dd className="mt-0.5 font-medium text-ink">
            {Math.round(heuristics.avg_round_number_ratio * 100)}% of numeric values
          </dd>
        </div>
        {heuristics.constant_like_columns.length > 0 && (
          <div className="col-span-2">
            <dt className="text-ink-muted">Flat columns</dt>
            <dd className="mt-0.5 font-medium text-ink">
              {heuristics.constant_like_columns.join(", ")}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
