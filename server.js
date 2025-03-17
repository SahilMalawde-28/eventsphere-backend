import express from 'express'
import cors from 'cors';
import bodyparser from 'body-parser'
import dotenv from 'dotenv'
import { GoogleGenerativeAI } from "@google/generative-ai";
import { newDb } from "pg-mem";



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

const db = newDb();
const connection = db.public;

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

app.post("/execute-sql", async (req, res) => {
  const prompt = req.body.prompt.trim();

  try {
      await connection.query(prompt); // Execute the SQL command

      const match = prompt.match(/create table (\w+)/i);
      if (match) {
          const tableName = match[1];

          // ✅ Get table schema correctly
          const table = connection.tables.get(tableName);

          if (!table) {
              return res.status(500).json({ error: "Table created, but schema retrieval failed." });
          }

          res.json({
              message: "Table created successfully!",
              tableName: tableName,
              schema: table.getColumns().map(col => col.name) // Extract column names
          });
      } else {
          res.json({ message: "SQL Executed Successfully!" });
      }
  } catch (error) {
      res.status(400).json({ error: error.message });
  }
});

app.post("/get-table", async (req, res) => {
  const prompt = req.body.prompt.trim();

  const match = prompt.match(/from\s+(\w+)/i);
  if (!match) {
      return res.status(400).json({ error: "Invalid SELECT query. No table name found." });
  }

  const tableName = match[1];

  try {
      // ✅ Get table schema correctly
      const table = connection.tables.get(tableName);

      if (!table) {
          return res.status(500).json({ error: "Table does not exist." });
      }

      const rows = connection.query(prompt);

      res.json({
          message: "Table data fetched successfully!",
          tableName: tableName,
          columns: table.getColumns().map(col => col.name), // Extract column names
          data: rows.map(row => Object.values(row)) // Convert rows to array format
      });
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});



app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


