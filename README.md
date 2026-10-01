# Fruit Trading Website

A premium fruit trading e-commerce website built with Vite + React and Vanilla CSS.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start Development Server**:
    ```bash
    npm run dev
    ```
    Open your browser and navigate to the URL shown in the terminal (e.g., `http://localhost:5173`).

## Features
-   Responsive Home Page with Hero section.
-   Product Listing with category filtering.
-   Shopping Cart with add/remove/update functionality.
-   Mock Checkout process.

## Tech Stack
-   React
-   Vite
-   Vanilla CSS

## Global AR Survey

A multiple-choice survey for global partners (agents, subsidiaries and JVs), served by the same app.

-   Question source of truth: `docs/global-ar-survey-merged.xlsx` (review copy). Regenerate the app data with `python3 scripts/build_survey_json.py` (needs `openpyxl`), which writes `shared/survey-questions.json`.
-   Partners open `/survey?code=XXXX` (the code prefills company and respondent type; without a code `/survey` also works).
-   HQ opens `/survey/admin` and enters the admin token. Start the backend with `ADMIN_TOKEN=<secret> npm start` inside `server/`; without it the admin API is disabled.
-   The admin page shows the response rate (overall and per respondent type), pending partners, per-question option counts, creates partner links, and exports CSV.
-   Responses are stored in `server/data/survey.json` (git-ignored). Treat it as confidential.
