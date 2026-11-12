// Tiny Express server: serves the chat page and one POST /api/chat endpoint.
// The browser keeps the conversation history and sends it each time, so the server is stateless.

import "dotenv/config";
import express from "express";
import { fileURLToPath } from "node:url";
import { runAgent } from "./agent.js";

const app = express();
app.use(express.json({ limit: "100kb" }));
app.use(express.static(fileURLToPath(new URL("./public", import.meta.url))));

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body ?? {};
  const valid =
    Array.isArray(messages) &&
    messages.length > 0 &&
    messages.every((m) => ["user", "assistant"].includes(m.role) && typeof m.content === "string");
  if (!valid) return res.status(400).json({ error: "messages must be a non-empty list of {role, content}" });

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "OPENAI_API_KEY is missing. Copy .env.example to .env and fill it in." });
  }
  try {
    res.json(await runAgent(messages));
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: `Model request failed: ${err.message}` });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Chat agent running at http://localhost:${port}`));
