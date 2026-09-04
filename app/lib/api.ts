import { AnalysisSource, AnalyzeResponse, AnalyzeResults, ApiError, ManualConfig, SampleDataset } from "./types";

export const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024;

export async function fetchSamples(): Promise<SampleDataset[]> {
  const res = await fetch("/api/samples");
  const data = await res.json();
  if (!res.ok) throw new Error((data as ApiError).error ?? "Could not load sample datasets");
  return data.samples;
}

export async function analyzeFile(file: File): Promise<AnalyzeResponse> {
  const form = new FormData();
  form.set("file", file);
  const res = await fetch("/api/analyze", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error((data as ApiError).error ?? "Analysis failed");
  return data as AnalyzeResponse;
}

export async function analyzeSample(sampleId: string): Promise<AnalyzeResponse> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sample_id: sampleId }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error((data as ApiError).error ?? "Analysis failed");
  return data as AnalyzeResponse;
}

export async function refitAnalysis(source: AnalysisSource, config: ManualConfig): Promise<AnalyzeResults> {
  let res: Response;
  if ("file" in source) {
    const form = new FormData();
    form.set("file", source.file);
    form.set("config", JSON.stringify(config));
    res = await fetch("/api/refit", { method: "POST", body: form });
  } else {
    res = await fetch("/api/refit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sample_id: source.sampleId, config }),
    });
  }
  const data = await res.json();
  if (!res.ok) throw new Error((data as ApiError).error ?? "Refit failed");
  return (data as { results: AnalyzeResults }).results;
}
