exports.handler = async function (event) {
  try {
    const { question, topic } = JSON.parse(event.body || "{}");

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing GEMINI_API_KEY" })
      };
    }

    const prompt = `
You are an expert JEE Physics teacher.

Solve step-by-step clearly with equations in LaTeX.

Topic: ${topic || "General"}
Question: ${question}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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

    console.log("Gemini response:", JSON.stringify(data));

    if (data.error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: data.error.message })
      };
    }

    if (!data.candidates || data.candidates.length === 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "No candidates returned from Gemini." })
      };
    }

    const solution = data.candidates[0].content.parts
      .map(part => part.text)
      .join("\n");

    return {
      statusCode: 200,
      body: JSON.stringify({ solution })
    };

  } catch (error) {
    console.error("Server error:", error);

    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Server error occurred." })
    };
  }
};