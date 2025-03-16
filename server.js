import express from 'express'
import cors from 'cors';
import bodyparser from 'body-parser'
import dotenv from 'dotenv'

dotenv.config();

const app = express()
const port = 3000

app.use(bodyparser.json())
app.use(cors())


app.get("/", (req, res) => {
  res.json({ message: "Server is running!" });
});



app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
