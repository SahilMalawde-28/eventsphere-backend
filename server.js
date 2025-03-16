require("dotenv").config();
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bodyParser = require("body-parser");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 5000;

app.use(cors()); // Allow all origins

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    
    if (req.method === "OPTIONS") {
        return res.sendStatus(204);
    }
    next();
});
app.use(bodyParser.json());

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const db = new sqlite3.Database(":memory:", (err) => {
  if (err) {
      console.error("Error creating in-memory database:", err.message);
  } else {
      console.log("🚀 Virtual Database Ready!");
  }
});

// ✅ Test route (Ensure API is working)
app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});

// ✅ Route to Execute SQL Commands
app.post("/execute-sql", (req, res) => {
    const prompt = req.body.prompt.trim();
  
    db.run(prompt, function (err) {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
  
      // ✅ Extract Table Name for CREATE TABLE
      const match = prompt.match(/create table (\w+)/i);
      if (match) {
        const tableName = match[1];
  
        db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
          if (err) {
            return res.status(500).json({ error: "Table created, but failed to fetch schema." });
          }
          res.json({ 
            message: "Table created successfully!", 
            tableName: tableName, // ✅ Return table name
            schema: columns       // ✅ Return schema details
          });
        });
      } else {
        res.json({ message: "SQL Executed Successfully!", changes: this.changes });
      }
    });
  });
  
  

// ✅ Route to Fetch Current Table Data
app.post("/get-table", (req, res) => {
    const prompt = req.body.prompt.trim();

    // ✅ Extract table name from SELECT query
    const match = prompt.match(/from\s+(\w+)/i);
    if (!match) {
        return res.status(400).json({ error: "Invalid SELECT query. No table name found." });
    }

    const tableName = match[1];

    // ✅ Fetch column names
    db.all(`PRAGMA table_info(${tableName})`, [], (err, columns) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        const columnNames = columns.map(col => col.name); // ✅ Extract column names

        // ✅ Fetch table data
        db.all(prompt, [], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            res.json({
                message: "Table data fetched successfully!",
                tableName: tableName,
                columns: columnNames,  // ✅ Send column names
                data: rows.map(row => Object.values(row)) // ✅ Convert rows to array format
            });
        });
    });
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

app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

