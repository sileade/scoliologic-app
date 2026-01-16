/**
 * Сервис интеграции с Ollama для AI-ассистента
 * 
 * Ollama - локальный сервер для запуска LLM моделей.
 * Работает в локальной сети клиники для обеспечения
 * конфиденциальности медицинских данных.
 * 
 * Поддерживаемые модели:
 * - llama3 (основная)
 * - mistral
 * - codellama
 * - медицинские fine-tuned модели
 */

// Используем process.env напрямую для конфигурации

export interface OllamaConfig {
  // URL сервера Ollama в локальной сети
  baseUrl: string;
  // Модель по умолчанию
  defaultModel: string;
  // Таймаут запросов (мс)
  timeout: number;
  // Максимальное количество токенов в ответе
  maxTokens: number;
  // Температура (креативность) 0-1
  temperature: number;
  // Системный промпт для медицинского контекста
  systemPrompt: string;
}

export const ollamaConfig: OllamaConfig = {
  baseUrl: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  defaultModel: process.env.OLLAMA_MODEL || "llama3.2",
  timeout: parseInt(process.env.OLLAMA_TIMEOUT || "60000"),
  maxTokens: parseInt(process.env.OLLAMA_MAX_TOKENS || "2048"),
  temperature: parseFloat(process.env.OLLAMA_TEMPERATURE || "0.7"),
  systemPrompt: `Ты - медицинский AI-ассистент клиники Scoliologic, специализирующейся на лечении сколиоза и деформаций позвоночника.

Твои задачи:
- Отвечать на вопросы пациентов о лечении сколиоза
- Давать информацию о корсетах Шено и режиме их ношения
- Объяснять упражнения и методику Шрот
- Напоминать о приёмах и процедурах
- Помогать с общими вопросами о здоровье позвоночника

Важные правила:
- НИКОГДА не ставь диагнозы
- ВСЕГДА рекомендуй консультацию с врачом при серьёзных симптомах
- Отвечай на русском языке, если пользователь пишет на русском
- Будь вежливым, эмпатичным и поддерживающим
- Используй понятный язык, избегай сложных медицинских терминов
- При упоминании боли или острых симптомов - рекомендуй срочную консультацию

Контекст клиники:
- Специализация: сколиоз, кифоз, лордоз
- Методы лечения: корсетотерапия (Шено), ЛФК (Шрот), хирургия
- Возрастная группа пациентов: преимущественно дети и подростки`,
};

// Интерфейсы для Ollama API
export interface OllamaMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  system?: string;
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
    top_p?: number;
    top_k?: number;
  };
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    num_predict?: number;
  };
}

