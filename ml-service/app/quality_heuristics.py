"""Deterministic signals for the Data Quality panel. These feed the LLM
alongside the column profile - the LLM turns them into the final 1-5
rating and a plain-English rationale, rather than us hardcoding a formula.
"""
import numpy as np
import pandas as pd


def compute_quality_heuristics(df: pd.DataFrame) -> dict:
    n_rows = len(df)
    n_cols = len(df.columns)

    missing_cells = int(df.isna().sum().sum())
    total_cells = n_rows * n_cols if n_cols else 1
    missing_pct = round(missing_cells / total_cells * 100, 2)

    duplicate_row_pct = round(df.duplicated().sum() / n_rows * 100, 2) if n_rows else 0

    numeric_cols = df.select_dtypes(include="number")
    round_number_ratios = {}
    constant_like_columns = []
    for col in numeric_cols.columns:
        series = numeric_cols[col].dropna()
        if series.empty:
            continue
        # values suspiciously divisible by 10/100 - a sign of fabricated data
        round_ratio = float(((series % 10 == 0)).mean())
        round_number_ratios[col] = round(round_ratio, 3)

        mean = series.mean()
        std = series.std()
        if mean and (std is None or np.isclose(std, 0) or abs(std / mean) < 0.01):
            constant_like_columns.append(col)

    avg_round_ratio = (
        round(sum(round_number_ratios.values()) / len(round_number_ratios), 3)
        if round_number_ratios else 0
    )

    return {
        "missing_pct": missing_pct,
        "duplicate_row_pct": duplicate_row_pct,
        "avg_round_number_ratio": avg_round_ratio,
        "constant_like_columns": constant_like_columns,
        "row_count": n_rows,
        "column_count": n_cols,
    }
