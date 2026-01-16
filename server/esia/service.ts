/**
 * Сервис для работы с ЕСИА (Госуслуги)
 * 
 * Реализует OAuth 2.0 + OpenID Connect flow для авторизации
 * через Единую систему идентификации и аутентификации.
 */

import crypto from "crypto";
import { esiaConfig, esiaEndpoints, ESIAUserInfo, ESIATokenResponse, ESIAError } from "./config";

/**
 * Генерация state параметра для защиты от CSRF
 */
export function generateState(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Генерация timestamp в формате ЕСИА
 */
function getTimestamp(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "+0000");
}

/**
 * Создание client_secret для подписи запроса
 * В реальной реализации здесь должна быть подпись с использованием
 * сертификата, зарегистрированного в ЕСИА
 */
function createClientSecret(scope: string, timestamp: string, clientId: string, state: string): string {
  // Для тестового контура используем простой client_secret
  // В продакшене нужно использовать PKCS#7 подпись
  if (esiaConfig.clientSecret) {
    return esiaConfig.clientSecret;
  }
  
  // Формируем строку для подписи
  const message = `${scope}${timestamp}${clientId}${state}`;
  
  // В реальной реализации здесь подпись через crypto.sign с приватным ключом
  // Для демонстрации используем HMAC
  return crypto
    .createHmac("sha256", esiaConfig.clientSecret || "demo-secret")
    .update(message)
    .digest("base64");
}

/**
 * Получение URL для авторизации в ЕСИА
 */
export function getAuthorizationUrl(state: string): string {
  const timestamp = getTimestamp();
  const scope = esiaConfig.scope.join(" ");
  const clientSecret = createClientSecret(scope, timestamp, esiaConfig.clientId, state);
  
  const params = new URLSearchParams({
    client_id: esiaConfig.clientId,
    client_secret: clientSecret,
    redirect_uri: esiaConfig.redirectUri,
    scope: scope,
    response_type: "code",
    state: state,
    timestamp: timestamp,
    access_type: "online",
  });
  
  return `${esiaConfig.esiaUrl}${esiaEndpoints.authorize}?${params.toString()}`;
}

/**
 * Обмен authorization code на access token
 */
export async function exchangeCodeForToken(
  code: string,
  state: string
): Promise<ESIATokenResponse | ESIAError> {
  const timestamp = getTimestamp();
  const scope = esiaConfig.scope.join(" ");
  const clientSecret = createClientSecret(scope, timestamp, esiaConfig.clientId, state);
  
  const params = new URLSearchParams({
    client_id: esiaConfig.clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code: code,
    state: state,
    redirect_uri: esiaConfig.redirectUri,
    scope: scope,
    timestamp: timestamp,
    token_type: "Bearer",
  });
  
  try {
    const response = await fetch(`${esiaConfig.esiaUrl}${esiaEndpoints.token}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return data as ESIAError;
    }
    
    return data as ESIATokenResponse;
  } catch (error) {
    console.error("ESIA token exchange error:", error);
    return {
      error: "network_error",
      error_description: "Failed to connect to ESIA",
    };
  }
}

/**
 * Получение информации о пользователе из ЕСИА
 */
export async function getUserInfo(
  accessToken: string,
  oid: string
): Promise<ESIAUserInfo | ESIAError> {
  try {
    // Получаем основную информацию о пользователе
    const userResponse = await fetch(
      `${esiaConfig.esiaUrl}${esiaEndpoints.userInfo}/${oid}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!userResponse.ok) {
      return {
        error: "user_info_error",
        error_description: "Failed to get user info from ESIA",
      };
    }
    
    const userData = await userResponse.json();
    
    // Получаем контактные данные
    const contactsResponse = await fetch(
      `${esiaConfig.esiaUrl}${esiaEndpoints.userInfo}/${oid}/ctts`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    let contacts: any[] = [];
    if (contactsResponse.ok) {
      const contactsData = await contactsResponse.json();
      contacts = contactsData.elements || [];
    }
    
    // Получаем документы
    const docsResponse = await fetch(
      `${esiaConfig.esiaUrl}${esiaEndpoints.userInfo}/${oid}/docs`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    let docs: any[] = [];
    if (docsResponse.ok) {
      const docsData = await docsResponse.json();
      docs = docsData.elements || [];
    }
    
    // Формируем объект пользователя
    const mobile = contacts.find((c: any) => c.type === "MBT");
    const email = contacts.find((c: any) => c.type === "EML");
    const passport = docs.find((d: any) => d.type === "RF_PASSPORT");
    const oms = docs.find((d: any) => d.type === "MDCL_PLCY");
    
    return {
      oid: oid,
      firstName: userData.firstName || "",
      lastName: userData.lastName || "",
      middleName: userData.middleName,
      birthDate: userData.birthDate,
      gender: userData.gender,
      snils: userData.snils,
      inn: userData.inn,
      mobile: mobile?.value,
      email: email?.value,
      docType: passport?.type,
      docSeries: passport?.series,
      docNumber: passport?.number,
      docIssueDate: passport?.issueDate,
      docIssueId: passport?.issueId,
      omsNumber: oms?.number,
      omsCompany: oms?.medicalOrg,
      trusted: userData.trusted,
      verificationLevel: userData.verifying?.level,
    };
  } catch (error) {
    console.error("ESIA user info error:", error);
    return {
      error: "network_error",
      error_description: "Failed to get user info from ESIA",
    };
  }
}

/**
 * Декодирование JWT токена (id_token) от ЕСИА
 */
export function decodeIdToken(idToken: string): { oid: string; [key: string]: any } | null {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf-8")
    );
    
    return {
      oid: payload.sub || payload.urn_esia_sbj_id,
      ...payload,
    };
  } catch (error) {
    console.error("Failed to decode id_token:", error);
    return null;
  }
}

/**
 * Получение URL для выхода из ЕСИА
 */
export function getLogoutUrl(redirectUrl: string): string {
  const params = new URLSearchParams({
    client_id: esiaConfig.clientId,
    redirect_url: redirectUrl,
  });
  
  return `${esiaConfig.esiaUrl}${esiaEndpoints.logout}?${params.toString()}`;
}

/**
 * Проверка уровня верификации пользователя
 * Для медицинских приложений рекомендуется уровень "confirmed"
 */
export function isVerificationSufficient(
  level: ESIAUserInfo["verificationLevel"],
  requiredLevel: "simplified" | "standard" | "confirmed" = "standard"
): boolean {
  const levels = ["simplified", "standard", "confirmed"];
  const userLevelIndex = levels.indexOf(level || "simplified");
  const requiredLevelIndex = levels.indexOf(requiredLevel);
  
  return userLevelIndex >= requiredLevelIndex;
}