export interface OllamaResponse {
  model: string;
  created_at: string;
  message?: OllamaMessage;
  response?: string;
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModelInfo {
  name: string;
  modified_at: string;
  size: number;
  digest: string;
  details?: {
    format: string;
    family: string;
    parameter_size: string;
    quantization_level: string;
  };
}

/**
 * Проверка доступности Ollama сервера
 */
export async function checkOllamaHealth(): Promise<{
  available: boolean;
  version?: string;
  models?: string[];
  error?: string;
}> {
  try {
    const response = await fetch(`${ollamaConfig.baseUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { available: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();
    const models = data.models?.map((m: OllamaModelInfo) => m.name) || [];

    return {
      available: true,
      models,
    };
  } catch (error: any) {
    console.error("Ollama health check failed:", error);
    return {
      available: false,
      error: error.message,
    };
  }
}

/**
 * Получение списка доступных моделей
 */
export async function listModels(): Promise<OllamaModelInfo[]> {
  try {
    const response = await fetch(`${ollamaConfig.baseUrl}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.models || [];
  } catch (error) {
    console.error("Failed to list Ollama models:", error);
    return [];
  }
}

/**
 * Генерация ответа (простой режим)
 */
export async function generate(
  prompt: string,
  options?: {
    model?: string;
    system?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{
  success: boolean;
  response?: string;
  error?: string;
  duration?: number;
}> {
  const startTime = Date.now();

  try {
    const request: OllamaGenerateRequest = {
      model: options?.model || ollamaConfig.defaultModel,
      prompt,
      system: options?.system || ollamaConfig.systemPrompt,
      stream: false,
      options: {
        temperature: options?.temperature || ollamaConfig.temperature,
        num_predict: options?.maxTokens || ollamaConfig.maxTokens,
      },
    };

    const response = await fetch(`${ollamaConfig.baseUrl}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(ollamaConfig.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data: OllamaResponse = await response.json();

    return {
      success: true,
      response: data.response,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error("Ollama generate error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Чат с историей сообщений
 */
export async function chat(
  messages: OllamaMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): Promise<{
  success: boolean;
  message?: OllamaMessage;
  error?: string;
  duration?: number;
}> {
  const startTime = Date.now();

  try {
    // Добавляем системный промпт в начало
    const messagesWithSystem: OllamaMessage[] = [
      { role: "system", content: ollamaConfig.systemPrompt },
      ...messages,
    ];

    const request: OllamaChatRequest = {
      model: options?.model || ollamaConfig.defaultModel,
      messages: messagesWithSystem,
      stream: false,
      options: {
        temperature: options?.temperature || ollamaConfig.temperature,
        num_predict: options?.maxTokens || ollamaConfig.maxTokens,
      },
    };

    const response = await fetch(`${ollamaConfig.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(ollamaConfig.timeout),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        error: `HTTP ${response.status}: ${errorText}`,
      };
    }

    const data: OllamaResponse = await response.json();

    return {
      success: true,
      message: data.message,
      duration: Date.now() - startTime,
    };
  } catch (error: any) {
    console.error("Ollama chat error:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Стриминг ответа (для real-time отображения)
 */
export async function* streamChat(
  messages: OllamaMessage[],
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  }
): AsyncGenerator<{ token: string; done: boolean }> {
  try {
    const messagesWithSystem: OllamaMessage[] = [
      { role: "system", content: ollamaConfig.systemPrompt },
      ...messages,
    ];

    const request: OllamaChatRequest = {
      model: options?.model || ollamaConfig.defaultModel,
      messages: messagesWithSystem,
      stream: true,
      options: {
        temperature: options?.temperature || ollamaConfig.temperature,
        num_predict: options?.maxTokens || ollamaConfig.maxTokens,
      },
    };

    const response = await fetch(`${ollamaConfig.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(ollamaConfig.timeout),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            const data: OllamaResponse = JSON.parse(line);
            yield {
              token: data.message?.content || "",
              done: data.done,
            };
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } catch (error: any) {
    console.error("Ollama stream error:", error);
    yield { token: "", done: true };
  }
}

/**
 * Контекстно-зависимый ответ для медицинских вопросов
 */
export async function getMedicalResponse(
  patientQuestion: string,
  patientContext?: {
    name?: string;
    diagnosis?: string;
    currentDevice?: string;
    cobbAngle?: number;
    treatmentPlan?: string;
  }
): Promise<{
  success: boolean;
  response?: string;
  error?: string;
}> {
  // Формируем контекстный промпт
  let contextPrompt = "";
  if (patientContext) {
    contextPrompt = `\n\nКонтекст пациента:`;
    if (patientContext.name) contextPrompt += `\n- Имя: ${patientContext.name}`;
    if (patientContext.diagnosis) contextPrompt += `\n- Диагноз: ${patientContext.diagnosis}`;
    if (patientContext.currentDevice) contextPrompt += `\n- Текущее изделие: ${patientContext.currentDevice}`;
    if (patientContext.cobbAngle) contextPrompt += `\n- Угол Кобба: ${patientContext.cobbAngle}°`;
    if (patientContext.treatmentPlan) contextPrompt += `\n- План лечения: ${patientContext.treatmentPlan}`;
  }

  const fullPrompt = `${patientQuestion}${contextPrompt}`;

  return generate(fullPrompt);
}

/**
 * Анализ симптомов и рекомендации
 */
export async function analyzeSymptoms(
  symptoms: string[]
): Promise<{
  success: boolean;
  analysis?: {
    urgency: "low" | "medium" | "high";
    recommendation: string;
    shouldContactDoctor: boolean;
  };
  error?: string;
}> {
  const prompt = `Пациент сообщает о следующих симптомах: ${symptoms.join(", ")}.

Проанализируй симптомы и ответь в формате JSON:
{
  "urgency": "low" | "medium" | "high",
  "recommendation": "краткая рекомендация",
  "shouldContactDoctor": true | false
}

Помни: ты не ставишь диагнозы, только даёшь общие рекомендации.`;

  const result = await generate(prompt, { temperature: 0.3 });

  if (!result.success || !result.response) {
    return { success: false, error: result.error };
  }

  try {
    // Пытаемся извлечь JSON из ответа
    const jsonMatch = result.response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const analysis = JSON.parse(jsonMatch[0]);
      return { success: true, analysis };
    }
    return { success: false, error: "Failed to parse response" };
  } catch {
    return { success: false, error: "Invalid JSON response" };
  }
}

/**
 * Кэш для часто задаваемых вопросов
 */
const faqCache = new Map<string, { response: string; timestamp: number }>();
const FAQ_CACHE_TTL = 3600000; // 1 час

export async function getAnswerWithCache(
  question: string
): Promise<{
  success: boolean;
  response?: string;
  fromCache?: boolean;
  error?: string;
}> {
  // Нормализуем вопрос для кэширования
  const normalizedQuestion = question.toLowerCase().trim();
  
  // Проверяем кэш
  const cached = faqCache.get(normalizedQuestion);
  if (cached && Date.now() - cached.timestamp < FAQ_CACHE_TTL) {
    return {
      success: true,
      response: cached.response,
      fromCache: true,
    };
  }

  // Генерируем новый ответ
  const result = await generate(question);
  
  if (result.success && result.response) {
    // Сохраняем в кэш
    faqCache.set(normalizedQuestion, {
      response: result.response,
      timestamp: Date.now(),
    });
  }

  return {
    success: result.success,
    response: result.response,
    fromCache: false,
    error: result.error,
  };
}

/**
 * Очистка кэша FAQ
 */
export function clearFAQCache(): void {
  faqCache.clear();
}
