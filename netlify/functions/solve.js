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

Solve the physics problem step-by-step.

Return the solution in this structure:

Concept:
Explain the physics idea.

Formula:
Write equations using LATEX between $$ $$

Calculation:
Show substitutions using LATEX.

Final Answer:
Write the final expression using LATEX.

Example format:

Formula:
$$F = \\frac{k q_1 q_2}{r^2}$$

Calculation:
$$F = \\frac{9\\times10^9 \\times 2 \\times 3}{4^2}$$

Do NOT use markdown symbols like * or bullet points.

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