export const MAX_UPLOAD_BYTES = 512 * 1024;

export function validateEventInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('Expected a JSON object with event and entrants fields.');
  }
  if (!input.event || typeof input.event !== 'object' || Array.isArray(input.event) || Object.keys(input.event).length === 0) {
    throw new Error('Event must be a non-empty object.');
  }
  if (!Array.isArray(input.entrants) || input.entrants.length < 2 || input.entrants.length > 200) {
    throw new Error('Provide between 2 and 200 entrants.');
  }
  if (input.entrants.some(entry => !entry || typeof entry !== 'object' || Array.isArray(entry) || Object.keys(entry).length === 0)) {
    throw new Error('Each entrant must be a non-empty object.');
  }
  const displayFields = ['name', 'displayName', 'title', 'eventName', 'venueName', 'participantName', 'entrantName', 'id', 'eventId', 'venueId', 'sportId', 'entrantId', 'participantId', 'uuid', 'number', 'entrantNumber', 'runnerNumber', 'programNumber', 'stallNumber', 'barrier', 'postPosition', 'draw', 'status', 'state'];
  if (input.entrants.some(entry => displayFields.some(key => entry[key] != null && !['string', 'number'].includes(typeof entry[key])))) {
    throw new Error('Entrant names, identifiers, positions, and status must be text or numbers.');
  }
  if (input.sport !== undefined && (typeof input.sport !== 'string' || input.sport.length > 100)) {
    throw new Error('Sport must be text of at most 100 characters.');
  }
  if (input.mode !== undefined && !['simple', 'advanced'].includes(input.mode)) {
    throw new Error('Report mode must be simple or advanced.');
  }
  return { event: input.event, entrants: input.entrants, sport: input.sport || 'Unknown', mode: input.mode || 'simple' };
}

export function parseEventUpload(text) {
  if (new TextEncoder().encode(text).length > MAX_UPLOAD_BYTES) {
    throw new Error('JSON files must be 512 KB or smaller.');
  }
  let input;
  try { input = JSON.parse(text); } catch { throw new Error('This file is not valid JSON.'); }
  return validateEventInput(input);
}
