// backend/controllers/chatController.js
//
// AI Chatbot endpoint backed by the Google Gemini API (@google/genai).
//
// Envelope:
//   success -> { success: true, data: { reply: string } }
//   error   -> { success: false, message: '...' } with a 400 / 500 code
import { GoogleGenAI } from '@google/genai';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Default model. gemini-2.0-flash and gemini-1.5-flash* are on Google's
// sunset path (2.0-flash is already shut down), and gemini-3.7-flash has been
// frequently overloaded ("high demand" 503s / timeouts), so we default to the
// current stable, responsive flash line. Override per deployment via
// GEMINI_MODEL when needed (e.g. GEMINI_MODEL=gemini-3.5-flash-lite for lower
// cost/latency).
const DEFAULT_MODEL = 'gemini-3.6-flash';
const MODEL = process.env.GEMINI_MODEL || DEFAULT_MODEL;

// Fallback models tried in order when the primary model is unavailable
// (429 / 5xx overloads, rate limits, or timeouts). Override via
// GEMINI_FALLBACK_MODELS (comma-separated): e.g.
// GEMINI_FALLBACK_MODELS="gemini-3.5-flash,gemini-3.5-flash-lite".
const DEFAULT_FALLBACK_MODELS = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
const FALLBACK_MODELS = process.env.GEMINI_FALLBACK_MODELS
  ? process.env.GEMINI_FALLBACK_MODELS.split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : DEFAULT_FALLBACK_MODELS;

// Full roster: the primary model first, then any fallbacks not already in it.
const MODEL_ROSTER = [
  MODEL,
  ...FALLBACK_MODELS.filter((fallback) => fallback !== MODEL),
];

// How many conversational turns of prior context to send to the model.
// (1 turn = a user message + the bot's reply). Kept deliberately small to
// keep latency low and bound token spend on long sessions.
const parseHistoryTurns = (value) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return 8;
  return Math.min(20, Math.max(1, n));
};
const MAX_TURNS = parseHistoryTurns(process.env.CHAT_HISTORY_TURNS);
// Flat history entries (user + bot) captured by the turn limit above.
const MAX_TURNS_ENTRIES = MAX_TURNS * 2;

// Lazy singleton so the API key is only validated on first use.
let aiClient = null;
const getAiClient = () => {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error(
      'Server is missing the GEMINI_API_KEY environment variable. ' +
        'Add it to backend/.env to enable the AI assistant.'
    );
    err.status = 500;
    throw err;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
};

// ---------------------------------------------------------------------------
// System instruction
// ---------------------------------------------------------------------------

export const MED_SYSTEM_INSTRUCTION = `
You are "MedSync Clinic Virtual Assistant", the official AI assistant for MedSync Clinic.

## Your role
Help patients with:
- Clinic services and general information about the clinic.
- The appointment booking workflow (how to book, reschedule, cancel, and what to expect).
- Doctor / specialty guidance based on GENERAL symptoms the patient describes (e.g. "a persistent headache" -> suggest seeing a neurologist or general practitioner for evaluation).
- Payment options: Online Gateway, Bank Transfer, and Pay at Reception.
- Clinic arrival rules: arriving on time, bringing a valid ID / appointment reference, and checking in at the front desk.

## Safety / medical disclaimer (MANDATORY)
- NEVER provide a definitive medical diagnosis, a prescription, or a dosage.
- Always clarify that your guidance is general and informational only, and encourage the patient to consult a qualified healthcare professional for any medical concerns.
- When asked for medical advice, respond helpfully about specialty guidance but add a brief disclaimer.

## Emergency protocol (CRITICAL)
If the user describes emergency symptoms — such as severe chest pain, signs of a stroke (face drooping, arm weakness, slurred speech), difficulty breathing, severe bleeding, or unconsciousness — IMMEDIATELY and prominently direct them to call their local emergency services (e.g. 911 / 119 / 112) or go to the nearest hospital emergency room. Do NOT attempt to triage, diagnose, or reassure them past this. Safety comes first.

## Tone
Be helpful, professional, clear, and reassuring. Keep answers concise and well-structured. Use short paragraphs or bullet lists when helpful.`;

// ---------------------------------------------------------------------------
// Emergency safety net
// ---------------------------------------------------------------------------

