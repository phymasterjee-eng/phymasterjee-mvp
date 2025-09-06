const fetch = require("node-fetch");

exports.handler = async (event) => {
  // Debug: confirm Netlify is passing the GEMINI_API_KEY
  console.log("DEBUG: GEMINI_API_KEY present?", !!process.env.GEMINI_API_KEY);

  const GEMINI_KEY = process.env.GEMINI_API_KEY;

  if (!GEMINI_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "API key not found in Netlify env" }),
    };
  }

  try {
    const { question } = JSON.parse(event.body);

    // Gemini API endpoint (latest stable model)
    const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

    const response = await fetch(`${url}?key=${GEMINI_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `Solve this physics problem step by step with LaTeX: ${question}` }],
          },
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", data);
      return {
        statusCode: response.status,
        body: JSON.stringify({ error: data }),
      };
    }

    // Extract text safely
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text || "No solution generated";

    return {
      statusCode: 200,
      body: JSON.stringify({ answer }),
    };
  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};