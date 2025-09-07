// script.js - frontend for PhyMasterJEE
// Make sure index.html has:
// <textarea id="question">...</textarea>
// <select id="topic">...</select>  OR checkbox inputs with name="topic"
// <div id="solution"></div> <div id="status"></div> <button id="solveBtn">Solve</button>

const solveBtn = document.getElementById('solveBtn');
const questionEl = document.getElementById('question');
const topicEl = document.getElementById('topic'); // could be <select>, or undefined
const solutionBox = document.getElementById('solution');
const statusEl = document.getElementById('status');

async function solveProblem() {
  // Read plain string from textarea
  const question = (questionEl && questionEl.value) ? questionEl.value.trim() : '';

  // Read topic robustly:
  let topic = '';
  if (!topicEl) {
    // try checkboxes or inputs named "topic"
    const topicNodes = document.getElementsByName('topic');
    if (topicNodes && topicNodes.length) {
      // collect checked values (checkboxes) or values if single
      const vals = Array.from(topicNodes).filter(n => n.checked || n.type !== 'checkbox').map(n => n.value || n.textContent);
      topic = vals.join(', ');
    }
  } else {
    if (topicEl instanceof HTMLSelectElement) {
      topic = topicEl.value || (topicEl.selectedOptions && topicEl.selectedOptions[0]?.text) || '';
    } else if (topicEl instanceof HTMLInputElement || topicEl instanceof HTMLTextAreaElement) {
      topic = topicEl.value || '';
    } else {
      // fallback: string content
      topic = topicEl.value || topicEl.textContent || '';
    }
  }

  // Basic UI guards
  if (!question) {
    statusEl.innerText = '❌ Please enter the problem text in the box.';
    return;
  }

  // Show status & disable button
  solveBtn.disabled = true;
  statusEl.innerText = 'Thinking... ⏳';
  solutionBox.innerHTML = '';

  // Log payload for debugging (open DevTools -> Console to inspect)
  const payload = { question, topic };
  console.log('Outgoing payload:', payload);

  try {
    const resp = await fetch('/.netlify/functions/solve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // show raw response for debugging
    const data = await resp.json();
    console.log('Raw function response:', data);

    if (!resp.ok) {
      // Upstream error from server (shows user friendly message)
      const errMsg = (data && (data.error || JSON.stringify(data))) || 'Server error';
      statusEl.innerText = '❌ ' + errMsg;
      solutionBox.innerText = 'Error — check console and function logs.';
      return;
    }

    // success: show answer (HTML so MathJax can render)
    const answer = data.answer || data?.result || '';
    solutionBox.innerHTML = answer;

    // Re-render MathJax (if present)
    if (window.MathJax && MathJax.typesetPromise) {
      try { await MathJax.typesetPromise([solutionBox]); } catch (e) { console.warn('MathJax error', e); }
    }

    statusEl.innerText = '✅ Solved';
  } catch (err) {
    console.error('Fetch error:', err);
    statusEl.innerText = '❌ Network or server error';
    solutionBox.innerText = String(err);
  } finally {
    solveBtn.disabled = false;
  }
}

// attach button (if not inline handler)
if (solveBtn) solveBtn.addEventListener('click', solveProblem);

// Optional: allow Ctrl+Enter to submit from textarea
if (questionEl) {
  questionEl.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'Enter') solveProblem();
  });
}