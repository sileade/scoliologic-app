/**
 * Express роутер для AI API
 * 
 * Обеспечивает доступ к AI-ассистенту через REST API
 */

import { Router, Request, Response } from "express";
import {
  checkOllamaHealth,
  listModels,
  generate,
  chat,
  getMedicalResponse,
  analyzeSymptoms,
  getAnswerWithCache,
  OllamaMessage,
} from "./ollama";

const router = Router();

/**
 * GET /api/ai/health
 * Проверка доступности AI сервиса
 */
router.get("/health", async (req: Request, res: Response) => {
  const health = await checkOllamaHealth();
  
  res.json({
    status: health.available ? "ok" : "unavailable",
    ...health,
  });
});

/**
 * GET /api/ai/models
 * Получение списка доступных моделей
 */
router.get("/models", async (req: Request, res: Response) => {
  const models = await listModels();
  
  res.json({
    models: models.map(m => ({
      name: m.name,
      size: m.size,
      modified: m.modified_at,
      details: m.details,
    })),
  });
});

/**
 * POST /api/ai/generate
 * Генерация ответа на вопрос
 */
router.post("/generate", async (req: Request, res: Response) => {
  const { prompt, model, temperature, maxTokens } = req.body;
  
  if (!prompt) {
    return res.status(400).json({ error: "Prompt is required" });
  }
  
  const result = await generate(prompt, {
    model,
    temperature,
    maxTokens,
  });
  
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }
  
  res.json({
    response: result.response,
    duration: result.duration,
  });
});

/**
 * POST /api/ai/chat
 * Чат с историей сообщений
 */
router.post("/chat", async (req: Request, res: Response) => {
  const { messages, model, temperature, maxTokens } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Messages array is required" });
  }
  
  const result = await chat(messages as OllamaMessage[], {
    model,
    temperature,
    maxTokens,
  });
  
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }
  
  res.json({
    message: result.message,
    duration: result.duration,
  });
});

/**
 * POST /api/ai/medical
 * Медицинский ответ с контекстом пациента
 */
router.post("/medical", async (req: Request, res: Response) => {
  const { question, patientContext } = req.body;
  
  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }
  
  const result = await getMedicalResponse(question, patientContext);
  
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }
  
  res.json({
    response: result.response,
  });
});

/**
 * POST /api/ai/analyze-symptoms
 * Анализ симптомов
 */
router.post("/analyze-symptoms", async (req: Request, res: Response) => {
  const { symptoms } = req.body;
  
  if (!symptoms || !Array.isArray(symptoms)) {
    return res.status(400).json({ error: "Symptoms array is required" });
  }
  
  const result = await analyzeSymptoms(symptoms);
  
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }
  
  res.json({
    analysis: result.analysis,
  });
});

/**
 * POST /api/ai/faq
 * Ответ на часто задаваемый вопрос (с кэшированием)
 */
router.post("/faq", async (req: Request, res: Response) => {
  const { question } = req.body;
  
  if (!question) {
    return res.status(400).json({ error: "Question is required" });
  }
  
  const result = await getAnswerWithCache(question);
  
  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }
  
  res.json({
    response: result.response,
    fromCache: result.fromCache,
  });
});

export default router;
