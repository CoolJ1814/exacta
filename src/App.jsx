import { useEffect, useMemo, useRef, useState } from 'react';

import { MAX_UPLOAD_BYTES, parseEventUpload } from './event-input.js';

const API = '/api';

function findArray(payload, preferredKeys = []) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object') return [];

  for (const key of preferredKeys) {
    if (Array.isArray(payload[key])) return payload[key];
  }

  const queue = [payload];
  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== 'object') continue;
    for (const value of Object.values(current)) {
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object') queue.push(value);
    }
  }

  return [];
}

function firstValue(item, keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return '';
}

function displayName(item) {
  return firstValue(item, ['name', 'displayName', 'title', 'eventName', 'venueName', 'participantName', 'entrantName']) || firstValue(item, ['id', 'eventId', 'venueId']) || 'Unnamed';
}

function itemId(item) {
  return String(firstValue(item, ['id', 'eventId', 'venueId', 'sportId', 'entrantId', 'participantId', 'uuid']));
}

async function apiGet(path) {
  const response = await fetch(`${API}${path}`);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }
  return payload;
}

async function apiPost(path, body) {
  const response = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }
  return payload;
}

export default function App() {
  const revision = useRef(0);
  const [source, setSource] = useState('');
  const [uploadSport, setUploadSport] = useState('');
  const [reportMode, setReportMode] = useState('simple');
  const [health, setHealth] = useState(null);
  const [sports, setSports] = useState([]);
  const [venues, setVenues] = useState([]);
  const [events, setEvents] = useState([]);
  const [entrants, setEntrants] = useState([]);
  const [eventDetails, setEventDetails] = useState(null);
  const [selectedSport, setSelectedSport] = useState('');
  const [selectedVenue, setSelectedVenue] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('Ready');
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [rawMode, setRawMode] = useState(false);

  useEffect(() => {
    apiGet('/health')
      .then(setHealth)
      .catch((err) => setError(err.message));
  }, []);

  const selectedEventObject = useMemo(
    () => events.find((event) => itemId(event) === selectedEvent),
    [events, selectedEvent]
  );

  function clearCard() {
    revision.current += 1;
    setEntrants([]);
    setEventDetails(null);
    setAnalysis('');
    setSource('');
    setUploadSport('');
    setStatus('Ready');
  }

  async function uploadCard(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    clearCard();
    setError('');
    const requestRevision = revision.current;
    try {
      if (!file.name.toLowerCase().endsWith('.json')) throw new Error('Choose a JSON event card. PDF and image uploads are not supported yet.');
      if (file.size > MAX_UPLOAD_BYTES) throw new Error('JSON files must be 512 KB or smaller.');
      const card = parseEventUpload(await file.text());
      if (requestRevision !== revision.current) return;
      setEventDetails(card.event);
      setEntrants(card.entrants);
      setUploadSport(card.sport);
      setSource(`Uploaded: ${file.name} (user supplied, not independently verified)`);
      setStatus('Upload ready for review');
    } catch (err) {
      if (requestRevision !== revision.current) return;
      setError(err.message);
      setStatus('Could not load upload');
    }
  }

  async function loadSports() {
    clearCard();
    const requestRevision = revision.current;
    setError('');
    setStatus('Loading sports...');
    setSelectedSport('');
    setSelectedVenue('');
    setSelectedEvent('');
    setSports([]);
    setVenues([]);
    setEvents([]);
    setEntrants([]);
    setEventDetails(null);
    setAnalysis('');

    try {
      const payload = await apiGet('/podium/sports?pagesize=100');
      if (requestRevision !== revision.current) return;
      setSports(findArray(payload, ['sports', 'items', 'data', 'results']));
      setStatus('Sports loaded');
    } catch (err) {
      if (requestRevision !== revision.current) return;
      setError(err.message);
      setStatus('Could not load sports');
    }
  }

  async function loadVenues() {
    clearCard();
    const requestRevision = revision.current;
    setError('');
    setStatus('Loading venues...');
    setSelectedVenue('');
    setSelectedEvent('');
    setVenues([]);
    setEvents([]);
    setEntrants([]);
    setEventDetails(null);
    setAnalysis('');

    const params = new URLSearchParams({ pagesize: '100' });
    if (selectedSport) params.set('sportid', selectedSport);

    try {
      const payload = await apiGet(`/podium/venues?${params.toString()}`);
      if (requestRevision !== revision.current) return;
      setVenues(findArray(payload, ['venues', 'items', 'data', 'results']));
      setStatus('Venues loaded');
    } catch (err) {
      if (requestRevision !== revision.current) return;
      setError(err.message);
      setStatus('Could not load venues');
    }
  }

  async function loadEvents() {
    clearCard();
    const requestRevision = revision.current;
    setError('');
    setStatus('Loading events...');
    setSelectedEvent('');
    setEvents([]);
    setEntrants([]);
    setEventDetails(null);
    setAnalysis('');

    const params = new URLSearchParams({ pagesize: '100' });
    if (selectedSport) params.set('sportid', selectedSport);
    if (selectedVenue) params.set('venueid', selectedVenue);
    if (date) params.set('date', date);

    try {
      const payload = await apiGet(`/podium/events?${params.toString()}`);
      if (requestRevision !== revision.current) return;
      setEvents(findArray(payload, ['events', 'items', 'data', 'results']));
      setStatus('Events loaded');
    } catch (err) {
      if (requestRevision !== revision.current) return;
      setError(err.message);
      setStatus('Could not load events');
    }
  }

  async function loadEventAndEntrants(eventId = selectedEvent) {
    clearCard();
    const requestRevision = revision.current;
    if (!eventId) {
      setError('Choose an event first.');
      return;
    }

    setError('');
    setStatus('Loading event details and entrants...');
    setEntrants([]);
    setEventDetails(null);
    setAnalysis('');

    try {
      const [eventPayload, entrantsPayload] = await Promise.all([
        apiGet(`/podium/events/${encodeURIComponent(eventId)}`),
        apiGet(`/podium/entrants?eventid=${encodeURIComponent(eventId)}&pagesize=100`)
      ]);
      if (requestRevision !== revision.current) return;
      setSource('Podium API (review supplied fields before analysis)');
      setEventDetails(eventPayload);
      setEntrants(findArray(entrantsPayload, ['entrants', 'items', 'data', 'results']));
      setStatus('Race/event data loaded');
    } catch (err) {
      if (requestRevision !== revision.current) return;
      setError(err.message);
      setStatus('Could not load event data');
    }
  }

  async function analyzeEvent() {
    if (!eventDetails || entrants.length < 2) {
      setError('Load event details and entrants before running AI analysis.');
      return;
    }

    setError('');
    const requestRevision = ++revision.current;
    setStatus('Analyzing supplied event data...');
    setAnalysis('');

    try {
      const payload = await apiPost('/analyze', {
        sport: uploadSport || displayName(sports.find(sport => itemId(sport) === selectedSport)),
        mode: reportMode,
        event: eventDetails,
        entrants
      });
      if (requestRevision !== revision.current) return;
      setAnalysis(payload.analysis || 'No analysis returned.');
      setStatus('Analysis complete');
    } catch (err) {
      if (requestRevision !== revision.current) return;
      setError(err.message);
      setStatus('Could not run analysis');
    }
  }

  function entrantRow(entrant) {
    const participants = firstValue(entrant, ['participants', 'participant']) || '';
    const prices = firstValue(entrant, ['prices', 'price', 'odds']) || '';
    return {
      number: firstValue(entrant, ['number', 'entrantNumber', 'runnerNumber', 'programNumber']),
      name: displayName(entrant),
      stall: firstValue(entrant, ['stallNumber', 'barrier', 'postPosition', 'draw']),
      status: firstValue(entrant, ['status', 'state']),
      odds: typeof prices === 'string' ? prices : JSON.stringify(prices),
      participants: typeof participants === 'string' ? participants : JSON.stringify(participants)
    };
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <p className="eyebrow">AI Sports & Racing Intelligence</p>
          <h1>EXACTA</h1>
          <p className="hero-copy">
            Upload a JSON event card or load event data online, review the competitors, and get an analysis that challenges its own recommendation.
          </p>
        </div>
        <div className="status-card">
          <span>Status</span>
          <strong>{status}</strong>
          {health && (
            <small>
              Podium: {health.podiumConfigured ? 'Configured' : 'Missing secrets'} · Gemini: {health.geminiConfigured ? 'Configured' : 'Missing key'}
            </small>
          )}
        </div>
      </section>

      {error && <div className="alert">{error}</div>}

      <section className="panel">
        <h2>Upload an event card</h2>
        <p>Choose a JSON file up to 512 KB containing an event object, an entrants array (2 · 200 competitors), and an optional sport name. Review the loaded fields below before analyzing. PDF, screenshot, and spreadsheet extraction are not available yet.</p>
        <label>JSON event card<input type="file" accept=".json,application/json" onChange={uploadCard} /></label>
        <details><summary>Expected file format</summary><pre className="raw-block">{'{ "sport": "Horse Racing", "event": { "name": "Race 1" }, "entrants": [{ "name": "Runner A" }, { "name": "Runner B" }] }'}</pre></details>
      </section>

      <section className="panel grid-two">
        <div>
          <h2>1. Connect to Podium</h2>
          <p>Start by loading sports from the secure server-side Podium proxy.</p>
          <button onClick={loadSports}>Load Sports</button>
        </div>
        <div className="form-stack">
          <label>
            Sport
            <select value={selectedSport} onChange={(e) => { clearCard(); setSelectedSport(e.target.value); setSelectedVenue(''); setSelectedEvent(''); setVenues([]); setEvents([]); }}>
              <option value="">All sports</option>
              {sports.map((sport) => (
                <option value={itemId(sport)} key={itemId(sport)}>
                  {displayName(sport)}
                </option>
              ))}
            </select>
          </label>
          <button onClick={loadVenues}>Load Venues</button>
        </div>
      </section>

      <section className="panel grid-two">
        <div>
          <h2>2. Choose venue and date</h2>
          <p>Use the venue/date to pull events, races, matches, or contests.</p>
        </div>
        <div className="form-stack">
          <label>
            Venue / Track
            <select value={selectedVenue} onChange={(e) => { clearCard(); setSelectedVenue(e.target.value); setSelectedEvent(''); setEvents([]); }}>
              <option value="">All venues</option>
              {venues.map((venue) => (
                <option value={itemId(venue)} key={itemId(venue)}>
                  {displayName(venue)}
                </option>
              ))}
            </select>
          </label>
          <label>
            Date
            <input type="date" value={date} onChange={(e) => { clearCard(); setDate(e.target.value); setSelectedEvent(''); setEvents([]); }} />
          </label>
          <button onClick={loadEvents}>Load Events</button>
        </div>
      </section>

      <section className="panel grid-two">
        <div>
          <h2>3. Select event</h2>
          <p>After the eventId is found, EXACTA calls the Entrants endpoint using that exact eventId.</p>
        </div>
        <div className="form-stack">
          <label>
            Event
            <select value={selectedEvent} onChange={(e) => { clearCard(); setSelectedEvent(e.target.value); }}>
              <option value="">Choose event</option>
              {events.map((event) => (
                <option value={itemId(event)} key={itemId(event)}>
                  {displayName(event)} {firstValue(event, ['startTime', 'startDateTime', 'scheduledStart']) ? `— ${firstValue(event, ['startTime', 'startDateTime', 'scheduledStart'])}` : ''}
                </option>
              ))}
            </select>
          </label>
          <button onClick={() => loadEventAndEntrants()}>Load Event + Entrants</button>
          {selectedEventObject && <small>Selected eventId: {selectedEvent}</small>}
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Entrants / Race Card</h2>
            <p>Review these entries from the selected source. Missing fields remain unavailable.</p>
          </div>
          <button className="secondary" onClick={() => setRawMode(!rawMode)}>{rawMode ? 'Hide Raw Data' : 'Show Raw Data'}</button>
        </div>

        {source && <p role="status">Source: {source}</p>}
        {entrants.length === 0 ? (
          <p className="empty">No entrants loaded yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Post/Stall</th>
                  <th>Status</th>
                  <th>Odds/Prices</th>
                  <th>Participants</th>
                </tr>
              </thead>
              <tbody>
                {entrants.map((entrant, index) => {
                  const row = entrantRow(entrant);
                  return (
                    <tr key={itemId(entrant) || index}>
                      <td>{row.number || '-'}</td>
                      <td>{row.name}</td>
                      <td>{row.stall || '-'}</td>
                      <td>{row.status || '-'}</td>
                      <td>{row.odds || '-'}</td>
                      <td>{row.participants || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {rawMode && (
          <pre className="raw-block">{JSON.stringify({ eventDetails, entrants }, null, 2)}</pre>
        )}
      </section>

      <section className="panel analysis-panel">
        <div className="panel-heading">
          <div>
            <h2>AI Intelligence Report</h2>
            <p>Evidence, counterarguments, missing information, and a PASS when a wager is not supported.</p>
            <label>Report detail<select value={reportMode} onChange={(e) => { revision.current += 1; setReportMode(e.target.value); setAnalysis(''); setStatus('Ready'); }}><option value="simple">Simple</option><option value="advanced">Advanced</option></select></label>
          </div>
          <button onClick={analyzeEvent} disabled={!eventDetails || entrants.length < 2}>Analyze with Gemini</button>
        </div>
        {analysis ? <pre className="analysis-output">{analysis}</pre> : <p className="empty">No analysis yet.</p>}
      </section>
    </main>
  );
}

