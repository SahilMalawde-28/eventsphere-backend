import express from 'express'
import cors from 'cors';
import bodyparser from 'body-parser'
import dotenv from 'dotenv'
import { GoogleGenerativeAI } from "@google/generative-ai";
import Database from "better-sqlite3";



dotenv.config();

const app = express()
const port = 3000

app.use(bodyparser.json())
app.use(cors({
  origin: "*", // Replace with your frontend URL if needed
  methods: "GET, POST, OPTIONS",
  allowedHeaders: ["Content-Type", "Authorization"]
}));

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const db = new Database(":memory:");

app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.sendStatus(204);
});

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


// app.post("/execute-sql", (req, res) => {
//   try {
//     const prompt = req.body.prompt.trim();
    
//     const stmt = db.prepare(prompt);
//     stmt.run();

//     const match = prompt.match(/create table (\w+)/i);
//     if (match) {
//       const tableName = match[1];
//       const columns = db.prepare(`PRAGMA table_info(${tableName})`).all();

//       return res.json({ 
//         message: "Table created successfully!", 
//         tableName: tableName, 
//         schema: columns
//       });
//     }

//     res.json({ message: "SQL Executed Successfully!" });
//   } catch (err) {
//     res.status(400).json({ error: err.message });
//   }
// });




// ✅ Route to Fetch Current Table Data





app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


