diff --git a/script.js b/script.js
index 45b5376aa0378d5e58fddaf09f07fdb7e5afcb7d..bd4d33af9d1d43e088cebc5c67cabaeb64cb0110 100644
--- a/script.js
+++ b/script.js
@@ -1,99 +1,103 @@
-// script.js - frontend for PhyMasterJEE
-// Make sure index.html has:
-// <textarea id="question">...</textarea>
-// <select id="topic">...</select>  OR checkbox inputs with name="topic"
-// <div id="solution"></div> <div id="status"></div> <button id="solveBtn">Solve</button>
-
 const solveBtn = document.getElementById('solveBtn');
 const questionEl = document.getElementById('question');
-const topicEl = document.getElementById('topic'); // could be <select>, or undefined
+const topicEl = document.getElementById('topic');
 const solutionBox = document.getElementById('solution');
 const statusEl = document.getElementById('status');
 
-async function solveProblem() {
-  // Read plain string from textarea
-  const question = (questionEl && questionEl.value) ? questionEl.value.trim() : '';
-
-  // Read topic robustly:
-  let topic = '';
-  if (!topicEl) {
-    // try checkboxes or inputs named "topic"
-    const topicNodes = document.getElementsByName('topic');
-    if (topicNodes && topicNodes.length) {
-      // collect checked values (checkboxes) or values if single
-      const vals = Array.from(topicNodes).filter(n => n.checked || n.type !== 'checkbox').map(n => n.value || n.textContent);
-      topic = vals.join(', ');
-    }
-  } else {
-    if (topicEl instanceof HTMLSelectElement) {
-      topic = topicEl.value || (topicEl.selectedOptions && topicEl.selectedOptions[0]?.text) || '';
-    } else if (topicEl instanceof HTMLInputElement || topicEl instanceof HTMLTextAreaElement) {
-      topic = topicEl.value || '';
-    } else {
-      // fallback: string content
-      topic = topicEl.value || topicEl.textContent || '';
+function encodeFormData(data) {
+  return new URLSearchParams(data).toString();
+}
+
+async function submitNetlifyForm(formId, statusId) {
+  const form = document.getElementById(formId);
+  const status = document.getElementById(statusId);
+  if (!form || !status) return;
+
+  form.addEventListener('submit', async (event) => {
+    event.preventDefault();
+    status.innerText = 'Submitting...';
+
+    const formData = new FormData(form);
+    const payload = Object.fromEntries(formData.entries());
+
+    try {
+      const response = await fetch('/', {
+        method: 'POST',
+        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
+        body: encodeFormData(payload)
+      });
+
+      if (!response.ok) {
+        status.innerText = '❌ Could not submit right now. Please retry.';
+        return;
+      }
+
+      const key = `${formId}-local-backup`;
+      const records = JSON.parse(localStorage.getItem(key) || '[]');
+      records.push({ ...payload, submittedAt: new Date().toISOString() });
+      localStorage.setItem(key, JSON.stringify(records));
+
+      form.reset();
+      status.innerText = '✅ Submitted successfully and captured.';
+    } catch (error) {
+      status.innerText = '❌ Network error. Please try again.';
+      console.error(error);
     }
-  }
+  });
+}
+
+async function solveProblem() {
+  const question = (questionEl?.value || '').trim();
+  const topic = topicEl?.value || 'General';
 
-  // Basic UI guards
   if (!question) {
-    statusEl.innerText = '❌ Please enter the problem text in the box.';
+    statusEl.innerText = '❌ Please enter the problem first.';
     return;
   }
 
-  // Show status & disable button
   solveBtn.disabled = true;
   statusEl.innerText = 'Thinking... ⏳';
   solutionBox.innerHTML = '';
 
-  // Log payload for debugging (open DevTools -> Console to inspect)
-  const payload = { question, topic };
-  console.log('Outgoing payload:', payload);
-
   try {
     const resp = await fetch('/.netlify/functions/solve', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
-      body: JSON.stringify(payload)
+      body: JSON.stringify({ question, topic })
     });
 
-    // show raw response for debugging
     const data = await resp.json();
-    console.log('Raw function response:', data);
-
     if (!resp.ok) {
-      // Upstream error from server (shows user friendly message)
-      const errMsg = (data && (data.error || JSON.stringify(data))) || 'Server error';
-      statusEl.innerText = '❌ ' + errMsg;
-      solutionBox.innerText = 'Error — check console and function logs.';
+      statusEl.innerText = `❌ ${data.error || 'Server error'}`;
+      solutionBox.innerText = 'Unable to generate a solution.';
       return;
     }
 
-    // success: show answer (HTML so MathJax can render)
-    const answer = data.answer || data?.result || '';
-    solutionBox.innerHTML = answer;
+    solutionBox.innerHTML = data.answer || 'No answer returned.';
 
-    // Re-render MathJax (if present)
-    if (window.MathJax && MathJax.typesetPromise) {
-      try { await MathJax.typesetPromise([solutionBox]); } catch (e) { console.warn('MathJax error', e); }
+    if (window.MathJax?.typesetPromise) {
+      try {
+        await MathJax.typesetPromise([solutionBox]);
+      } catch (error) {
+        console.warn('MathJax rendering issue', error);
+      }
     }
 
     statusEl.innerText = '✅ Solved';
-  } catch (err) {
-    console.error('Fetch error:', err);
+  } catch (error) {
     statusEl.innerText = '❌ Network or server error';
-    solutionBox.innerText = String(err);
+    solutionBox.innerText = String(error);
   } finally {
     solveBtn.disabled = false;
   }
 }
 
-// attach button (if not inline handler)
 if (solveBtn) solveBtn.addEventListener('click', solveProblem);
-
-// Optional: allow Ctrl+Enter to submit from textarea
 if (questionEl) {
-  questionEl.addEventListener('keydown', (e) => {
-    if (e.ctrlKey && e.key === 'Enter') solveProblem();
+  questionEl.addEventListener('keydown', (event) => {
+    if (event.ctrlKey && event.key === 'Enter') solveProblem();
   });
-}
\ No newline at end of file
+}
+
+submitNetlifyForm('leadForm', 'leadStatus');
+submitNetlifyForm('queryForm', 'queryStatus');
