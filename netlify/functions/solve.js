exports.handler = async function (event) {
  try {
    const { question, topic } = JSON.parse(event.body);

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing GEMINI_API_KEY" })
      };
    }

    const prompt = `
You are an expert JEE Physics teacher.
Solve the following problem step-by-step clearly.

Topic: ${topic}
Question: ${question}

Use LaTeX formatting for equations.
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ]
        })
      }
    );

    const data = await response.json();

    const solution =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No solution generated.";

    return {
      statusCode: 200,
      body: JSON.stringify({ solution })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error" })
    };
  }
};