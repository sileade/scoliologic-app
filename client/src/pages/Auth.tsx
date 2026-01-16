import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
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

  // Main method selection
  if (step === 'method') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <SpineIcon size={32} className="text-accent" />
            </div>
            <h1 className="text-2xl font-bold">Scoliologic</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {language === 'ru' ? 'Личный кабинет пациента' : 'Patient Portal'}
            </p>
          </div>

          <div className="w-full max-w-sm space-y-4">
            {/* Gosuslugi - Primary */}
            <button
              onClick={handleGosuslugiLogin}
              disabled={isLoading}
              className={cn(
                "w-full p-4 rounded-2xl flex items-center gap-4 transition-all",
                "bg-[#0066B3] hover:bg-[#005599] text-white",
                isLoading && "opacity-70"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Shield size={20} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold">{t("auth.gosuslugi")}</p>
                <p className="text-xs text-white/70">{t("auth.gosuslugiDesc")}</p>
              </div>
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">{language === 'ru' ? 'или' : 'or'}</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Alternative methods */}
            <div className="flex gap-3">
              <button 
                onClick={() => setStep('phone')}
                className="flex-1 p-3 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center gap-2 transition-colors"
              >
                <Phone size={18} />
                <span className="text-sm font-medium">{language === 'ru' ? 'Телефон' : 'Phone'}</span>
              </button>
              <button 
                onClick={() => setStep('email')}
                className="flex-1 p-3 rounded-xl bg-muted hover:bg-muted/80 flex items-center justify-center gap-2 transition-colors"
              >
                <Mail size={18} />
                <span className="text-sm font-medium">Email</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-center text-muted-foreground mt-8 max-w-xs">
            {t("auth.terms")}
          </p>
        </div>
      </div>
    );
  }

  // Phone/Email/Code input
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          {/* Back button */}
          <button 
            onClick={() => { 
              setStep(step === 'code' ? (phone ? 'phone' : 'email') : 'method'); 
              setError(null); 
              setCode('');
            }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ChevronLeft size={18} />
            {language === 'ru' ? 'Назад' : 'Back'}
          </button>

          <Card>
            <CardContent className="p-6 space-y-6">
              {/* Icon */}
              <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
                {step === 'code' ? <Lock size={24} className="text-accent" /> : 
                 step === 'phone' ? <Phone size={24} className="text-accent" /> : 
                 <Mail size={24} className="text-accent" />}
              </div>

              {/* Title */}
              <div className="text-center">
                <h2 className="text-xl font-bold">
                  {step === 'code' 
                    ? (language === 'ru' ? 'Введите код' : 'Enter code')
                    : step === 'phone' 
                      ? (language === 'ru' ? 'Вход по телефону' : 'Phone login')
                      : (language === 'ru' ? 'Вход по email' : 'Email login')}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
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
                  className="w-full px-4 py-3 rounded-xl bg-muted border-0 text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-accent"
                  autoFocus
                />
              )}
              {step === 'email' && (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(null); }}
                  placeholder="example@mail.ru"
                  className="w-full px-4 py-3 rounded-xl bg-muted border-0 text-center text-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  autoFocus
                />
              )}
              {step === 'code' && (
                <input
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(null); }}
                  placeholder="000000"
                  className="w-full px-4 py-3 rounded-xl bg-muted border-0 text-center text-2xl font-bold tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-accent"
                  autoFocus
                />
              )}

              {/* Error */}
              {error && (
                <p className="text-sm text-red-500 text-center">{error}</p>
              )}

              {/* Submit */}
              <button
                onClick={step === 'code' ? handleCodeSubmit : step === 'phone' ? handlePhoneSubmit : handleEmailSubmit}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 size={20} className="animate-spin mx-auto" />
                ) : step === 'code' ? (
                  language === 'ru' ? 'Войти' : 'Login'
                ) : (
                  language === 'ru' ? 'Получить код' : 'Get code'
                )}
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
