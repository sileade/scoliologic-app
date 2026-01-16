import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Mail, Smartphone, Calendar, Check } from "lucide-react";
import { toast } from "sonner";

interface NotificationPreferencesProps {
  children?: React.ReactNode;
}

const REMINDER_INTERVALS = [60, 30, 7, 1] as const;

export function NotificationPreferences({ children }: NotificationPreferencesProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [selectedDays, setSelectedDays] = useState<number[]>([60, 30, 7, 1]);

  const t = {
    title: language === 'ru' ? 'Настройки уведомлений' : 'Notification Settings',
    description: language === 'ru' 
      ? 'Настройте напоминания о событиях реабилитации'
      : 'Configure reminders for rehabilitation events',
    emailNotifications: language === 'ru' ? 'Email уведомления' : 'Email Notifications',
    emailDesc: language === 'ru' 
      ? 'Получать напоминания на email'
      : 'Receive reminders via email',
    pushNotifications: language === 'ru' ? 'Push уведомления' : 'Push Notifications',
    pushDesc: language === 'ru'
      ? 'Получать уведомления в приложении'
      : 'Receive in-app notifications',
    reminderTiming: language === 'ru' ? 'Время напоминаний' : 'Reminder Timing',
    reminderDesc: language === 'ru'
      ? 'Выберите за сколько дней до события получать напоминание'
      : 'Choose how many days before an event to receive a reminder',
    days: language === 'ru' ? 'дней' : 'days',
    day: language === 'ru' ? 'день' : 'day',
    save: language === 'ru' ? 'Сохранить' : 'Save',
    saved: language === 'ru' ? 'Настройки сохранены' : 'Settings saved',
    calendarSync: language === 'ru' ? 'Синхронизация с календарём' : 'Calendar Sync',
    calendarDesc: language === 'ru'
      ? 'Напоминания также добавляются в ваш календарь Google/Apple'
      : 'Reminders are also added to your Google/Apple calendar',
  };

  const getDayLabel = (days: number) => {
    if (language === 'ru') {
      if (days === 1) return '1 день';
      if (days < 5) return `${days} дня`;
      return `${days} дней`;
    }
    return days === 1 ? '1 day' : `${days} days`;
  };

  const toggleDay = (day: number) => {
    setSelectedDays(prev => 
      prev.includes(day) 
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => b - a)
    );
  };

  const handleSave = () => {
    // In production, call API to save preferences
    toast.success(t.saved);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="gap-2">
            <Bell className="w-4 h-4" />
            {t.title}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            {t.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <p className="text-sm text-muted-foreground">
            {t.description}
          </p>

          {/* Email Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{t.emailNotifications}</p>
                <p className="text-xs text-muted-foreground">{t.emailDesc}</p>
              </div>
            </div>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>

          {/* Push Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{t.pushNotifications}</p>
                <p className="text-xs text-muted-foreground">{t.pushDesc}</p>
              </div>
            </div>
            <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
          </div>

          {/* Reminder Timing */}
          <div className="space-y-3">
            <div>
              <p className="font-medium text-sm">{t.reminderTiming}</p>
              <p className="text-xs text-muted-foreground">{t.reminderDesc}</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {REMINDER_INTERVALS.map((days) => (
                <button
                  key={days}
                  onClick={() => toggleDay(days)}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    selectedDays.includes(days)
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="font-medium">{getDayLabel(days)}</span>
                  {selectedDays.includes(days) && (
                    <Check className="w-4 h-4" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Calendar Sync Info */}
          <div className="bg-muted/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">{t.calendarSync}</p>
                <p className="text-xs text-muted-foreground">{t.calendarDesc}</p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <Button onClick={handleSave} className="w-full">
            {t.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
