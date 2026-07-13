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
