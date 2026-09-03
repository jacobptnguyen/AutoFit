# AutoFit

## What this is

AutoFit turns a raw CSV into a predictive model and a plain-English explanation of what it found, with no ML knowledge required. You don't pick a target column, don't pick predictors, don't pick a model architecture. You upload data; AutoFit figures out what's worth predicting, what predicts it, which model fits, and shows you the result.

The founding problem: You must already know your dependent/independent variables and which model to reach for before the tool does anything useful. The friction AutoFit removes is the gap between "I have a spreadsheet" and "I can see the relationships in it."

## Core flow

1. **Input**: user uploads a CSV, or clicks a bundled sample dataset (one click, no external steps).
2. **Profile**: the Flask service loads the CSV with pandas and computes a column-level profile: dtypes, cardinality, missingness, distribution summaries, a handful of sample rows. The full dataset is never sent to the LLM, only this profile, for both cost and privacy reasons.
3. **Reason**: the profile is sent to Claude, which returns: the most sensible dependent variable, the independent variables to use, one model chosen from a curated shortlist, the evaluation metric(s) appropriate for that target/model combination (e.g. R² + MAE for a continuous target, accuracy + F1 for an imbalanced classification target), and a plain-English rationale for all of it. The metric choice is not hardcoded by target dtype; Claude reasons about it the way a practitioner would (e.g. preferring F1 over raw accuracy when classes are imbalanced).
4. **Fit**: the Flask service actually fits the chosen scikit-learn model on the real data and computes the metric(s) Claude selected, plus the numeric series the frontend needs to chart (e.g. actual vs. predicted, or feature importances).
5. **Render**: the frontend shows one results screen with two co-equal panels:
   - **Data Quality panel**: a 1-5 rating covering data completeness (missingness, inconsistent types, duplicate rows) and likely-synthetic/AI-generated-data detection (uniformity/entropy heuristics plus an LLM judgment call). This is deliberately not where predictive signal strength lives; that's already visible in the results panel below via the chosen metric(s), so it isn't duplicated here.
   - **Results panel**: the auto-picked model, the variables it chose, the metric(s) Claude selected (with their values), and an interactive chart.
   - **Layout**: on wide viewports, the rating panel sits on the left and the graphs on the right. When there isn't room for both side by side, stack them with the rating first and the graphs below.
6. **Nothing persists**: the uploaded file is processed in memory for the duration of the request and then discarded. No database, no disk writes, no logging of raw uploaded content.

## Manual override

The AI's picks are a starting point, not the only option. Once results are shown, a collapsed "Configure manually" control lets the user override the target, features, task type, model, and metrics themselves, then re-run. This re-run never calls Claude: it hits a separate deterministic endpoint (`/api/refit`) that re-validates the config with the same rules as the Claude path and calls straight into the scikit-learn fit. It's instant, free, and doesn't depend on the API being up, because the LLM's job is to produce the first recommendation, not to narrate the user's own choices. The results panel shows a "Custom" tag instead of a rationale when displaying a manual run, and a "Reset to AI's pick" control restores the original auto result client-side with no network call. The Data Quality panel never changes on a manual re-run since it's dataset-level, not model-level.

## Model shortlist

Claude picks one of the following based on the target's data type and the profile (not a full AutoML search; the point is a fast, explainable choice):

- Linear Regression
- Ridge Regression
- Logistic Regression
- Random Forest (classifier or regressor, as appropriate)
- Gradient Boosting (classifier or regressor)
- K-Nearest Neighbors

## Architecture

Two deployables:

- **`/app`, Next.js (TypeScript)**: the UI, plus thin API routes that proxy upload/analyze requests to the Flask service and shape the response for the frontend. Charts are rendered client-side (Plotly.js or an equivalent React wrapper) from plain numeric JSON; the Python side never renders an image. Deployed to Vercel.
- **`/ml-service`, Flask (Python)**: does all the real work: pandas profiling, the Claude API call, the scikit-learn fit, response assembly. Deployed separately (Render/Railway/Fly.io, anywhere that runs a long-lived Python process well; Vercel is not a fit for this side). The Next.js layer talks to it over an internal HTTP call configured via an environment variable (e.g. `ML_SERVICE_URL`).

The Claude API call happens inside the Flask service, immediately after the pandas profiling step. One place produces the data profile and immediately reasons over it, rather than passing the profile back up to Next.js and out again.

**Suggested default model**: `claude-sonnet-5` for the variable/model-selection reasoning. If public-traffic API cost becomes a concern, `claude-haiku-4-5` is a viable cheaper fallback for the same call shape.

## Guardrails (public demo, so these are not optional)

- **Upload caps** enforced at the Flask endpoint before any parsing happens: reject oversized files or too-many-row files outright (suggested starting defaults: ~10MB, ~50,000 rows; tune as needed).
- **No persistence**: uploaded data is never written to disk or a database, and raw content is never logged. It exists only in memory for the duration of the request.
- **Rate limiting**: `Flask-Limiter`, per-IP, on the upload/analyze endpoints. This is a public link hitting a paid LLM API, so this is the primary defense against a runaway bill.

## Sample datasets

2-3 small, permissively-licensed (CC0 or equivalent) datasets, downloaded once and committed under `/ml-service/data/samples/`. Chosen for having an obvious, visually satisfying predictive relationship so the "try a sample" path produces a good result on the first click. The frontend's one-click sample button loads these local files directly; there is no external Kaggle call at request time, so this path adds zero friction rather than introducing new friction.

## Conventions for future work in this repo

- Keep the LLM's job scoped to *reasoning about the column profile and picking from the shortlist*. It should not be doing the actual model fitting or metric computation; that stays deterministic in scikit-learn so results are reproducible and cheap to sanity-check.
- When building or touching frontend UI, load the `frontend-aesthetics` guidance before styling. This product's whole pitch is instant clarity, so the UI should not read as a generic, unstyled data-tool template.
- Treat the two result panels (quality score, model results) as co-equal in layout weight; neither should visually dominate or read as an afterthought.
