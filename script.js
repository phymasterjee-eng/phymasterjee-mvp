/* =============================== /
/ Example Problem Autofill /
/ =============================== */

function fillExample(text){

document.getElementById("question").value=text

}



/* =============================== /
/ Smooth Scroll to Solver Section /
/ =============================== */

function scrollToSolver(){

document.getElementById("solver").scrollIntoView({

behavior:"smooth"

})

}



/* =============================== /
/ MAIN SOLVER FUNCTION /
/ =============================== */

async function solveProblem(){

const question=document.getElementById("question").value

const result=document.getElementById("result")

/* ===== ADDED: Loader & status elements ===== */

const loader=document.getElementById("loader")

const status=document.getElementById("status")

/* ===== ADDED: Prevent empty question ===== */

if(!question){

alert("Please enter a physics question")

return

}

/* ===== ADDED: Show loading spinner ===== */

loader.style.display="block"

status.innerText="Solving..."

result.innerHTML=""



try{

const response=await fetch("/.netlify/functions/solve",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body.stringify({

question

})

})

const data=await response.json()

/* ===== ADDED: Fallback if answer missing ===== */

let text=data.answer || "No solution generated."

/* =============================== /
/ FORMAT CLEANUP /
/ =============================== */

text=text.replace(/*/g,"")

text=text.replace("Concept:", "Concept")
text=text.replace("Formula:", "Formula")
text=text.replace("Substitution:", "Substitution")
text=text.replace("Calculation:", "Calculation")
text=text.replace("Final Answer:", "Final Answer")

/* Convert line breaks */

text=text.replace(/\n/g,"")

result.innerHTML=text

/* ===== ADDED: Hide spinner after result ===== */

loader.style.display="none"

status.innerText=""

/* =============================== /
/ Render LaTeX Equations /
/ =============================== */

if(window.MathJax){
MathJax.typesetPromise()
}

}

catch(error){

/* ===== ADDED: Hide loader on error ===== */

loader.style.display="none"

status.innerText=""

result.innerHTML="Error solving problem"

}

}



/* =============================== /
/ SCROLL ANIMATION FOR FEATURE CARDS /
/ =============================== /
/ ===== ADDED: Scroll animation ===== */

window.addEventListener("scroll",function(){

document.querySelectorAll(".feature").forEach(function(card){

const position=card.getBoundingClientRect().top

const screen=window.innerHeight

if(position < screen-100){

card.classList.add("show")