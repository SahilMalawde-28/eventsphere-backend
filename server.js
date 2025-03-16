import express from 'express'
import cors from 'cors';
import bodyparser from 'body-parser'
import dotenv from 'dotenv'
import { GoogleGenerativeAI } from "@google/generative-ai";




dotenv.config();

const app = express()
const port = 3000

app.use(bodyparser.json())
app.use(cors())

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);



app.get("/", (req, res) => {
  

  if (!process.env.GEMINI_API_KEY) {
    res.json({ message: "Server is not running!" });
  } else {
    res.json({ message: "Server is running!" });
  }
  
});


app.post("/generate-sql", async (req, res) => {
  const userPrompt = req.body.prompt;
  const userSchema = req.body.schema;
  const schemaString = JSON.stringify(userSchema);

  try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(`Convert this to SQL code the schema of the table is ${schemaString} no need of any explanation just the code in a single line without extra new lines to directly use in raw: ${userPrompt}`);
      const sqlQuery = result.response.candidates[0].content.parts[0].text;

      res.json({ sql: sqlQuery.trim() });
  } catch (error) {
      res.status(500).json({ error: "Failed to generate SQL", details: error.message });
  }
});




app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


