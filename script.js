document.getElementById("solveBtn").addEventListener("click", solveProblem);

async function solveProblem() {
  const question = document.getElementById("question").value;
  const topic = document.getElementById("topic").value;
  const status = document.getElementById("status");
  const solutionBox = document.getElementById("solution");

  if (!question.trim()) {
    alert("Please enter a physics question.");
    return;
  }

  status.textContent = "Solving...";
  solutionBox.textContent = "Generating solution...";

  try {
    const response = await fetch("/.netlify/functions/solve", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ question, topic })
    });

    const data = await response.json();

    if (data.error) {
      solutionBox.textContent = "Error: " + data.error;
      status.textContent = "Failed";
    } else {
      solutionBox.textContent = data.solution;
      status.textContent = "Done";
      if (window.MathJax) {
        MathJax.typeset();
      }
    }
  } catch (error) {
    solutionBox.textContent = "Something went wrong.";
    status.textContent = "Error";
  }
}