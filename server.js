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
const pg = db.adapters.createPg();

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
  try {
    const prompt = req.body.prompt.trim();
    await pg.query(prompt); 

    const match = prompt.match(/create table (\w+)/i);
    if (match) {
      const tableName = match[1];

      const schemaQuery = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = $1;
      `;

      const schemaResult = await pg.manyOrNone(schemaQuery, [tableName]);

      return res.json({
        message: "Table created successfully!",
        tableName: tableName,
        schema: schemaResult,
      });
    } else {
      return res.json({ message: "SQL Executed Successfully!" });
    }
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


app.post("/get-table", async (req, res) => {
  try {
    const prompt = req.body.prompt.trim();
    const match = prompt.match(/from\s+(\w+)/i);
    if (!match) {
      return res.status(400).json({ error: "Invalid SELECT query. No table name found." });
    }

    const tableName = match[1];

    const schemaQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1;
    `;
    const schemaResult = await pg.manyOrNone(schemaQuery, [tableName]);
    const columnNames = schemaResult.map(row => row.column_name);

    const tableData = await pg.query(prompt);
    res.json({
      message: "Table data fetched successfully!",
      tableName: tableName,
      columns: columnNames,
      data: tableData.map(row => Object.values(row)),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


