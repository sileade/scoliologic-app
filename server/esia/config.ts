/**
 * Конфигурация интеграции с ЕСИА (Госуслуги)
 * 
 * ЕСИА (Единая система идентификации и аутентификации) - 
 * федеральная государственная информационная система, 
 * обеспечивающая идентификацию и аутентификацию пользователей.
 * 
 * Документация: https://digital.gov.ru/ru/documents/6186/
 */

import { env } from "../_core/env";

export interface ESIAConfig {
  // Идентификатор системы-клиента (мнемоника), зарегистрированной в ЕСИА
  clientId: string;
  // Секрет клиента (для client_secret_post)
  clientSecret: string;
  // URL для перенаправления после авторизации
  redirectUri: string;
  // Запрашиваемые scope (разрешения)
  scope: string[];
  // URL ЕСИА (тестовый или продуктивный)
  esiaUrl: string;
  // Путь к сертификату для подписи запросов
  certificatePath?: string;
  // Путь к приватному ключу
  privateKeyPath?: string;
}

// Тестовый контур ЕСИА
const ESIA_TEST_URL = "https://esia-portal1.test.gosuslugi.ru";
// Продуктивный контур ЕСИА
const ESIA_PROD_URL = "https://esia.gosuslugi.ru";

export const esiaConfig: ESIAConfig = {
  clientId: env.ESIA_CLIENT_ID || "SCOLIOLOGIC",
  clientSecret: env.ESIA_CLIENT_SECRET || "",
  redirectUri: env.ESIA_REDIRECT_URI || "https://app.scoliologic.ru/auth/esia/callback",
  scope: [
    "openid",           // Обязательный scope
    "fullname",         // ФИО
    "birthdate",        // Дата рождения
    "gender",           // Пол
    "snils",            // СНИЛС
    "inn",              // ИНН (опционально)
    "mobile",           // Мобильный телефон
    "email",            // Email
    "id_doc",           // Документ, удостоверяющий личность
    "medical_doc",      // Медицинские документы (полис ОМС)
  ],
  esiaUrl: env.ESIA_ENV === "production" ? ESIA_PROD_URL : ESIA_TEST_URL,
  certificatePath: env.ESIA_CERT_PATH,
  privateKeyPath: env.ESIA_KEY_PATH,
};

// Endpoints ЕСИА
export const esiaEndpoints = {
  authorize: "/aas/oauth2/v2/ac",
  token: "/aas/oauth2/v3/te",
  userInfo: "/rs/prns",
  logout: "/idp/ext/Logout",
};

// Типы данных пользователя из ЕСИА
export interface ESIAUserInfo {
  // Уникальный идентификатор пользователя в ЕСИА
  oid: string;
  // ФИО
  firstName: string;
  lastName: string;
  middleName?: string;
  // Дата рождения
  birthDate?: string;
  // Пол (M/F)
  gender?: string;
  // СНИЛС
  snils?: string;
  // ИНН
  inn?: string;
  // Контакты
  mobile?: string;
  email?: string;
  // Документ
  docType?: string;
  docSeries?: string;
  docNumber?: string;
  docIssueDate?: string;
  docIssueId?: string;
  // Полис ОМС
  omsNumber?: string;
  omsCompany?: string;
  // Верифицирован ли аккаунт
  trusted?: boolean;
  // Уровень подтверждения (simplified, standard, confirmed)
  verificationLevel?: "simplified" | "standard" | "confirmed";
}

export interface ESIATokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope: string;
  state: string;
}

export interface ESIAError {
  error: string;
  error_description?: string;
}
