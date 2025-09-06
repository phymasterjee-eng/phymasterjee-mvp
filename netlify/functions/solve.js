// netlify/functions/solve.js
const RATE_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 6;
const MAX_QUESTION_LENGTH = 4000;
const ipMap = new Map();

function normalizeQuestion(q) {
  // if already a string, trim and return
  if (typeof q === 'string') return q.trim();
  if (!q) return '';
  // common nested shapes: { text: "..." } or { value: "..." } or { question: "..." }
  if (typeof q === 'object') {
    if (typeof q.text === 'string') return q.text.trim();
    if (typeof q.value === 'string') return q.value.trim();
    if (typeof q.question === 'string') return q.question.trim();
    // last resort: JSON stringify
    try { return JSON.stringify(q).trim(); } catch(e) { return String(q).trim(); }
  }
  return String(q).trim();
}

exports.handler = async (event) => {
  // rate limit
  const ip = event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const entry = ipMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW_MS) { entry.count = 0; entry.start = now; }
  entry.count++; ipMap.set(ip, entry);
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    return { statusCode: 429, body: JSON.stringify({ error: 'Rate limit exceeded. Try again later.' }) };
  }

  console.log("DEBUG: GEMINI_API_KEY present?", !!process.env.GEMINI_API_KEY);
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) return { statusCode: 500, body: JSON.stringify({ error: "API key not found in Netlify env" }) };

  // parse incoming body safely and log it
  let parsed;
  try {
    parsed = event.body ? JSON.parse(event.body) : {};
  } catch (e) {
    console.error("Failed to parse event.body:", e);
    parsed = {};
  }
  console.log('DEBUG: raw incoming body:', parsed);

  // normalize question
  const rawQuestion = parsed.question ?? parsed.q ?? parsed.prompt ?? parsed; // accept several keys
  const question = normalizeQuestion(rawQuestion);
  const topic = normalizeQuestion(parsed.topic || parsed.subject || 'General');

  console.log('DEBUG: normalized question length:', question.length);
  if (!question) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Question is required (server saw empty input).' }) };
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Question too long' }) };
  }

  try {
    const model = "gemini-1.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const system = `You are an experienced JEE/NSEP Physics teacher. Answer concisely with clear steps.
Use LaTeX for ALL equations. Use $$...$$ for displayed equations and $...$ for inline math.
Keep explanations focused and brief, suitable for an exam solution.`;

    const userPrompt = `Topic: ${topic}\nProblem:\n${question}\n\nProvide a step-by-step solution and final boxed answer.`;

    const payload = {
      contents: [{ parts: [{ text: `${system}\n\n${userPrompt}` }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 512 }
    };

    const resp = await fetch(`${url}?key=${GEMINI_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    console.log('Gemini raw response status:', resp.status);
    console.log('Gemini raw response snippet:', JSON.stringify(data).slice(0,400));

    if (!resp.ok) {
      const errMsg = data?.error?.message || 'Upstream error from Gemini';
      return { statusCode: resp.status || 502, body: JSON.stringify({ error: errMsg }) };
    }

    let answer = '';
    if (Array.isArray(data.candidates) && data.candidates.length > 0) {
      answer = (data.candidates[0].content?.parts || []).map(p => p.text || '').join('\n\n');
    } else if (data.output) {
      answer = (data.output || []).map(o => (o.content || []).map(c => c.text || '').join('\n')).join('\n\n');
    } else {
      answer = JSON.stringify(data);
    }

    return { statusCode: 200, body: JSON.stringify({ answer }) };

  } catch (err) {
    console.error('Function exception:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message || String(err) }) };
  }
};