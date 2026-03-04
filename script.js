function scrollToSolver(){

document.getElementById("solver").scrollIntoView({

behavior:"smooth"

})

}



async function solveProblem(){

const question=document.getElementById("question").value

const result=document.getElementById("result")

result.innerHTML="Solving..."



try{

const response=await fetch("/.netlify/functions/solve",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

question:question

})

})


const data=await response.json()

let text=data.answer


text=text.replace(/\*/g,"")


result.innerHTML=text


}

catch(error){

result.innerHTML="Error solving problem"

}

}