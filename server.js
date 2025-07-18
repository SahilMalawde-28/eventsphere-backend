import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { newDb } from 'pg-mem';

dotenv.config();

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(cors({
  origin: "https://s-querrel-j6ki.vercel.app"
}));


const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const db = newDb();
const connection = db.public;

// ✅ In-memory schema store
const schemaStore = {};



app.get("/", (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    res.json({ message: "Server is not running! Missing GEMINI_API_KEY." });
  } else {
    res.json({ message: "Server is running!" });
  }
});

// ✅ Route: Generate SQL using Gemini + schema context
app.post("/generate-sql", async (req, res) => {
  const userPrompt = req.body.prompt;
  const userSchema = req.body.schema;
  const schemaString = JSON.stringify(userSchema || schemaStore);

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(
      `Convert this prompt to SQL code. Schema: ${schemaString}. No explanation. Return SQL in a single line: ${userPrompt}`
    );

    const sqlQuery = result.response.candidates[0].content.parts[0].text;
    res.json({ sql: sqlQuery.trim() });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate SQL", details: error.message });
  }
});

// ✅ Route: Execute raw SQL and extract schema on CREATE TABLE
app.post("/execute-sql", async (req, res) => {
  const prompt = req.body.prompt.trim();

  try {
    await connection.none(prompt);

    const match = prompt.match(/create table (\w+)/i);
    if (match) {
      const tableName = match[1];

      const table = connection.getTable(tableName);
      const columns = table.columns;

      schemaStore[tableName] = columns.map(col => ({
        name: col.name,
        type: col.type.name || "UNKNOWN"
      }));

      res.json({
        message: "Table created successfully!",
        tableName: tableName,
        schema: schemaStore[tableName]
      });
    } else {
      res.json({ message: "SQL Executed Successfully!" });
    }
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ✅ Route: Fetch table data and columns
app.post("/get-table", async (req, res) => {
  const prompt = req.body.prompt.trim();

  const match = prompt.match(/from\s+(\w+)/i);
  if (!match) {
    return res.status(400).json({ error: "Invalid SELECT query. No table name found." });
  }

  const tableName = match[1];

  try {
    const rows = connection.many(prompt);

    res.json({
      message: "Table data fetched successfully!",
      tableName: tableName,
      columns: schemaStore[tableName]?.map(col => col.name) || [],
      data: rows.map(row => Object.values(row))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ✅ Route: Get current schema for all tables
app.get("/get-schema", (req, res) => {
  res.json({ schema: schemaStore });
});

// ✅ Start server
app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
});
