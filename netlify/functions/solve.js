// netlify/functions/solve.js
// Uses Node 18 built-in fetch — no external deps required.

const RATE_WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS_PER_WINDOW = 6; // per IP
const MAX_QUESTION_LENGTH = 4000;

const ipMap = new Map();

exports.handler = async (event) => {
  // Basic rate-limiting (in-memory, resets on cold-start)
  const ip = event.headers['x-nf-client-connection-ip'] || event.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const entry = ipMap.get(ip) || { count: 0, start: now };
  if (now - entry.start > RATE_WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count++;
  ipMap.set(ip, entry);
  if (entry.count > MAX_REQUESTS_PER_WINDOW) {
    return {
      statusCode: 429,
      body: JSON.stringify({ error: 'Rate limit exceeded. Try again later.' })
    };
  }

  // Debug: confirm the environment variable is available
  console.log("DEBUG: GEMINI_API_KEY present?", !!process.env.GEMINI_API_KEY);

  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key not found in Netlify env" })
    };
  }

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const question = (body.question || '').toString().trim();
    const topic = (body.topic || 'General').toString().trim();

    if (!question) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Question is required' }) };
    }
    if (question.length > MAX_QUESTION_LENGTH) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Question too long' }) };
    }

    // Use a fast/cost-efficient Flash model
    const model = "gemini-1.5-flash"; // or "gemini-2.0-flash" if available for your project
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    // Prompt: concise and JEE-oriented, ask for LaTeX
    const system = `You are an experienced JEE/NSEP Physics teacher. Answer concisely with clear steps.
Use LaTeX for ALL equations. Use $$...$$ for displayed equations and $...$ for inline math.
Keep explanations focused and brief, suitable for an exam solution.`;

    const userPrompt = `Topic: ${topic}\nProblem:\n${question}\n\nProvide a step-by-step solution and final boxed answer.`;

    // Correct payload: put sampling and length controls under `generationConfig`
    const payload = {
      contents: [
        {
          parts: [
            { text: `${system}\n\n${userPrompt}` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        // model-specific token control name; for generateContent use maxOutputTokens
        maxOutputTokens: 512
      }
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
      // Return the upstream error message clearly
      const errMsg = data?.error?.message || 'Upstream error from Gemini';
      return { statusCode: resp.status || 502, body: JSON.stringify({ error: errMsg }) };
    }

    // Extract answer for common response shapes
    let answer = '';
    if (Array.isArray(data.candidates) && data.candidates.length > 0) {
      const parts = data.candidates[0].content?.parts || [];
      answer = parts.map(p => p.text || '').join('\n\n');
    } else if (data.output) {
      // fallback: join text pieces
      answer = (data.output || []).map(o => (o.content || []).map(c => c.text || '').join('\n')).join('\n\n');
    } else {
      answer = JSON.stringify(data);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ answer })
    };

  } catch (err) {
    console.error('Function exception:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message || String(err) })
    };
  }
};