// Lightweight defensive guard: if the incoming message describes urgent
// symptoms, respond with the emergency protocol directly — without depending
// on the Gemini API being reachable.
const EMERGENCY_PATTERN =
  /(severe chest pain|chest pain|heart attack|stroke|face drooping|slurred speech|arm weakness|difficulty breathing|trouble breathing|cannot breathe|can't breathe|not breathing|severe bleeding|unconscious|unresponsive|overdose|choking|suicidal)/i;

const EMERGENCY_REPLY = `I'm really sorry you're experiencing this. Please take this seriously and act right away:

🚨 CALL YOUR LOCAL EMERGENCY SERVICES NOW (e.g. 911 / 119 / 112) or go straight to the nearest hospital emergency room.

If someone is with you, ask them to call while you stay as calm as possible. If you are driving, pull over safely and call for help.

I'm MedSync's virtual assistant and I cannot provide emergency care or a diagnosis — but this sounds urgent, so please get emergency help immediately. Do not wait.

Once you or your loved one is safe, I'm here to help with clinic appointments, doctor guidance, payments, and any other non-urgent questions.`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a Gemini `contents` array from the flat conversation history plus the
 * current message.
 *
 * - Slices the history down to the last `MAX_TURNS` turns (bounds context).
 * - Drops leading model turns (Gemini history can't lead with a model turn).
 * - Merges consecutive same-role messages (Gemini requires alternating roles).
 *
 * @param {Array<{sender: string, text: string}>} conversationHistory
 * @param {string} currentMessage
 * @returns {Array<{role: 'user'|'model', parts: Array<{text: string}>}>}
 */
const buildContents = (conversationHistory, currentMessage) => {
  const recent =
    Array.isArray(conversationHistory) && conversationHistory.length
      ? conversationHistory.slice(-MAX_TURNS_ENTRIES)
      : [];

  const contents = [];

  for (const entry of recent) {
    if (!entry || typeof entry.text !== 'string') continue;
    const role = entry.sender === 'bot' ? 'model' : 'user';
    const text = entry.text.trim();
    if (!text) continue;

    const previous = contents[contents.length - 1];
    if (previous && previous.role === role) {
      // Gemini requires strictly alternating roles — merge consecutive
      // same-role messages into a single turn.
      previous.parts[0].text = `${previous.parts[0].text}\n\n${text}`;
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }

  // A model turn cannot lead a Gemini conversation.
  while (contents.length && contents[0].role === 'model') {
    contents.shift();
  }

  const trimmed = currentMessage.trim();
  if (trimmed) {
    const last = contents[contents.length - 1];
    if (last && last.role === 'user') {
      last.parts[0].text = `${last.parts[0].text}\n\n${trimmed}`;
    } else {
      contents.push({ role: 'user', parts: [{ text: trimmed }] });
    }
  }

  return contents;
};

// ---------------------------------------------------------------------------
// Fallback / resilience helpers
// ---------------------------------------------------------------------------

// Bounds how long a single model attempt may take before we fall back.
const REQUEST_TIMEOUT_MS =
  Number.parseInt(process.env.GEMINI_REQUEST_TIMEOUT_MS, 10) || 25_000;

/**
 * Rejects after `ms` milliseconds without cancelling the underlying request.
 * Used to bound how long a single model attempt may take before falling back.
 */
const withTimeout = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        const err = new Error(`Model request timed out after ${ms}ms.`);
        err.code = 'TIMEOUT';
        reject(err);
      }, ms);
    }),
  ]);

/**
 * Whether a failed model attempt can be retried on a different model.
 * True for HTTP 429/5xx, network TypeErrors, and our own timeout marker.
 */
const isRetriable = (error) => {
  if (!error) return false;
  if (error.code === 'TIMEOUT') return true;
  if (typeof error.status === 'number') {
    return [429, 500, 502, 503, 504].includes(error.status);
  }
  return error instanceof TypeError;
};

/**
 * Calls generateContent across the model roster, falling back to the next
 * model on transient failures (overload, rate limit, timeout). Returns the
 * first non-empty reply, or throws the last error if every model fails.
 */
const generateWithFallback = async (ai, contents) => {
  let lastError = null;

  for (const model of MODEL_ROSTER) {
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: MED_SYSTEM_INSTRUCTION,
            temperature: 0.4,
            maxOutputTokens: 1024,
          },
        }),
        REQUEST_TIMEOUT_MS
      );

      const reply = (response.text || '').trim();
      if (reply) {
        if (model !== MODEL_ROSTER[0]) {
          console.log(
            `[chat] Primary model unavailable; answered via fallback "${model}".`
          );
        }
        return reply;
      }

      lastError = new Error(`Model "${model}" returned an empty response.`);
      console.error(lastError.message);
    } catch (error) {
      lastError = error;
      const reason =
        error.code === 'TIMEOUT'
          ? 'timed out'
          : `failed (${error.status || error.message})`;
      console.error(`[chat] Model "${model}" ${reason}, trying next...`);
      if (!isRetriable(error)) throw error;
    }
  }

  throw lastError;
};

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

/**
 * POST /api/chat
 * Body: { message: string, conversationHistory: Array<{ sender, text }> }
 * Returns: { success: true, data: { reply: string } }
 */
export const sendChatMessage = async (req, res) => {
  try {
    const { message, conversationHistory } = req.body || {};

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a non-empty message to send to the assistant.',
      });
    }

    if (conversationHistory !== undefined && !Array.isArray(conversationHistory)) {
      return res.status(400).json({
        success: false,
        message: 'conversationHistory must be an array of { sender, text } messages.',
      });
    }

    // Emergency safety net — reply immediately without relying on the API.
    if (EMERGENCY_PATTERN.test(message)) {
      return res.json({ success: true, data: { reply: EMERGENCY_REPLY } });
    }

    const ai = getAiClient();
    const contents = buildContents(conversationHistory, message);

    // Uses the model roster with automatic fallback on transient failures.
    const reply = await generateWithFallback(ai, contents);

    return res.json({ success: true, data: { reply } });
  } catch (error) {
    console.error('Error in chatController.sendChatMessage:', error);
    return res.status(500).json({
      success: false,
      message:
        'Sorry, I could not reach the assistant right now. Please try again in a moment.',
    });
  }
};


