import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldIcon, LockIcon, CheckIcon, SpineIcon } from "@/components/NotionIcons";
import { Phone, Mail, ArrowRight, Info, ChevronLeft, Loader2, AlertCircle } from "lucide-react";

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
    setError(null);
    // Редирект на endpoint авторизации через ЕСИА
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

  const handlePhoneSubmit = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 11) {
      setError(language === 'ru' ? 'Введите корректный номер телефона' : 'Enter a valid phone number');
      return;
    }
    setIsLoading(true);
    setError(null);
    
    // Имитация отправки SMS
    setTimeout(() => {
      setIsLoading(false);
      setStep('code');
    }, 1500);
  };

  const handleEmailSubmit = async () => {
    if (!email.includes('@') || !email.includes('.')) {
      setError(language === 'ru' ? 'Введите корректный email' : 'Enter a valid email');
      return;
    }
    setIsLoading(true);
    setError(null);
    
    // Имитация отправки кода на email
    setTimeout(() => {
      setIsLoading(false);
      setStep('code');
    }, 1500);
  };

  const handleCodeSubmit = async () => {
    if (code.length !== 6) {
      setError(language === 'ru' ? 'Введите 6-значный код' : 'Enter 6-digit code');
      return;
    }
    setIsLoading(true);
    setError(null);
    
    // Имитация верификации
    setTimeout(() => {
      setIsLoading(false);
      window.location.href = '/';
    }, 1500);
  };

  const features = [
    {
      icon: ShieldIcon,
      title: language === 'ru' ? 'Безопасный вход' : 'Secure Login',
      description: language === 'ru' 
        ? 'Авторизация через государственный портал' 
        : 'Authorization through government portal',
    },
    {
      icon: LockIcon,
      title: language === 'ru' ? 'Защита данных' : 'Data Protection',
      description: language === 'ru' 
        ? 'Ваши данные защищены по стандартам ФСБ' 
        : 'Your data is protected by FSB standards',
    },
    {
      icon: CheckIcon,
      title: language === 'ru' ? 'Верификация' : 'Verification',
      description: language === 'ru' 
        ? 'Подтверждённая учётная запись' 
        : 'Verified account',
    },
  ];

  const renderMethodSelection = () => (
    <>
      {/* Gosuslugi Button */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <button
            onClick={handleGosuslugiLogin}
            disabled={isLoading}
            className={cn(
              "w-full p-5 flex items-center gap-4 transition-all",
              "bg-[#0066B3] hover:bg-[#005599] text-white",
              isLoading && "opacity-70 cursor-not-allowed"
            )}
          >
            {/* Gosuslugi Logo */}
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2z" fill="#fff"/>
                <path d="M16 4c6.627 0 12 5.373 12 12s-5.373 12-12 12S4 22.627 4 16 9.373 4 16 4z" fill="#0066B3"/>
                <path d="M12 11h8v2h-8v-2zm0 4h8v2h-8v-2zm0 4h5v2h-5v-2z" fill="#fff"/>
              </svg>
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
        </CardContent>
      </Card>

      {/* Divider */}
      <div className="flex items-center gap-4">
        <div className="flex-1 h-px bg-border" />
        <span className="text-sm text-muted-foreground">
          {language === 'ru' ? 'или' : 'or'}
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Alternative Login Options */}
      <div className="space-y-3">
        <button 
          onClick={() => { setStep('phone'); setError(null); }}
          className="w-full btn-scolio-outline flex items-center justify-center gap-3 py-3"
        >
          <Phone size={20} />
          {t("auth.phone")}
        </button>
        <button 
          onClick={() => { setStep('email'); setError(null); }}
          className="w-full btn-scolio-outline flex items-center justify-center gap-3 py-3"
        >
          <Mail size={20} />
          {t("auth.email")}
        </button>
      </div>

      {/* Features */}
      <div className="grid grid-cols-3 gap-3 pt-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <div key={index} className="text-center space-y-2">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mx-auto">
                <Icon size={20} className="text-accent" />
              </div>
              <p className="text-xs font-medium">{feature.title}</p>
            </div>
          );
        })}
      </div>

      {/* Terms */}
      <p className="text-xs text-center text-muted-foreground">
        {t("auth.terms")}
      </p>
    </>
  );

  const renderPhoneInput = () => (
    <div className="space-y-6">
      <button 
        onClick={() => { setStep('method'); setError(null); setPhone(''); }}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft size={18} />
        {language === 'ru' ? 'Назад' : 'Back'}
      </button>

      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <Phone size={28} className="text-accent" />
        </div>
        <h3 className="text-xl font-bold">
          {language === 'ru' ? 'Вход по телефону' : 'Phone Login'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {language === 'ru' ? 'Введите номер телефона для получения кода' : 'Enter phone number to receive code'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          {language === 'ru' ? 'Номер телефона' : 'Phone number'}
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          placeholder="+7 (___) ___-__-__"
          className="input-scolio text-lg"
          autoFocus
        />
      </div>

      <button
        onClick={handlePhoneSubmit}
        disabled={isLoading || phone.replace(/\D/g, '').length !== 11}
        className="w-full btn-scolio-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 size={20} className="animate-spin mx-auto" />
        ) : (
          language === 'ru' ? 'Получить код' : 'Get code'
        )}
      </button>
    </div>
  );

  const renderEmailInput = () => (
    <div className="space-y-6">
      <button 
        onClick={() => { setStep('method'); setError(null); setEmail(''); }}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft size={18} />
        {language === 'ru' ? 'Назад' : 'Back'}
      </button>

      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
          <Mail size={28} className="text-accent" />
        </div>
        <h3 className="text-xl font-bold">
          {language === 'ru' ? 'Вход по email' : 'Email Login'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {language === 'ru' ? 'Введите email для получения кода' : 'Enter email to receive code'}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">
          {language === 'ru' ? 'Email адрес' : 'Email address'}
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="example@mail.ru"
          className="input-scolio text-lg"
          autoFocus
        />
      </div>

      <button
        onClick={handleEmailSubmit}
        disabled={isLoading || !email.includes('@')}
        className="w-full btn-scolio-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 size={20} className="animate-spin mx-auto" />
        ) : (
          language === 'ru' ? 'Получить код' : 'Get code'
        )}
      </button>
    </div>
  );

  const renderCodeInput = () => (
    <div className="space-y-6">
      <button 
        onClick={() => { 
          setStep(phone ? 'phone' : 'email'); 
          setCode(''); 
          setError(null); 
        }}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft size={18} />
        {language === 'ru' ? 'Назад' : 'Back'}
      </button>

      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-4">
          <CheckIcon size={28} className="text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-bold">
          {language === 'ru' ? 'Введите код' : 'Enter Code'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {language === 'ru' ? 'Код отправлен на' : 'Code sent to'}
        </p>
        <p className="font-semibold text-accent">
          {phone || email}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-2 text-center">
          {language === 'ru' ? 'Код подтверждения' : 'Verification code'}
        </label>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="• • • • • •"
          className="input-scolio text-center text-2xl tracking-[0.5em] font-mono"
          autoFocus
          maxLength={6}
        />
      </div>

      <button
        onClick={handleCodeSubmit}
        disabled={isLoading || code.length !== 6}
        className="w-full btn-scolio-primary disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 size={20} className="animate-spin mx-auto" />
        ) : (
          language === 'ru' ? 'Подтвердить' : 'Confirm'
        )}
      </button>

      <button className="w-full text-sm text-accent hover:underline">
        {language === 'ru' ? 'Отправить код повторно' : 'Resend code'}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <SpineIcon size={24} className="text-accent-foreground" />
          </div>
          <div>
            <h1 className="font-bold text-lg">Scoliologic</h1>
            <p className="text-xs text-muted-foreground">
              {language === 'ru' ? 'Личный кабинет пациента' : 'Patient Portal'}
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          {/* Title - only on method selection */}
          {step === 'method' && (
            <div className="text-center space-y-2">
              <h2 className="text-2xl lg:text-3xl font-bold">
                {t("auth.title")}
              </h2>
              <p className="text-muted-foreground">
                {t("auth.subtitle")}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {/* Content based on step */}
          {step === 'method' && renderMethodSelection()}
          {step === 'phone' && renderPhoneInput()}
          {step === 'email' && renderEmailInput()}
          {step === 'code' && renderCodeInput()}
        </div>
      </main>

      {/* Info Banner - only on method selection */}
      {step === 'method' && (
        <div className="p-6">
          <Card className="bg-accent/5 border-accent/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Info size={20} className="text-accent flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-accent mb-1">
                  {language === 'ru' ? 'Почему Госуслуги?' : 'Why Gosuslugi?'}
                </p>
                <p className="text-muted-foreground">
                  {language === 'ru' 
                    ? 'Вход через Госуслуги позволяет автоматически получить ваши данные (ФИО, СНИЛС, полис ОМС) и упрощает оформление документов для СФР.'
                    : 'Login via Gosuslugi allows automatic retrieval of your data (name, SNILS, OMS policy) and simplifies SFR document processing.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
