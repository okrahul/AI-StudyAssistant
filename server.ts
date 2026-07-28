import express from "express";
import path from "path";
import multer from "multer";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { db } from "./server-db.ts";

const app = express();
const PORT = 3000;

// Setup Multer memory storage for incoming PDF uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf" || file.originalname.endsWith(".pdf")) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are supported!"));
    }
  },
});

app.use(express.json());

// Lazy initialization for Gemini API client
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || "";
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// API: Users
app.post("/api/users", async (req, res, next) => {
  try {
    const { id, email, name, avatarUrl } = req.body;
    if (!email || !name) {
      return res.status(400).json({ error: "email and name are required" });
    }
    const userId = id || `user-${Date.now()}`;
    const user = await db.createUser(userId, email, name, avatarUrl);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// API: Subjects
app.get("/api/subjects", async (req, res, next) => {
  try {
    const userId = (req.query.userId as string) || "user-1";
    const subjects = await db.getSubjects(userId);
    res.json(subjects);
  } catch (err) {
    next(err);
  }
});

app.post("/api/subjects", async (req, res, next) => {
  try {
    const { userId, subjectName } = req.body;
    if (!userId || !subjectName) {
      return res.status(400).json({ error: "userId and subjectName are required" });
    }
    const sub = await db.createSubject(userId, subjectName);
    res.json(sub);
  } catch (err) {
    next(err);
  }
});

app.put("/api/subjects/:id", async (req, res, next) => {
  try {
    const { subjectName } = req.body;
    if (!subjectName) {
      return res.status(400).json({ error: "subjectName is required" });
    }
    const updated = await db.renameSubject(req.params.id, subjectName);
    if (!updated) return res.status(404).json({ error: "Subject not found" });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

app.delete("/api/subjects/:id", async (req, res, next) => {
  try {
    await db.deleteSubject(req.params.id);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// API: Seed sample demo data for a user on-demand
app.post("/api/seed-sample-data", async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }
    await db.seedSampleData(userId);
    res.json({ success: true, message: "Sample demo data populated successfully" });
  } catch (err) {
    next(err);
  }
});

// API: Documents (PDF / Pasted Notes)
app.get("/api/documents", async (req, res) => {
  const subjectId = req.query.subjectId as string;
  if (!subjectId) return res.status(400).json({ error: "subjectId is required" });
  const docs = await db.getDocuments(subjectId);
  res.json(docs);
});

// 1. Paste Notes directly
app.post("/api/documents/paste", async (req, res) => {
  const { userId, subjectId, fileName, content } = req.body;
  if (!userId || !subjectId || !fileName || !content) {
    return res.status(400).json({ error: "All fields are required" });
  }
  const docItem = await db.createDocument(userId, subjectId, fileName, content, 1);
  res.json(docItem);
});

// 2. Upload PDF
app.post("/api/documents/upload", upload.single("file"), async (req, res) => {
  const file = req.file;
  const { userId, subjectId } = req.body;

  if (!file) {
    return res.status(400).json({ error: "No PDF file attached" });
  }
  if (!userId || !subjectId) {
    return res.status(400).json({ error: "userId and subjectId are required" });
  }

  try {
    console.log(`Parsing PDF file: ${file.originalname} (${file.size} bytes)`);
    const data = await pdfParse(file.buffer);
    const textContent = data.text || "";
    const totalPages = data.numpages || 1;

    if (!textContent.trim()) {
      return res.status(400).json({ error: "Extracted PDF content was empty. Is this a scanned document?" });
    }

    const docItem = await db.createDocument(userId, subjectId, file.originalname, textContent, totalPages);
    res.json(docItem);
  } catch (error: any) {
    console.error("PDF upload/parsing error:", error);
    res.status(500).json({ error: `Failed to extract text from PDF: ${error.message}` });
  }
});

app.delete("/api/documents/:id", async (req, res) => {
  await db.deleteDocument(req.params.id);
  res.json({ success: true });
});

// API: Chats & RAG Messaging
app.get("/api/chats", async (req, res) => {
  const userId = (req.query.userId as string) || "user-1";
  const subjectId = req.query.subjectId as string;
  if (!subjectId) return res.status(400).json({ error: "subjectId is required" });
  const chats = await db.getChats(userId, subjectId);
  res.json(chats);
});

app.post("/api/chats", async (req, res) => {
  const { userId, subjectId, title } = req.body;
  if (!userId || !subjectId || !title) {
    return res.status(400).json({ error: "userId, subjectId, and title are required" });
  }
  const chat = await db.createChat(userId, subjectId, title);
  res.json(chat);
});

app.delete("/api/chats/:id", async (req, res) => {
  await db.deleteChat(req.params.id);
  res.json({ success: true });
});

app.get("/api/chats/:chatId/messages", async (req, res) => {
  const msgs = await db.getMessages(req.params.chatId);
  res.json(msgs);
});

// Ask AI with PDF Context (RAG pipeline)
app.post("/api/chats/:chatId/messages", async (req, res) => {
  const { chatId } = req.params;
  const { content, subjectId, tutorMode } = req.body;

  if (!content || !subjectId) {
    return res.status(400).json({ error: "content and subjectId are required" });
  }

  // 1. Save user message to DB
  const userMsg = await db.addMessage(chatId, "user", content);

  // 2. Perform RAG / Similarity Search
  console.log(`RAG Search for subject: ${subjectId} - Query: "${content}"`);
  const relevantChunks = await db.searchChunks(subjectId, content, 5);
  const contextBlock = relevantChunks.map(c => `[Excerpt]: ${c.text}`).join("\n\n");

  // 3. Select systemic persona based on tutorMode
  const systemInstruction = tutorMode
    ? "You are an experienced and patient AI Tutor. Your goal is to guide students step-by-step, explain complex topics using intuitive everyday analogies, give clear examples, and ask encouraging follow-up questions at the end to check their understanding. Adopt a warm, friendly, encouraging educational tone."
    : "You are a professional educational Study Assistant. Explain concepts directly, simply, and with highly structured outlines. Use bold headers, clean bullet points, and highlight key terms. Highlight important definitions clearly.";

  try {
    const prompt = `Student Question: "${content}"

Study Notes Context:
---
${contextBlock || "No matching study notes were found for this query."}
---

Provide a helpful, complete educational response. If the answer is found in the Study Notes Context, rely heavily on it to customize your answer. If the answer is not directly available in the context, formulate a high-quality educational answer using your broader knowledge base, but gently note that this info wasn't directly in their uploaded study notes.`;

    const result = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    const answer = result.text || "I apologize, I could not generate an answer at this moment.";

    // 4. Save AI response to DB
    const aiMsg = await db.addMessage(chatId, "model", answer);

    res.json({ userMsg, aiMsg });
  } catch (error: any) {
    console.error("Gemini API error:", error);
    const errAnswer = `I encountered an issue generating a response. Please verify your Gemini API key under Settings. Error: ${error.message}`;
    const aiMsg = await db.addMessage(chatId, "model", errAnswer);
    res.json({ userMsg, aiMsg });
  }
});

// API: AI Chapter Summarizer
app.post("/api/summarize", async (req, res) => {
  const { subjectId, format } = req.body;
  if (!subjectId || !format) {
    return res.status(400).json({ error: "subjectId and format are required" });
  }

  const documents = await db.getDocuments(subjectId);
  if (documents.length === 0) {
    return res.status(400).json({ error: "Please upload some PDFs or paste notes first to summarize!" });
  }

  const combinedText = documents.map(d => d.content).join("\n\n").slice(0, 15000);

  let formatInstruction = "";
  if (format === "short") {
    formatInstruction = "Provide a high-impact, short summary under 150 words. Focus strictly on core formulas, key terms, and central definitions.";
  } else if (format === "detailed") {
    formatInstruction = "Provide a rich, detailed summary (roughly 500 words). Organise it with clear headers, outline major subsystems/principles, provide comprehensive context, and explain sub-concepts sequentially.";
  } else {
    formatInstruction = "Create structured 'Exam Revision Notes'. Include: 1) Essential definitions, 2) Core theories with bullet points, 3) 3 potential exam questions with brief answers, 4) A memory trick or acronym to remember this topic easily.";
  }

  try {
    const prompt = `Generate a summary of the following study materials:
    
    Style Requirement:
    ${formatInstruction}

    Study Materials:
    ---
    ${combinedText}
    ---`;

    const result = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional educational summarizer, helping students prep for their exams with precise summaries.",
      },
    });

    res.json({ summary: result.text });
  } catch (error: any) {
    console.error("Summary generation error:", error);
    res.status(500).json({ error: `Failed to generate summary: ${error.message}` });
  }
});

// API: AI Flashcard Generator
app.get("/api/flashcards", async (req, res) => {
  const subjectId = req.query.subjectId as string;
  if (!subjectId) return res.status(400).json({ error: "subjectId is required" });
  const cards = await db.getFlashcards(subjectId);
  res.json(cards);
});

app.post("/api/flashcards", async (req, res) => {
  const { subjectId, question, answer } = req.body;
  if (!subjectId || !question || !answer) {
    return res.status(400).json({ error: "subjectId, question, and answer are required" });
  }
  const card = await db.createFlashcard(subjectId, question, answer);
  res.json(card);
});

app.post("/api/flashcards/generate", async (req, res) => {
  const { subjectId } = req.body;
  if (!subjectId) return res.status(400).json({ error: "subjectId is required" });

  const documents = await db.getDocuments(subjectId);
  if (documents.length === 0) {
    return res.status(400).json({ error: "Please upload some PDFs or paste notes first to generate flashcards!" });
  }

  const combinedText = documents.map(d => d.content).join("\n\n").slice(0, 12000);

  try {
    const prompt = `Analyze the study material context below, extract key definitions and concepts, and generate 6-8 distinct educational flashcards. 
    Each flashcard must contain a highly specific question on the front, and a brief, explanatory answer on the back. Return the response as a JSON array of objects.

    Study Material:
    ---
    ${combinedText}
    ---`;

    const result = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: "A test question for the flashcard front" },
              answer: { type: Type.STRING, description: "The answer for the flashcard back" },
            },
            required: ["question", "answer"],
          },
        },
      },
    });

    const cards = JSON.parse(result.text || "[]");
    const createdCards = await db.setFlashcards(subjectId, cards);
    res.json(createdCards);
  } catch (error: any) {
    console.error("Flashcard generation error:", error);
    res.status(500).json({ error: `Failed to generate flashcards: ${error.message}` });
  }
});

