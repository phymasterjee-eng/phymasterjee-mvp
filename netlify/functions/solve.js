/* ================================= */
/* Netlify Function: Physics Solver  */
/* ================================= */

export async function handler(event) {

  try {

    /* ===== ADDED: Safe parsing of request body ===== */
    const body = JSON.parse(event.body || "{}")
    const question = body.question

    /* ===== ADDED: Validate question ===== */
    if(!question){
      return {
        statusCode:400,
        body:JSON.stringify({
          error:"No question provided"
        })
      }
    }

    /* ===== API KEY from Netlify Environment ===== */
    const apiKey = process.env.GEMINI_API_KEY

    /* ===== ADDED: Check if API key missing ===== */
    if(!apiKey){
      return {
        statusCode:500,
        body:JSON.stringify({
          error:"Gemini API key not configured"
        })
      }
    }

    /* ================================= */
    /* Call Gemini API */
    /* ================================= */

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method:"POST",
        headers:{
          "Content-Type":"application/json"
        },
        body:JSON.stringify({

          contents:[
            {
              parts:[
                {
                  text:`You are a JEE Physics teacher.

Solve the physics problem step-by-step.

Return the solution in this structure:

Concept:
Explain the physics idea.

Formula:
Write equations using LATEX between $$ $$.

Substitution:
Substitute numerical values using LATEX.

Calculation:
Show calculation steps.

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

    /* ================================= */
    /* Parse Gemini response */
    /* ================================= */

    const data = await response.json()

    console.log("Gemini response:", JSON.stringify(data))

    /* ===== IMPROVED: Safe extraction of answer ===== */
    const answer =
      data?.candidates?.[0]?.content?.parts?.[0]?.text
      || "No solution generated."

    /* ================================= */
    /* Return solution to frontend */
    /* ================================= */

    return {
      statusCode:200,
      body:JSON.stringify({
        answer:answer
      })
    }

  }

  /* ================================= */
  /* Error handling */
  /* ================================= */

  catch(error){

    console.log("ERROR:", error)

    return {
      statusCode:500,
      body:JSON.stringify({
        error:"AI failed"
      })
    }

  }

}