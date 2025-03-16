import express from 'express'
import cors from 'cors';
import bodyparser from 'body-parser'
import dotenv from 'dotenv'

// const sqlite3 = require("sqlite3").verbose();
dotenv.config();

const app = express()
const port = 3000

app.use(bodyparser.json())

// const { GoogleGenerativeAI } = require("@google/generative-ai");
// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

// app.post("/generate-sql", async (req, res) => {
//   const { prompt, schema } = req.body;

//   if (!prompt || !schema) {
//     return res.status(400).json({ error: "Missing required fields: prompt and schema" });
//   }

//   try {
//     const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
//     const result = await model.generateContent(
//       `Convert this to SQL code the schema of the table is ${JSON.stringify(schema)}. 
//       No need of any explanation, just return SQL in a single line: ${prompt}`
//     );

//     const sqlQuery = result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || "Error generating SQL";
//     res.json({ sql: sqlQuery.trim() });
//   } catch (error) {
//     console.error("Error generating SQL:", error);
//     res.status(500).json({ error: "Failed to generate SQL", details: error.message });
//   }
// });

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


