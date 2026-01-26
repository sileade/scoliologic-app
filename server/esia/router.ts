/**
 * Express роутер для обработки OAuth 2.0 flow с ЕСИА
 * 
 * БЕЗОПАСНОСТЬ:
 * - State хранится в Redis для поддержки масштабирования
 * - TTL 10 минут для защиты от replay-атак
 * - Fallback на in-memory для локальной разработки
 */

import { Router, Request, Response } from "express";
import { getDb, upsertEsiaUser, getUserByOpenId, ensurePatientExists } from "../db";
import {
  generateState,
  getAuthorizationUrl,
  exchangeCodeForToken,
  getUserInfo,
  decodeIdToken,
  getLogoutUrl,
  isVerificationSufficient,
  isProductionReady,
} from "./service";
import { ESIAUserInfo, ESIAError } from "./config";
import { cacheGet, cacheSet, cacheDel, isRedisConnected } from "../lib/redis";

const router = Router();

// Константы
const STATE_TTL_SECONDS = 600; // 10 минут
const STATE_PREFIX = "esia_state:";

// Fallback хранилище state для локальной разработки (когда Redis недоступен)
const localStateStore = new Map<string, { createdAt: number; returnUrl?: string }>();

// Очистка устаревших state из локального хранилища
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(localStateStore.entries());
  for (const [state, data] of entries) {
    if (now - data.createdAt > STATE_TTL_SECONDS * 1000) {
      localStateStore.delete(state);
    }
  }
}, 60 * 1000);

/**
 * Сохранение state в Redis или локальное хранилище
 */
async function saveState(state: string, returnUrl?: string): Promise<boolean> {
  const data = {
    createdAt: Date.now(),
    returnUrl: returnUrl || "/",
  };
  
  if (isRedisConnected()) {
    const success = await cacheSet(
      `${STATE_PREFIX}${state}`,
      data,
      { ttl: STATE_TTL_SECONDS }
    );
    if (success) {
      console.log(`[ESIA] State saved to Redis: ${state.substring(0, 8)}...`);
      return true;
    }
  }
  
  // Fallback на локальное хранилище
  localStateStore.set(state, data);
  console.warn(`[ESIA] State saved to local storage (Redis unavailable): ${state.substring(0, 8)}...`);
  return true;
}

/**
 * Получение и удаление state из Redis или локального хранилища
 */
async function consumeState(state: string): Promise<{ returnUrl?: string } | null> {
  // Пробуем Redis
  if (isRedisConnected()) {
    const data = await cacheGet<{ createdAt: number; returnUrl?: string }>(
      `${STATE_PREFIX}${state}`
    );
    
    if (data) {
      // Удаляем state после использования (one-time use)
      await cacheDel(`${STATE_PREFIX}${state}`);
      console.log(`[ESIA] State consumed from Redis: ${state.substring(0, 8)}...`);
      return data;
    }
  }
  
  // Fallback на локальное хранилище
  const localData = localStateStore.get(state);
  if (localData) {
    localStateStore.delete(state);
    console.log(`[ESIA] State consumed from local storage: ${state.substring(0, 8)}...`);
    return localData;
  }
  
  return null;
}

/**
 * GET /auth/esia/login
 * Инициирует процесс авторизации через ЕСИА
 */
router.get("/login", async (req: Request, res: Response) => {
  const state = generateState();
  const returnUrl = req.query.returnUrl as string;
  
  // Сохраняем state для проверки при callback
  await saveState(state, returnUrl);
  
  const authUrl = getAuthorizationUrl(state);
  res.redirect(authUrl);
});

/**
 * GET /auth/esia/callback
 * Обрабатывает callback от ЕСИА после авторизации
 */
