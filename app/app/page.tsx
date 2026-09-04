"use client";

import { useEffect, useRef, useState } from "react";
import UploadZone from "@/components/UploadZone";
import QualityGauge from "@/components/QualityGauge";
import ResultsPanel from "@/components/ResultsPanel";
import { analyzeFile, analyzeSample, fetchSamples, refitAnalysis } from "@/lib/api";
import { AnalysisSource, AnalyzeResponse, AnalyzeResults, ManualConfig, SampleDataset } from "@/lib/types";

type Status = "idle" | "loading" | "done" | "error";

export default function Home() {
  const [samples, setSamples] = useState<SampleDataset[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [source, setSource] = useState<AnalysisSource | null>(null);
  const [autoResults, setAutoResults] = useState<AnalyzeResults | null>(null);
  const [datasetKey, setDatasetKey] = useState(0);
  const [refitting, setRefitting] = useState(false);
  const [refitError, setRefitError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const loadingRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchSamples()
      .then(setSamples)
      .catch(() => setSamples([]));
  }, []);

  useEffect(() => {
    if (status !== "loading") {
      setElapsedSeconds(0);
      return;
    }
    loadingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    const start = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  async function runAnalysis(task: () => Promise<AnalyzeResponse>, src: AnalysisSource) {
    setStatus("loading");
    setError(null);
    try {
      const response = await task();
      setResult(response);
      setAutoResults(response.results);
      setSource(src);
      setDatasetKey((k) => k + 1);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStatus("error");
    }
  }

  async function handleRefit(config: ManualConfig) {
    if (!source || !result) return;
    setRefitting(true);
    setRefitError(null);
    try {
      const newResults = await refitAnalysis(source, config);
      setResult({ ...result, results: newResults });
    } catch (err) {
      setRefitError(err instanceof Error ? err.message : "Could not re-run with those settings");
    } finally {
      setRefitting(false);
    }
  }

  function handleReset() {
    if (!autoResults || !result) return;
    setResult({ ...result, results: autoResults });
    setRefitError(null);
    setDatasetKey((k) => k + 1); // remounts ConfigPanel so its form re-syncs to the auto pick
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col gap-14 px-6 py-16 sm:py-24">
      <header className="rise flex flex-col gap-4">
        <span className="text-xs uppercase tracking-[0.3em] text-accent">AutoFit</span>
        <h1 className="max-w-2xl font-display text-4xl leading-tight text-ink sm:text-6xl">
          Evaluate a dataset in seconds
        </h1>
        <p className="max-w-xl text-base leading-relaxed text-ink-secondary">
          AutoFit reads your data, decides what&apos;s worth predicting, picks the model, and shows
          you the relationship. No target column, no ML background required.
        </p>
      </header>

      <UploadZone
        samples={samples}
        disabled={status === "loading"}
        onFile={(file) => runAnalysis(() => analyzeFile(file), { file })}
        onSample={(id) => runAnalysis(() => analyzeSample(id), { sampleId: id })}
      />

      {status === "loading" && (
        <div ref={loadingRef} className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3 text-ink-secondary">
            <span className="h-2 w-2 animate-ping rounded-full bg-accent" />
            <span className="text-sm">
              {elapsedSeconds < 15
                ? `Profiling your data and reasoning about it… (${elapsedSeconds}s)`
                : `Still working, the server may be waking up after sitting idle, this can take up to a minute… (${elapsedSeconds}s)`}
            </span>
          </div>
          <p className="text-xs text-ink-muted">Larger datasets may take longer to process.</p>
        </div>
      )}

      {status === "error" && error && (
        <div className="rounded-xl border border-status-critical/40 bg-status-critical/10 px-5 py-4 text-sm text-status-critical">
          {error}
        </div>
      )}

      {status === "done" && result && (
        <section key={datasetKey} className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr] lg:items-start">
          <QualityGauge
            rating={result.quality.rating}
            rationale={result.quality.rationale}
            heuristics={result.quality.heuristics}
          />
          <div className="flex flex-col gap-3">
            <ResultsPanel
              results={result.results}
              columns={result.columns}
              refitting={refitting}
              canReset={result.results.source === "manual"}
              onRefit={handleRefit}
              onReset={handleReset}
            />
            {refitError && <p className="text-sm text-status-critical">{refitError}</p>}
          </div>
        </section>
      )}

      <footer className="mt-auto pt-10 text-xs text-ink-muted">
        Nothing you upload is stored. It&apos;s processed in memory and discarded when the request ends.
      </footer>
    </main>
  );
}
