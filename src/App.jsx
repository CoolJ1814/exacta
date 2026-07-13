import { useEffect, useMemo, useState } from 'react';

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

  async function loadSports() {
    setError('');
    setStatus('Loading sports...');
    setSports([]);
    setVenues([]);
    setEvents([]);
    setEntrants([]);
    setEventDetails(null);
    setAnalysis('');

    try {
      const payload = await apiGet('/podium/sports?pagesize=100');
      setSports(findArray(payload, ['sports', 'items', 'data', 'results']));
      setStatus('Sports loaded');
    } catch (err) {
      setError(err.message);
      setStatus('Could not load sports');
    }
  }

  async function loadVenues() {
    setError('');
    setStatus('Loading venues...');
    setVenues([]);
    setEvents([]);
    setEntrants([]);
    setEventDetails(null);
    setAnalysis('');

    const params = new URLSearchParams({ pagesize: '100' });
    if (selectedSport) params.set('sportid', selectedSport);

    try {
      const payload = await apiGet(`/podium/venues?${params.toString()}`);
      setVenues(findArray(payload, ['venues', 'items', 'data', 'results']));
      setStatus('Venues loaded');
    } catch (err) {
      setError(err.message);
      setStatus('Could not load venues');
    }
  }

  async function loadEvents() {
    setError('');
    setStatus('Loading events...');
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
      setEvents(findArray(payload, ['events', 'items', 'data', 'results']));
      setStatus('Events loaded');
    } catch (err) {
      setError(err.message);
      setStatus('Could not load events');
    }
  }

  async function loadEventAndEntrants(eventId = selectedEvent) {
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
      setEventDetails(eventPayload);
      setEntrants(findArray(entrantsPayload, ['entrants', 'items', 'data', 'results']));
      setStatus('Race/event data loaded');
    } catch (err) {
      setError(err.message);
      setStatus('Could not load event data');
    }
  }

  async function analyzeEvent() {
    if (!eventDetails || entrants.length === 0) {
      setError('Load event details and entrants before running AI analysis.');
      return;
    }

    setError('');
    setStatus('Gemini is analyzing the verified event data...');
    setAnalysis('');

    try {
      const payload = await apiPost('/analyze', {
        sport: selectedSport,
        event: eventDetails,
        entrants
      });
      setAnalysis(payload.analysis || 'No analysis returned.');
      setStatus('Analysis complete');
    } catch (err) {
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
            Load verified event data from Podium, retrieve the real entrants, then send the confirmed race or game to Gemini for analysis.
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

      <section className="panel grid-two">
        <div>
          <h2>1. Connect to Podium</h2>
          <p>Start by loading sports from the secure server-side Podium proxy.</p>
          <button onClick={loadSports}>Load Sports</button>
        </div>
        <div className="form-stack">
          <label>
            Sport
            <select value={selectedSport} onChange={(e) => setSelectedSport(e.target.value)}>
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
            <select value={selectedVenue} onChange={(e) => setSelectedVenue(e.target.value)}>
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
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
            <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)}>
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
            <p>These entries come from the API response. EXACTA does not invent missing horses or competitors.</p>
          </div>
          <button className="secondary" onClick={() => setRawMode(!rawMode)}>{rawMode ? 'Hide Raw Data' : 'Show Raw Data'}</button>
        </div>

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
            <p>Runs only after event data and entrants are loaded.</p>
          </div>
          <button onClick={analyzeEvent} disabled={!eventDetails || entrants.length === 0}>Analyze with Gemini</button>
        </div>
        {analysis ? <pre className="analysis-output">{analysis}</pre> : <p className="empty">No analysis yet.</p>}
      </section>
    </main>
  );
}
