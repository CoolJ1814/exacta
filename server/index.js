import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';

import { validateEventInput } from '../src/event-input.js';
import { buildAnalysisPrompt } from './analysis-prompt.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;
const PODIUM_API_BASE_URL = process.env.PODIUM_API_BASE_URL || 'https://racing-api.podiumsports.com';
const PODIUM_BEARER_TOKEN = process.env.PODIUM_BEARER_TOKEN;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: '2mb' }));

function hasPodiumCredentials() {
  return Boolean(PODIUM_API_BASE_URL && PODIUM_BEARER_TOKEN);
}

function getPodiumUrl(resourcePath, query = {}) {
  const cleanBase = PODIUM_API_BASE_URL.replace(/\/+$/, '');
  const cleanResourcePath = resourcePath.replace(/^\/+/, '');
  const versionedPath = cleanBase.endsWith('/v1') ? cleanResourcePath : `v1/${cleanResourcePath}`;
  const url = new URL(`${cleanBase}/${versionedPath}`);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      url.searchParams.set(key, value);
    }
  });

  return url;
}

async function callPodium(resourcePath, query = {}) {
  if (!hasPodiumCredentials()) {
    const error = new Error('Podium API credentials are not configured in environment variables. Please define PODIUM_API_BASE_URL and PODIUM_BEARER_TOKEN in Settings > Secrets.');
    error.status = 500;
    throw error;
  }

  const url = getPodiumUrl(resourcePath, query);
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${PODIUM_BEARER_TOKEN}`
    }
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error(`Podium API returned ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

function sendError(res, error) {
  res.status(error.status || 500).json({
    error: error.message || 'Unexpected server error',
    details: error.payload || null
  });
}

app.get('/api/health', (req, res) => {
  res.json({
    app: 'EXACTA',
    podiumConfigured: hasPodiumCredentials(),
    geminiConfigured: Boolean(GEMINI_API_KEY),
    podiumBaseUrl: PODIUM_API_BASE_URL,
    requiredSecrets: ['PODIUM_API_BASE_URL', 'PODIUM_BEARER_TOKEN', 'GEMINI_API_KEY']
  });
});

app.get('/api/podium/sports', async (req, res) => {
  try {
    const data = await callPodium('sports', req.query);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/podium/venues', async (req, res) => {
  try {
    const data = await callPodium('venues', req.query);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/podium/events', async (req, res) => {
  try {
    const data = await callPodium('events', req.query);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/podium/events/:eventId', async (req, res) => {
  try {
    const data = await callPodium(`events/${req.params.eventId}`, req.query);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/podium/entrants', async (req, res) => {
  try {
    if (!req.query.eventid && !req.query.eventId) {
      return res.status(400).json({ error: 'Missing required query parameter: eventid' });
    }

    const query = { ...req.query };
    if (query.eventId && !query.eventid) {
      query.eventid = query.eventId;
      delete query.eventId;
    }

    const data = await callPodium('entrants', query);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
});

app.get('/api/podium/entrants/:entrantId', async (req, res) => {
  try {
    const data = await callPodium(`entrants/${req.params.entrantId}`, req.query);
    res.json(data);
  } catch (error) {
    sendError(res, error);
  }
});

app.post('/api/analyze', async (req, res) => {
  try {
    if (!GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'Gemini API key is not configured. Please define GEMINI_API_KEY in Settings > Secrets.'
      });
    }

    let input;
    try {
      input = validateEventInput(req.body);
    } catch (error) {
      return res.status(400).json({ error: error.message });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-3.8-flash' });

    const prompt = buildAnalysisPrompt(input);

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({ analysis: text });
  } catch (error) {
    sendError(res, error);
  }
});

const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`EXACTA server running on port ${PORT}`);
});

