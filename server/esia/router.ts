/**
 * Express роутер для обработки OAuth 2.0 flow с ЕСИА
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
} from "./service";
import { ESIAUserInfo, ESIAError } from "./config";

const router = Router();

// Хранилище state для защиты от CSRF (в продакшене использовать Redis)
const stateStore = new Map<string, { createdAt: number; returnUrl?: string }>();

// Очистка устаревших state (старше 10 минут)
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(stateStore.entries());
  for (const [state, data] of entries) {
    if (now - data.createdAt > 10 * 60 * 1000) {
      stateStore.delete(state);
    }
  }
}, 60 * 1000);

/**
 * GET /auth/esia/login
 * Инициирует процесс авторизации через ЕСИА
 */
router.get("/login", (req: Request, res: Response) => {
  const state = generateState();
  const returnUrl = req.query.returnUrl as string;
  
  // Сохраняем state для проверки при callback
  stateStore.set(state, {
    createdAt: Date.now(),
    returnUrl: returnUrl || "/",
  });
  
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
  
  // Проверка state для защиты от CSRF
  const stateData = stateStore.get(state as string);
  if (!stateData) {
    return res.redirect("/auth/error?error=invalid_state");
  }
  stateStore.delete(state as string);
  
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

export default router;
