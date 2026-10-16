# EXACTA

EXACTA is a sports and racing intelligence app. The first build focuses on connecting to the Podium Racing API, retrieving events and entrants, and sending verified event data to Gemini for analysis.

## What this starter includes

- Secure Node/Express backend proxy for Podium API requests
- React/Vite frontend branded as **EXACTA**
- Event and entrant retrieval flow
- Gemini-powered analysis endpoint
- Clear warnings when secrets are missing
- No placeholder horses, teams, or competitors when the API fails
- A Race/Event Intelligence Report generated only after verified event data loads

## Required secrets

Create these environment variables in your deployment platform or local `.env` file:

```bash
PODIUM_API_BASE_URL=https://racing-api.podiumsports.com
PODIUM_BEARER_TOKEN=your_real_podium_bearer_token
GEMINI_API_KEY=your_real_gemini_api_key
PORT=8080
```

Do not paste real tokens into the browser, source code, screenshots, or chat.

## Local setup

```bash
npm install
cp .env.example .env
# edit .env and add your real secrets
npm run dev
```

The React frontend runs through Vite and the backend runs through Express.

## Production setup

```bash
npm install
npm run build
npm start
```

The Express server serves the built React app from `dist`.

## API flow

```text
Load Sports
→ Select Sport
→ Load Venues
→ Select Venue / Track
→ Select Date
→ Load Events
→ Select Event
→ GET /v1/events/{eventId}
→ GET /v1/entrants?eventid={eventId}
→ Analyze with Gemini
```

## Important rules built into the app

- The Podium bearer token is used only on the server.
- The frontend never receives the Podium bearer token.
- Previous entrants and event details are cleared before loading a new event.
- AI analysis is disabled until event details and entrants are loaded.
- API errors are shown instead of fake demo data.
- Missing API fields are treated as unavailable, not invented by AI.

## Files

- `server/index.js` — secure API proxy and Gemini analysis endpoint
- `src/App.jsx` — EXACTA frontend flow
- `src/styles.css` — app styling
- `.env.example` — variables you need to configure

## Upload and report workflow

Upload a UTF-8 `.json` event card (maximum 512 KB) without needing Podium credentials. The file must contain a non-empty `event` object and an `entrants` array of 2–200 non-empty objects. An optional `sport` string describes the sport. For example:

```json
{
  "sport": "Horse Racing",
  "event": { "name": "Your race", "date": "2026-10-16" },
  "entrants": [
    { "name": "Runner A", "odds": "3/1", "form": "Your supplied evidence" },
    { "name": "Runner B", "odds": "5/1", "form": "Your supplied evidence" }
  ]
}
```

This is a format example, not real racing data. Review the entrants and expand **Show Raw Data** to inspect all fields before requesting analysis. Files are read locally; event data is sent to the backend and Gemini only when you click Analyze. There is no file persistence in this implementation.

Choose **Simple** for a short plain-language report or **Advanced** for fuller entrant comparisons, scenarios, and supported calculations. Both modes require evidence, counterarguments, explicit unknowns, and PASS when a wager is unsupported. These are model instructions, not a guarantee of output accuracy. Neither uploaded content nor arbitrary browser-submitted event data is independently verified by the server.

`GEMINI_MODEL` selects the server-side model and defaults to `gemini-3.8-flash`, replacing the original hardcoded 1.5 model. Check availability for your Google project. Model lifecycle reference: https://ai.google.dev/gemini-api/docs/deprecations

Run `npm test` for dependency-free upload-validation and analysis-policy tests. Live Podium and Gemini requests require credentials; these tests do not validate provider behavior or model recommendation quality.

## Smart Handicapper requirement audit (2026-10-16)

Inspected main commit `4b0846d3284a081a9813d154e40978c26f7454af`, its complete file tree, and open branches/PRs. Only main existed and no open PRs were returned. The repository is branded EXACTA; this change preserves that existing name rather than assuming a rebrand.

| Requirement | Existing main | This change / remaining work |
| --- | --- | --- |
| Responsive dashboard | React/Vite UI with mobile CSS breakpoint | Preserved |
| Online event information | Server-side Podium proxy, sports/venues/events/entrants flow | Preserved; provider coverage and credentials unverified |
| Upload racing forms and data | No file input or parser | JSON event-card upload and shared server/browser validation added |
| PDFs, screenshots, betting sheets, CSV/XLSX | No extraction implementation | Still missing; next step is document extraction into the same reviewed event/entrants structure |
| Download online racing forms | No document download integration | Still missing; Podium event data is not a form download |
| Explain and challenge selections | Prompt had a self-challenge section | Added explicit favorite-bias checks, counterevidence, unknowns, and abstention |
| Simple and Advanced reports | One report format | Both added |
| Twelve requested sport buttons | Dynamic API dropdown only | Still missing; do not claim Podium supports all requested sports |
| Install on home screen | No manifest, icons, or service worker | Still missing |
| Personal use | No authentication/access gate | Hosting access restriction still needed before exposing personal deployment |
| Automated checks | No test script | Validation and prompt-policy regression tests added |

Requested categories: Horse Racing, Greyhound Racing, Harness Racing, NASCAR, Formula 1, IndyCar, Football, Basketball, Baseball, Soccer, Boxing, and MMA/UFC.

Key implementation files: `src/App.jsx` (upload, source review, mode selector, stale-response guards), `src/event-input.js` (shared input boundary), `server/analysis-prompt.js` (report policy), `server/index.js` (validated analysis endpoint), and `tests/event-input.test.js`.

