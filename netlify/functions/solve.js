export async function handler(event) {

try {

const body = JSON.parse(event.body)

const question = body.question

const apiKey = process.env.GEMINI_API_KEY


const response = await fetch(

`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,

{
method: "POST",

headers: {
"Content-Type": "application/json"
},

body: JSON.stringify({

contents: [

{
parts: [

{
text: `You are a JEE Physics teacher.

Solve the problem clearly step-by-step.

Format the solution as:

Concept
Formula
Calculation
Final Answer

Do not use * or markdown.

Question: ${question}`

}

]

}

]

})

}

)


const data = await response.json()

console.log("Gemini response:", JSON.stringify(data))


const answer = data.candidates?.[0]?.content?.parts?.[0]?.text || "No solution generated."


return {

statusCode: 200,

body: JSON.stringify({

answer: answer

})

}

}

catch(error){

console.log("ERROR:", error)

return {

statusCode: 500,

body: JSON.stringify({

error: "AI failed"

})

}

}

}