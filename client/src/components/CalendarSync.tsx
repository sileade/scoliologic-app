import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "./NotionIcons";
import { toast } from "sonner";

interface CalendarSyncProps {
  children?: React.ReactNode;
}

// Mock calendar subscription URLs (in production, these come from API)
const getCalendarUrls = () => {
  const baseUrl = window.location.origin;
  const token = 'demo-token'; // In production, get from API
  const patientId = 1;
  
  const icsUrl = `${baseUrl}/api/calendar/${patientId}/feed.ics?token=${token}`;
  const webcalUrl = icsUrl.replace(/^https?:/, 'webcal:');
  
  return {
    webcal: webcalUrl,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`,
    apple: webcalUrl,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(icsUrl)}&name=Ortho%20Innovations%20Rehab`,
  };
};

export function CalendarSync({ children }: CalendarSyncProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const urls = getCalendarUrls();

  const t = {
    title: language === 'ru' ? 'Синхронизация календаря' : 'Calendar Sync',
    description: language === 'ru' 
      ? 'Подпишитесь на календарь реабилитации для автоматических обновлений при изменении расписания.'
      : 'Subscribe to your rehabilitation calendar for automatic updates when schedule changes.',
    google: 'Google Calendar',
    apple: 'Apple Calendar',
    outlook: 'Outlook',
    copyLink: language === 'ru' ? 'Скопировать ссылку' : 'Copy Link',
    copied: language === 'ru' ? 'Скопировано!' : 'Copied!',
    howItWorks: language === 'ru' ? 'Как это работает' : 'How it works',
    step1: language === 'ru' 
      ? '1. Выберите ваш календарь ниже'
      : '1. Choose your calendar below',
    step2: language === 'ru'
      ? '2. Подтвердите подписку в приложении календаря'
      : '2. Confirm subscription in your calendar app',
    step3: language === 'ru'
      ? '3. События автоматически обновляются при изменениях'
      : '3. Events auto-update when schedule changes',
    autoSync: language === 'ru' 
      ? 'Автообновление каждый час'
      : 'Auto-refresh every hour',
  };

  const handleGoogleCalendar = () => {
    window.open(urls.google, '_blank');
    toast.success(language === 'ru' ? 'Открыт Google Calendar' : 'Google Calendar opened');
  };

  const handleAppleCalendar = () => {
    window.location.href = urls.apple;
    toast.success(language === 'ru' ? 'Открыт Apple Calendar' : 'Apple Calendar opened');
  };

  const handleOutlook = () => {
    window.open(urls.outlook, '_blank');
    toast.success(language === 'ru' ? 'Открыт Outlook' : 'Outlook opened');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(urls.webcal);
      setCopied(true);
      toast.success(t.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(language === 'ru' ? 'Не удалось скопировать' : 'Failed to copy');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <CalendarIcon size={18} />
            {t.title}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon size={24} className="text-primary" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t.description}
          </p>

          {/* How it works */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm">{t.howItWorks}</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>{t.step1}</li>
              <li>{t.step2}</li>
              <li>{t.step3}</li>
            </ul>
            <p className="text-xs text-primary font-medium pt-1">
              ✓ {t.autoSync}
            </p>
          </div>

          {/* Calendar buttons */}
          <div className="grid gap-2">
            <Button
              onClick={handleGoogleCalendar}
              className="w-full justify-start gap-3 h-12"
              variant="outline"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t.google}
            </Button>

            <Button
              onClick={handleAppleCalendar}
              className="w-full justify-start gap-3 h-12"
              variant="outline"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
              </svg>
              {t.apple}
            </Button>

            <Button
              onClick={handleOutlook}
              className="w-full justify-start gap-3 h-12"
              variant="outline"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.16.154-.352.23-.578.23h-8.547V6.58h8.547c.226 0 .418.077.578.23.158.152.238.347.238.577zM7.387 6.58v12.09H0V6.58h7.387zm7.386 12.09H7.387v-12.09h7.386v12.09zm0-18.67v5.42H0V0h14.773z"/>
                <path fill="#0078D4" d="M7.387 6.58l7.386 5.42-7.386 5.42V6.58z"/>
              </svg>
              {t.outlook}
            </Button>
          </div>

          {/* Copy link */}
          <div className="pt-2 border-t">
            <Button
              onClick={handleCopyLink}
              variant="ghost"
              className="w-full text-sm"
            >
              {copied ? t.copied : t.copyLink}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
