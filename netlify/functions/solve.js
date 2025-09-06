// netlify/functions/solve.js
// Node 18+ runtime assumed (Netlify default). Uses global fetch.
// Securely calls Google Gemini (Generative Language API) using GEMINI_API_KEY env var.

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 6;      // max requests per IP per window (tune as needed)
const MAX_QUESTION_LENGTH = 4000;       // characters

// simple in-memory rate limiter (resets when function cold-starts / server restarts)
const ipMap = new Map();

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const ip = event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || 'unknown';
    // rate limiting
    const now = Date.now();
    const entry = ipMap.get(ip) || { count: 0, start: now };
    if (now - entry.start > RATE_LIMIT_WINDOW_MS) {
      entry.count = 0;
      entry.start = now;
    }
    entry.count++;
    ipMap.set(ip, entry);
    if (entry.count > MAX_REQUESTS_PER_WINDOW) {
      return {
        statusCode: 429,
        body: JSON.stringify({ error: `Rate limit exceeded. Try again later.` })
      };
    }

    // parse body
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (e) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const question = (body.question || '').toString().trim();
    const topic = (body.topic || 'General').toString().trim();

    if (!question) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Question is required' }) };
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Question too long' }) };
    }

    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY) {
      return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY not configured on server' }) };
    }

    // Prepare prompt: ask explicitly for LaTeX and structured answer
    const systemPrompt = `You are an experienced JEE/NSEP Physics teacher and tutor.
Answer clearly and rigorously for a student preparing competitive exams.
- Provide assumptions, list relevant formulae, show step-by-step derivation.
- Use LaTeX for all equations. Use $$...$$ for display equations and $...$ for inline math.
- At the end provide a one-line final boxed answer.`;

    const userPrompt = `Topic: ${topic}\nProblem:\n${question}\n\nSolution:`;

    // Gemini Generative Language API endpoint (v1beta)
    // model name: gemini-1.5-flash-latest (cheap + good). Change if you want another model.
    const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent';

    const payload = {
      // top-level 'contents' structure used in the web examples
      contents: [
        {
          // parts allow multi-block messages
          parts: [
            { text: `${systemPrompt}\n\n${userPrompt}` }
          ]
        }
      ],
      // you can add safety/temperature/other options here if needed (model-specific)
      // NOTE: Generative Language has model-specific params; adjust via docs when needed
    };

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // use Bearer auth with the KEY stored in env var
        'Authorization': `Bearer ${GEMINI_KEY}`
      },
      body: JSON.stringify(payload),
      // set a modest timeout if your environment supports AbortController (optional)
    });

    if (!resp.ok) {
      const text = await resp.text();
      return { statusCode: resp.status || 502, body: JSON.stringify({ error: 'Upstream error', detail: text }) };
    }

    const data = await resp.json();

    // Typical Gemini response path: data.candidates[0].content.parts[0].text
    let answer = '';
    if (Array.isArray(data.candidates) && data.candidates.length > 0) {
      const parts = data.candidates[0].content?.parts || [];
      answer = parts.map(p => p.text || '').join('\n\n');
    } else if (data.output?.[0]?.content?.[0]?.text) {
      // fallback for other shapes
      answer = data.output.map(o => (o.content || []).map(c => c.text || '').join('\n')).join('\n');
    } else {
      // as last fallback, stringify whatever we got
      answer = JSON.stringify(data);
    }

    // Return as JSON expected by frontend
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer })
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: String(err) })
    };
  }
};