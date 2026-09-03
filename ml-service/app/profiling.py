"""Builds a compact column-level profile of a dataframe to hand to the LLM.

The LLM never sees the raw dataset - only this profile plus a handful of
sample rows - so the payload stays small and cheap regardless of dataset size.
"""
import pandas as pd


def profile_dataframe(df: pd.DataFrame, sample_rows: int = 8) -> dict:
    columns = []
    for col in df.columns:
        series = df[col]
        dtype = str(series.dtype)
        missing = int(series.isna().sum())
        entry = {
            "name": col,
            "dtype": dtype,
            "missing_count": missing,
            "missing_pct": round(missing / len(df) * 100, 2) if len(df) else 0,
            "unique_count": int(series.nunique(dropna=True)),
        }

        if pd.api.types.is_numeric_dtype(series):
            desc = series.describe()
            entry.update({
                "kind": "numeric",
                "min": _safe_float(desc.get("min")),
                "max": _safe_float(desc.get("max")),
                "mean": _safe_float(desc.get("mean")),
                "std": _safe_float(desc.get("std")),
            })
        else:
            top_values = series.value_counts(dropna=True).head(5)
            entry.update({
                "kind": "categorical",
                "top_values": {str(k): int(v) for k, v in top_values.items()},
            })
        columns.append(entry)

    return {
        "row_count": len(df),
        "column_count": len(df.columns),
        "duplicate_row_count": int(df.duplicated().sum()),
        "columns": columns,
        "sample_rows": df.head(sample_rows).to_dict(orient="records"),
    }


def _safe_float(value):
    if value is None or pd.isna(value):
        return None
    return round(float(value), 4)
