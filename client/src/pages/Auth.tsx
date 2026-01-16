/**
 * Страница авторизации
 * Упрощённая версия с акцентом на Госуслуги
 */
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { SpineIcon } from "@/components/NotionIcons";
import { Phone, Mail, ArrowRight, ChevronLeft, Loader2, Shield, Lock } from "lucide-react";

type AuthStep = 'method' | 'phone' | 'email' | 'code';

export default function Auth() {
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<AuthStep>('method');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleGosuslugiLogin = () => {
    setIsLoading(true);
    window.location.href = "/api/auth/esia/login?returnUrl=/";
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.length <= 1) return '+7';
    if (digits.length <= 4) return `+7 (${digits.slice(1)}`;
    if (digits.length <= 7) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4)}`;
    if (digits.length <= 9) return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  };

  const handlePhoneSubmit = () => {
    if (phone.replace(/\D/g, '').length !== 11) {
      setError(language === 'ru' ? 'Введите корректный номер' : 'Enter valid number');
      return;
    }
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); setStep('code'); }, 1500);
  };

  const handleEmailSubmit = () => {
    if (!email.includes('@')) {
      setError(language === 'ru' ? 'Введите корректный email' : 'Enter valid email');
      return;
    }
    setIsLoading(true);
    setTimeout(() => { setIsLoading(false); setStep('code'); }, 1500);
  };

  const handleCodeSubmit = () => {
    if (code.length !== 6) {
      setError(language === 'ru' ? 'Введите 6-значный код' : 'Enter 6-digit code');
      return;
    }
    setIsLoading(true);
    setTimeout(() => { window.location.href = '/'; }, 1500);
  };

  const haptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // Main method selection
  if (step === 'method') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          {/* Logo */}
          <div className="mb-10 text-center">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto mb-4">
              <SpineIcon size={32} className="text-teal-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Scoliologic</h1>
            <p className="text-sm text-gray-500 mt-1">
              {language === 'ru' ? 'Личный кабинет пациента' : 'Patient Portal'}
            </p>
          </div>

          <div className="w-full max-w-sm space-y-6">
            {/* Gosuslugi - Primary & Prominent */}
            <button
              onClick={() => {
                haptic();
                handleGosuslugiLogin();
              }}
              disabled={isLoading}
              className={cn(
                "w-full p-5 rounded-2xl flex items-center gap-4 transition-all shadow-lg",
                "bg-[#0066B3] hover:bg-[#005599] text-white",
                "active:scale-[0.98]",
                isLoading && "opacity-70"
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Shield size={24} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-lg">{t("auth.gosuslugi")}</p>
                <p className="text-sm text-white/80">{t("auth.gosuslugiDesc")}</p>
              </div>
              {isLoading ? (
                <Loader2 size={24} className="animate-spin" />
              ) : (
                <ArrowRight size={24} />
              )}
            </button>

            {/* Security badge */}
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <Lock size={12} />
              <span>{language === 'ru' ? 'Безопасный вход через Госуслуги' : 'Secure login via Gosuslugi'}</span>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">
                {language === 'ru' ? 'или' : 'or'}
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Alternative methods - simplified */}
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  haptic();
                  setStep('phone');
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-white border border-gray-200 flex items-center justify-center gap-2 transition-all hover:bg-gray-50 active:scale-[0.98] shadow-sm"
              >
                <Phone size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  {language === 'ru' ? 'Телефон' : 'Phone'}
                </span>
              </button>
              <button 
                onClick={() => {
                  haptic();
                  setStep('email');
                }}
                className="flex-1 py-3 px-4 rounded-xl bg-white border border-gray-200 flex items-center justify-center gap-2 transition-all hover:bg-gray-50 active:scale-[0.98] shadow-sm"
              >
                <Mail size={18} className="text-gray-600" />
                <span className="text-sm font-medium text-gray-700">Email</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-[11px] text-center text-gray-400 mt-10 max-w-xs leading-relaxed">
            {t("auth.terms")}
          </p>
        </div>
      </div>
    );
  }

  // Phone/Email/Code input - simplified
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Back button */}
          <button 
            onClick={() => { 
              haptic();
              setStep(step === 'code' ? (phone ? 'phone' : 'email') : 'method'); 
              setError(null); 
              setCode('');
            }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-8 transition-colors"
          >
            <ChevronLeft size={18} />
            {language === 'ru' ? 'Назад' : 'Back'}
          </button>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-6">
            {/* Icon */}
            <div className="w-14 h-14 rounded-2xl bg-teal-100 flex items-center justify-center mx-auto">
              {step === 'code' ? (
                <Lock size={24} className="text-teal-600" />
              ) : step === 'phone' ? (
                <Phone size={24} className="text-teal-600" />
              ) : (
                <Mail size={24} className="text-teal-600" />
              )}
            </div>

            {/* Title */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">
                {step === 'code' 
                  ? (language === 'ru' ? 'Введите код' : 'Enter code')
                  : step === 'phone' 
                    ? (language === 'ru' ? 'Вход по телефону' : 'Phone login')
                    : (language === 'ru' ? 'Вход по email' : 'Email login')}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {step === 'code' 
                  ? (language === 'ru' ? `Код отправлен на ${phone || email}` : `Code sent to ${phone || email}`)
                  : (language === 'ru' ? 'Мы отправим код подтверждения' : 'We will send a verification code')}
              </p>
            </div>

            {/* Input */}
            {step === 'phone' && (
              <input
                type="tel"
                value={phone}
                onChange={(e) => { setPhone(formatPhone(e.target.value)); setError(null); }}
                placeholder="+7 (___) ___-__-__"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                autoFocus
              />
            )}
            {step === 'email' && (
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(null); }}
                placeholder="example@mail.ru"
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-center text-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                autoFocus
              />
            )}
            {step === 'code' && (
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                placeholder="000000"
                className="w-full px-4 py-4 rounded-xl bg-gray-50 border border-gray-200 text-center text-2xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                autoFocus
              />
            )}

            {/* Error */}
            {error && (
              <p className="text-sm text-red-500 text-center">{error}</p>
            )}

            {/* Submit */}
            <button
              onClick={() => {
                haptic();
                if (step === 'code') handleCodeSubmit();
                else if (step === 'phone') handlePhoneSubmit();
                else handleEmailSubmit();
              }}
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-teal-500 text-white font-semibold hover:bg-teal-600 transition-colors disabled:opacity-50 active:scale-[0.98]"
            >
              {isLoading ? (
                <Loader2 size={20} className="animate-spin mx-auto" />
              ) : step === 'code' ? (
                language === 'ru' ? 'Войти' : 'Login'
              ) : (
                language === 'ru' ? 'Получить код' : 'Get code'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