router.get("/callback", async (req: Request, res: Response) => {
  const { code, state, error, error_description } = req.query;
  
  // Проверка на ошибку от ЕСИА
  if (error) {
    console.error("ESIA error:", error, error_description);
    return res.redirect(`/auth/error?error=${encodeURIComponent(error as string)}`);
  }
  
  // Проверка наличия code и state
  if (!code || !state) {
    return res.redirect("/auth/error?error=missing_params");
  }
  
  // Проверка и потребление state для защиты от CSRF
  const stateData = await consumeState(state as string);
  if (!stateData) {
    console.warn(`[ESIA] Invalid or expired state: ${(state as string).substring(0, 8)}...`);
    return res.redirect("/auth/error?error=invalid_state");
  }
  
  try {
    // Обмен code на access_token
    const tokenResult = await exchangeCodeForToken(code as string, state as string);
    
    if ("error" in tokenResult) {
      console.error("Token exchange error:", tokenResult);
      return res.redirect(`/auth/error?error=${encodeURIComponent(tokenResult.error)}`);
    }
    
    // Декодируем id_token для получения oid
    const idTokenData = decodeIdToken(tokenResult.id_token || "");
    if (!idTokenData?.oid) {
      return res.redirect("/auth/error?error=invalid_token");
    }
    
    // Получаем информацию о пользователе
    const userInfo = await getUserInfo(tokenResult.access_token, idTokenData.oid);
    
    if ("error" in userInfo) {
      console.error("User info error:", userInfo);
      return res.redirect(`/auth/error?error=${encodeURIComponent(userInfo.error)}`);
    }
    
    // Проверяем уровень верификации
    if (!isVerificationSufficient(userInfo.verificationLevel, "standard")) {
      return res.redirect("/auth/error?error=verification_required");
    }
    
    // Создаём или обновляем пользователя в базе данных
    const openId = `esia:${userInfo.oid}`;
    const fullName = [userInfo.lastName, userInfo.firstName, userInfo.middleName]
      .filter(Boolean)
      .join(" ");
    
    // Upsert user
    const db = await getDb();
    if (db) {
      // Создаём пользователя
      const { upsertUser } = await import("../db");
      await upsertUser({
        openId,
        name: fullName,
        email: userInfo.email || null,
        loginMethod: "esia",
        lastSignedIn: new Date(),
      });
      
      // Получаем пользователя
      const user = await getUserByOpenId(openId);
      
      if (user) {
        // Сохраняем данные ЕСИА
        await upsertEsiaUser(user.id, {
          esiaOid: userInfo.oid,
          snils: userInfo.snils,
          inn: userInfo.inn,
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          middleName: userInfo.middleName,
          birthDate: userInfo.birthDate ? new Date(userInfo.birthDate) : undefined,
          gender: userInfo.gender,
          trusted: userInfo.trusted,
        });
        
        // Создаём запись пациента
        await ensurePatientExists(openId, fullName);
      }
    }
    
    // Устанавливаем cookie с сессией (упрощённая версия)
    res.cookie("esia_session", JSON.stringify({
      openId,
      oid: userInfo.oid,
      name: fullName,
      expiresAt: Date.now() + tokenResult.expires_in * 1000,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: tokenResult.expires_in * 1000,
    });
    
    // Редирект на returnUrl или главную страницу
    res.redirect(stateData.returnUrl || "/");
  } catch (error) {
    console.error("ESIA callback error:", error);
    res.redirect("/auth/error?error=server_error");
  }
});

/**
 * GET /auth/esia/logout
 * Выход из системы и ЕСИА
 */
router.get("/logout", async (req: Request, res: Response) => {
  res.clearCookie("esia_session");
  
  const returnUrl = req.query.returnUrl as string || "/";
  
  // Если нужен полный выход из ЕСИА
  if (req.query.esiaLogout === "true") {
    const logoutUrl = getLogoutUrl(`${req.protocol}://${req.get("host")}${returnUrl}`);
    return res.redirect(logoutUrl);
  }
  
  res.redirect(returnUrl);
});

/**
 * GET /auth/esia/status
 * Проверка статуса авторизации
 */
router.get("/status", async (req: Request, res: Response) => {
  const sessionCookie = req.cookies?.esia_session;
  
  if (!sessionCookie) {
    return res.json({ authenticated: false });
  }
  
  try {
    const session = JSON.parse(sessionCookie);
    
    if (session.expiresAt < Date.now()) {
      res.clearCookie("esia_session");
      return res.json({ authenticated: false, reason: "expired" });
    }
    
    res.json({
      authenticated: true,
      provider: "esia",
      name: session.name,
    });
  } catch {
    res.json({ authenticated: false });
  }
});

/**
 * GET /auth/esia/health
 * Проверка готовности ЕСИА интеграции
 */
router.get("/health", async (req: Request, res: Response) => {
  const productionStatus = isProductionReady();
  const redisStatus = isRedisConnected();
  
  res.json({
    esia: {
      productionReady: productionStatus.ready,
      missingConfig: productionStatus.missing,
    },
    redis: {
      connected: redisStatus,
      stateStorage: redisStatus ? "redis" : "local",
    },
    warnings: [
      ...(!productionStatus.ready ? ["ESIA not configured for production"] : []),
      ...(!redisStatus ? ["Redis unavailable, using local state storage (not scalable)"] : []),
    ],
  });
});

export default router;
