"use client";

import { useRef, useState } from "react";
import { MAX_FILE_SIZE_BYTES } from "@/lib/api";
import { SampleDataset } from "@/lib/types";

interface Props {
  samples: SampleDataset[];
  disabled: boolean;
  onFile: (file: File) => void;
  onSample: (id: string) => void;
}

export default function UploadZone({ samples, disabled, onFile, onSample }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function validateAndSend(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setLocalError("Please upload a .csv file");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setLocalError("That file is over the 10MB limit for this demo");
      return;
    }
    setLocalError(null);
    onFile(file);
  }

  return (
    <div className="rise flex flex-col gap-5">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (disabled) return;
          const file = e.dataTransfer.files?.[0];
          if (file) validateAndSend(file);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-8 py-16 text-center transition-all duration-200 ${
          dragActive
            ? "border-accent bg-accent/5 shadow-[0_0_40px_-8px_rgba(255,176,32,0.35)]"
            : "border-border bg-surface hover:border-ink-muted"
        } ${disabled ? "pointer-events-none opacity-50" : ""}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) validateAndSend(file);
            e.target.value = "";
          }}
        />
        <span className="font-display text-3xl text-ink">Drop a CSV here</span>
        <span className="text-sm text-ink-secondary">or click to browse</span>
      </div>

      {localError && <p className="text-center text-sm text-status-critical">{localError}</p>}

      <div className="flex items-center gap-4 text-ink-muted">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs uppercase tracking-[0.18em]">or try one instantly</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {samples.map((sample) => (
          <button
            key={sample.id}
            disabled={disabled}
            onClick={() => onSample(sample.id)}
            className="rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-accent disabled:pointer-events-none disabled:opacity-50"
          >
            <p className="font-medium text-ink">{sample.name}</p>
            <p className="mt-1 text-xs text-ink-secondary">{sample.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
