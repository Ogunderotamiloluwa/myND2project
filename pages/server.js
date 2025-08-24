import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GROQ_API_URL = process.env.GROQ_API_URL;
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_URL) {
  console.error("GROQ_API_URL not set in .env");
}
if (!GROQ_API_KEY) {
  console.error("GROQ_API_KEY not set in .env");
}

app.get("/api/health", (_, res) => res.json({ status: "ok" }));

app.post("/api/chat", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (!prompt) return res.status(400).json({ error: "Missing prompt" });
    if (!GROQ_API_URL || !GROQ_API_KEY) {
      return res.status(500).json({
        error: "Server misconfigured: missing GROQ_API_URL or GROQ_API_KEY",
      });
    }

    // Build OpenAI-style chat completion payload that Groq expects:
    const preferredModels = [
      "llama-3.3-70b-versatile",
      "llama-3.2-3b-preview",
      "llama-3.1-8b-instant",
      "mixtral-8x7b-32768",
      "gemma2-9b-it",
    ];

    const model = process.env.GROQ_MODEL || preferredModels[0];

    console.log(`Using model: ${model}`); // Debug log

    // Map incoming chatHistory (if provided) to messages the API understands.
    const { chatHistory = [] } = req.body;
    const messages = [];

    if (Array.isArray(chatHistory)) {
      for (const item of chatHistory) {
        if (!item) continue;
        if (typeof item === "string") {
          messages.push({ role: "user", content: item });
        } else if (item.role && item.content) {
          messages.push({ role: item.role, content: item.content });
        } else if (item.content) {
          messages.push({ role: "user", content: item.content });
        }
      }
    }

    // Append the current user prompt as the last user message.
    messages.push({ role: "user", content: prompt });

    const payload = { model, messages };

    console.log("Forwarding chat completion to GROQ:", {
      model,
      messages: messages.length,
    });

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const text = await response.text();
      console.error(`GROQ API Error: ${response.status} - ${text}`); // Enhanced logging
      return res.status(502).json({
        error: "Upstream error",
        status: response.status,
        body: text,
        model: model, // Include which model failed
      });
    }

    if (contentType.includes("application/json")) {
      const data = await response.json();
      return res.json(data);
    } else {
      const text = await response.text();
      return res.json({ text });
    }
  } catch (err) {
    console.error("Error forwarding to GROQ:", err);
    // Return the fetch error message to the client to aid debugging (non-sensitive).
    res.status(502).json({ error: "Fetch error", message: err.message });
  }
});

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
