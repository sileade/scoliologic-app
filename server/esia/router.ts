/**
 * Express роутер для обработки OAuth 2.0 flow с ЕСИА
 */

import { Router, Request, Response } from "express";
import { db } from "../db";
import { patients } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
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
import { createSession, destroySession } from "../_core/session";

const router = Router();

// Хранилище state для защиты от CSRF (в продакшене использовать Redis)
const stateStore = new Map<string, { createdAt: number; returnUrl?: string }>();

// Очистка устаревших state (старше 10 минут)
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of stateStore.entries()) {
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
    
    // Ищем или создаём пользователя в базе данных
    let patient = await db.query.patients.findFirst({
      where: eq(patients.esiaOid, userInfo.oid),
    });
    
    if (!patient) {
      // Проверяем по СНИЛС
      if (userInfo.snils) {
        patient = await db.query.patients.findFirst({
          where: eq(patients.snils, userInfo.snils),
        });
      }
      
      if (!patient) {
        // Создаём нового пациента
        const [newPatient] = await db
          .insert(patients)
          .values({
            esiaOid: userInfo.oid,
            firstName: userInfo.firstName,
            lastName: userInfo.lastName,
            middleName: userInfo.middleName,
            birthDate: userInfo.birthDate ? new Date(userInfo.birthDate) : null,
            gender: userInfo.gender === "M" ? "male" : userInfo.gender === "F" ? "female" : null,
            snils: userInfo.snils,
            inn: userInfo.inn,
            phone: userInfo.mobile,
            email: userInfo.email,
            omsNumber: userInfo.omsNumber,
            verificationLevel: userInfo.verificationLevel,
            isVerified: userInfo.trusted || false,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        
        patient = newPatient;
      } else {
        // Обновляем существующего пациента данными из ЕСИА
        await db
          .update(patients)
          .set({
            esiaOid: userInfo.oid,
            firstName: userInfo.firstName,
            lastName: userInfo.lastName,
            middleName: userInfo.middleName,
            phone: userInfo.mobile || patient.phone,
            email: userInfo.email || patient.email,
            verificationLevel: userInfo.verificationLevel,
            isVerified: userInfo.trusted || false,
            updatedAt: new Date(),
          })
          .where(eq(patients.id, patient.id));
      }
    } else {
      // Обновляем данные при каждом входе
      await db
        .update(patients)
        .set({
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          middleName: userInfo.middleName,
          phone: userInfo.mobile || patient.phone,
          email: userInfo.email || patient.email,
          verificationLevel: userInfo.verificationLevel,
          isVerified: userInfo.trusted || false,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(patients.id, patient.id));
    }
    
    // Создаём сессию
    const session = await createSession({
      userId: patient.id,
      userType: "patient",
      esiaOid: userInfo.oid,
      accessToken: tokenResult.access_token,
      expiresIn: tokenResult.expires_in,
    });
    
    // Устанавливаем cookie с сессией
    res.cookie("session", session.token, {
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
  const sessionToken = req.cookies?.session;
  
  if (sessionToken) {
    await destroySession(sessionToken);
    res.clearCookie("session");
  }
  
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
  const sessionToken = req.cookies?.session;
  
  if (!sessionToken) {
    return res.json({ authenticated: false });
  }
  
  // Здесь должна быть проверка сессии
  // Для демонстрации возвращаем базовый ответ
  res.json({
    authenticated: true,
    provider: "esia",
  });
});

export default router;
