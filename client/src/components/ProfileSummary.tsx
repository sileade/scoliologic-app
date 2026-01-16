import { useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Progress } from "@/components/ui/progress";
import { 
  ProfileIcon, 
  TrophyIcon, 
  ShieldIcon, 
  CalendarIcon,
  ChevronRightIcon,
  SettingsIcon
} from "./NotionIcons";

interface ProfileSummaryProps {
  children: React.ReactNode;
}

const profileData = {
  name: "Alex Johnson",
  email: "alex.johnson@email.com",
  phone: "+7 (495) 123-45-67",
  avatar: null,
  daysSinceStart: 45,
  completedExercises: 156,
  totalMinutes: 2340,
  currentStreak: 12,
  prosthesis: {
    model: "Ottobock Genium X3",
    installDate: "2024-10-26",
    warrantyUntil: "2026-10-26",
    status: "optimal"
  },
  nextAppointment: {
    doctor: "Dr. Smith",
    date: "Dec 11, 2024",
    time: "10:00"
  },
  achievements: [
    { id: 1, title: { ru: "Первые шаги", en: "First Steps" }, icon: "🚶" },
    { id: 2, title: { ru: "7 дней подряд", en: "7 Day Streak" }, icon: "🔥" },
    { id: 3, title: { ru: "100 упражнений", en: "100 Exercises" }, icon: "💪" },
  ]
};

export function ProfileSummary({ children }: ProfileSummaryProps) {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  const t = {
    profile: language === 'ru' ? 'Профиль' : 'Profile',
    recoveryProgress: language === 'ru' ? 'Прогресс восстановления' : 'Recovery Progress',
    day: language === 'ru' ? 'день' : 'day',
    exercises: language === 'ru' ? 'упражнений' : 'exercises',
    minutes: language === 'ru' ? 'минут' : 'minutes',
    streak: language === 'ru' ? 'дней подряд' : 'day streak',
    prosthesis: language === 'ru' ? 'Мой протез' : 'My Prosthesis',
    warranty: language === 'ru' ? 'Гарантия до' : 'Warranty until',
    status: language === 'ru' ? 'Статус' : 'Status',
    optimal: language === 'ru' ? 'Оптимально' : 'Optimal',
    nextAppointment: language === 'ru' ? 'Следующий приём' : 'Next Appointment',
    achievements: language === 'ru' ? 'Достижения' : 'Achievements',
    viewFullProfile: language === 'ru' ? 'Открыть полный профиль' : 'View Full Profile',
    settings: language === 'ru' ? 'Настройки' : 'Settings',
  };

  // Calculate progress percentage (assuming 180 day recovery)
  const progressPercent = Math.min((profileData.daysSinceStart / 180) * 100, 100);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <ProfileIcon size={24} className="text-primary" />
            {t.profile}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6">
          {/* User Info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <ProfileIcon size={32} className="text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg">{profileData.name}</h3>
              <p className="text-sm text-muted-foreground">{profileData.email}</p>
              <p className="text-sm text-muted-foreground">{profileData.phone}</p>
            </div>
          </div>

          {/* Recovery Progress */}
          <div className="bg-primary/5 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold">{t.recoveryProgress}</span>
              <span className="text-primary font-bold">{t.day} {profileData.daysSinceStart}</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="text-center">
                <p className="text-xl font-bold text-primary">{profileData.completedExercises}</p>
                <p className="text-xs text-muted-foreground">{t.exercises}</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-primary">{profileData.totalMinutes}</p>
                <p className="text-xs text-muted-foreground">{t.minutes}</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-orange-500">{profileData.currentStreak}</p>
                <p className="text-xs text-muted-foreground">{t.streak}</p>
              </div>
            </div>
          </div>

          {/* Prosthesis Info */}
          <Link href="/prosthesis" onClick={() => setOpen(false)}>
            <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 card-interactive">
              <div className="flex items-center gap-3 mb-2">
                <ShieldIcon size={20} className="text-green-600" />
                <span className="font-semibold">{t.prosthesis}</span>
              </div>
              <p className="text-sm font-medium">{profileData.prosthesis.model}</p>
              <div className="flex items-center justify-between mt-2 text-sm">
                <span className="text-muted-foreground">{t.warranty}</span>
                <span className="font-medium">{profileData.prosthesis.warrantyUntil}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t.status}</span>
                <span className="text-green-600 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {t.optimal}
                </span>
              </div>
            </div>
          </Link>

          {/* Next Appointment */}
          <Link href="/rehabilitation" onClick={() => setOpen(false)}>
            <div className="bg-primary/5 rounded-xl p-4 card-interactive">
              <div className="flex items-center gap-3 mb-2">
                <CalendarIcon size={20} className="text-primary" />
                <span className="font-semibold">{t.nextAppointment}</span>
              </div>
              <p className="font-medium">{profileData.nextAppointment.doctor}</p>
              <p className="text-sm text-muted-foreground">
                {profileData.nextAppointment.date} · {profileData.nextAppointment.time}
              </p>
            </div>
          </Link>

          {/* Achievements */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrophyIcon size={20} className="text-amber-500" />
              <span className="font-semibold">{t.achievements}</span>
            </div>
            <div className="flex gap-2">
              {profileData.achievements.map((achievement) => (
                <div 
                  key={achievement.id}
                  className="flex-1 bg-muted/50 rounded-lg p-3 text-center"
                >
                  <span className="text-2xl">{achievement.icon}</span>
                  <p className="text-xs mt-1 font-medium">{achievement.title[language]}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Link href="/profile" onClick={() => setOpen(false)}>
              <button className="w-full flex items-center justify-between p-4 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity">
                {t.viewFullProfile}
                <ChevronRightIcon size={20} />
              </button>
            </Link>
            <Link href="/settings" onClick={() => setOpen(false)}>
              <button className="w-full flex items-center justify-between p-4 rounded-xl bg-muted font-medium hover:bg-muted/80 transition-colors">
                <span className="flex items-center gap-2">
                  <SettingsIcon size={18} />
                  {t.settings}
                </span>
                <ChevronRightIcon size={20} />
              </button>
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
