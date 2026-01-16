import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ShieldIcon, LockIcon, CheckIcon } from "@/components/NotionIcons";
import { Phone, Mail, ArrowRight, Info } from "lucide-react";

export default function Auth() {
  const { t, language } = useLanguage();
  const [isLoading, setIsLoading] = useState(false);

  const handleGosuslugiLogin = () => {
    setIsLoading(true);
    // Редирект на endpoint авторизации через ЕСИА
    window.location.href = "/api/auth/esia/login?returnUrl=/";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 30C10 30 13 20 20 20C27 20 30 10 30 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              <circle cx="10" cy="30" r="3" fill="hsl(75, 100%, 50%)"/>
              <circle cx="30" cy="10" r="3" fill="hsl(75, 100%, 50%)"/>
            </svg>
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
          {/* Title */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl lg:text-3xl font-bold">
              {t("auth.title")}
            </h2>
            <p className="text-muted-foreground">
              {t("auth.subtitle")}
            </p>
          </div>

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
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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
            <button className="w-full btn-scolio-outline flex items-center justify-center gap-3 py-3">
              <Phone size={20} />
              {t("auth.phone")}
            </button>
            <button className="w-full btn-scolio-outline flex items-center justify-center gap-3 py-3">
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
        </div>
      </main>

      {/* Info Banner */}
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
    </div>
  );
}