app.put("/api/flashcards/:id/toggle", async (req, res) => {
  const card = await db.toggleFlashcardLearned(req.params.id);
  if (!card) return res.status(404).json({ error: "Flashcard not found" });
  res.json(card);
});

app.delete("/api/flashcards/:id", async (req, res) => {
  await db.deleteFlashcard(req.params.id);
  res.json({ success: true });
});

// API: AI Quiz Generator
app.get("/api/quizzes", async (req, res) => {
  const subjectId = req.query.subjectId as string;
  if (!subjectId) return res.status(400).json({ error: "subjectId is required" });
  const quizzes = await db.getQuizzes(subjectId);
  res.json(quizzes);
});

app.get("/api/quizzes/:id", async (req, res) => {
  const quiz = await db.getQuizDetails(req.params.id);
  if (!quiz) return res.status(404).json({ error: "Quiz not found" });
  res.json(quiz);
});

app.post("/api/quizzes/generate", async (req, res) => {
  const { subjectId, difficulty, title } = req.body;
  if (!subjectId || !difficulty) {
    return res.status(400).json({ error: "subjectId and difficulty are required" });
  }

  const documents = await db.getDocuments(subjectId);
  if (documents.length === 0) {
    return res.status(400).json({ error: "Please upload some PDFs or paste notes first to generate a quiz!" });
  }

  const combinedText = documents.map(d => d.content).join("\n\n").slice(0, 12000);

  try {
    const prompt = `Based on the study materials below, generate an interactive assessment with exactly 5 questions of "${difficulty}" difficulty level.
    The output must strictly be a JSON array of 5 questions following these configurations:
    - 2 Multiple Choice Questions (type: "mcq"): Must have exactly 4 values in the options array, and correctAnswer must match one of those options exactly.
    - 2 True/False Questions (type: "tf"): Options must be exactly ["True", "False"], and correctAnswer must be "True" or "False".
    - 1 Short Answer Question (type: "short"): No options array (or leave empty). correctAnswer should be a short key phrase or term, and explanation must describe how to answer it.

    Study Materials:
    ---
    ${combinedText}
    ---`;

    const result = await getAI().models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING, description: "The question text" },
              type: { type: Type.STRING, description: "Must be 'mcq', 'tf', or 'short'" },
              options: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of options for mcq/tf questions. Empty or null for short."
              },
              correctAnswer: { type: Type.STRING, description: "The exact correct answer or option string" },
              explanation: { type: Type.STRING, description: "Detailed educational rationale why this is correct" },
            },
            required: ["question", "type", "correctAnswer", "explanation"],
          },
        },
      },
    });

    const questions = JSON.parse(result.text || "[]");
    const quizTitle = title || `${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Knowledge Test`;
    const quiz = await db.createQuiz(subjectId, quizTitle, difficulty, questions);
    const fullQuiz = await db.getQuizDetails(quiz.id);
    res.json(fullQuiz);
  } catch (error: any) {
    console.error("Quiz generation error:", error);
    res.status(500).json({ error: `Failed to generate quiz: ${error.message}` });
  }
});

app.post("/api/quizzes/:id/submit", async (req, res) => {
  const { answers } = req.body;
  if (!answers) return res.status(400).json({ error: "answers are required" });

  const result = await db.submitQuizAnswers(req.params.id, answers);
  if (!result) return res.status(404).json({ error: "Quiz not found" });

  res.json(result);
});

// API: Dashboard stats
app.get("/api/dashboard-stats", async (req, res, next) => {
  try {
    const userId = (req.query.userId as string) || "user-1";
    const stats = await db.getDashboardStats(userId);
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

// Global Express Error Handler to prevent HTML error responses
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled API Error:", err);
  if (!res.headersSent) {
    res.status(500).json({ error: err?.message || "Internal Server Error" });
  }
});

// Start server and handle Vite development vs production assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Configuring Vite Development Middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving Production Build files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Study Assistant Server running on http://localhost:${PORT}`);
  });
}

startServer();
