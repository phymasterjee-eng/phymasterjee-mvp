fetch("/.netlify/functions/solve", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ question, topic })
})

async function solveProblem() {
  const question = document.getElementById("question").value.trim();
  const topic = document.getElementById("topic").value || 'General';
  const solutionBox = document.getElementById("solution");
  const statusEl = document.getElementById("status");
  const solveBtn = document.getElementById("solveBtn");

  if (!question) {
    statusEl.innerText = '❌ Please enter a question.';
    return;
  }

  solveBtn.disabled = true;
  statusEl.innerText = 'Thinking... ⏳';
  solutionBox.innerHTML = '';

  try {
    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=" + API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Solve this JEE/NSEP physics problem step by step. 
              Use LaTeX for all equations.\n\nTopic: ${topic}\nProblem:\n${question}`
            }]
          }]
        })
      }
    );

    const data = await resp.json();
    console.log("Raw response:", data);

    if (data.candidates && data.candidates.length > 0) {
      const text = data.candidates[0].content.parts[0].text;
      solutionBox.innerHTML = text;

      if (window.MathJax) {
        MathJax.typesetPromise([solutionBox]);
      }
      statusEl.innerText = '✅ Solved';
    } else {
      solutionBox.innerText = "⚠️ No solution returned.";
      statusEl.innerText = '❌ Error';
    }

  } catch (err) {
    console.error(err);
    solutionBox.innerText = "❌ Error: " + err.message;
    statusEl.innerText = '❌ Error';
  } finally {
    solveBtn.disabled = false;
  }
}