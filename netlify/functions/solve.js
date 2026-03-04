export async function handler(event) {

try {

const body = JSON.parse(event.body)

const question = body.question

const apiKey = process.env.GEMINI_API_KEY


const response = await fetch(

`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,

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

text: `You are a JEE Physics teacher. Solve clearly and step by step without using * symbols. Question: ${question}`

}

]

}

]

})

})



const data = await response.json()

const answer = data.candidates[0].content.parts[0].text


return {

statusCode: 200,

body: JSON.stringify({

answer: answer

})

}

}

catch(error){

return {

statusCode: 500,

body: JSON.stringify({

error: "AI failed"

})

}

}

}