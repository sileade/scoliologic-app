import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { CalendarSync } from "@/components/CalendarSync";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { Bell, Moon, Globe, Lock, HelpCircle, FileText, LogOut, ChevronRight, Mail, Smartphone, Dumbbell, Megaphone, Shield, Key, Calendar, Loader2 } from "lucide-react";

export default function Settings() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { isSupported, isEnabled, isLoading, enableNotifications, disableNotifications } = usePushNotifications();

  const handlePushToggle = async (checked: boolean) => {
    if (checked) {
      await enableNotifications();
    } else {
      disableNotifications();
    }
  };

  return (
    <AppLayout>
      <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6 max-w-4xl mx-auto">
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-bold">{t("settings.title")}</h1>
          <p className="text-muted-foreground text-sm lg:text-base">{t("settings.subtitle")}</p>
        </div>

        {/* Notifications */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold">{t("settings.notifications")}</h2>
                <p className="text-sm text-muted-foreground">{t("settings.notificationsDesc")}</p>
              </div>
            </div>
            <div className="space-y-4 pl-13">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{t("settings.emailNotif")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.emailNotifDesc")}</p>
                  </div>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{t("settings.pushNotif")}</p>
                    <p className="text-xs text-muted-foreground">
                      {isSupported 
                        ? t("settings.pushNotifDesc")
                        : (language === 'ru' ? 'Не поддерживается в этом браузере' : 'Not supported in this browser')}
                    </p>
                  </div>
                </div>
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                ) : (
                  <Switch 
                    checked={isEnabled} 
                    onCheckedChange={handlePushToggle}
                    disabled={!isSupported || isLoading}
                  />
                )}
              </div>
              <NotificationPreferences>
                <div className="flex items-center justify-between cursor-pointer hover:bg-muted/50 -mx-2 px-2 py-2 rounded-lg transition-colors">
                  <div className="flex items-center gap-3">
                    <Dumbbell className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm">{t("settings.reminders")}</p>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ru' ? 'За 60, 30, 7, 1 день до события' : '60, 30, 7, 1 days before event'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </NotificationPreferences>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Megaphone className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{t("settings.updates")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.updatesDesc")}</p>
                  </div>
                </div>
                <Switch />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Moon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold">{t("settings.appearance")}</h2>
                <p className="text-sm text-muted-foreground">{t("settings.appearanceDesc")}</p>
              </div>
            </div>
            <div className="space-y-4 pl-13">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{t("settings.darkMode")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.darkModeDesc")}</p>
                  </div>
                </div>
                <Switch checked={theme === "dark"} onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{t("settings.language")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.languageDesc")}</p>
                  </div>
                </div>
                <div className="flex gap-1 bg-muted rounded-lg p-1">
                  <button onClick={() => setLanguage("ru")} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${language === "ru" ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
                    RU
                  </button>
                  <button onClick={() => setLanguage("en")} className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${language === "en" ? 'bg-background shadow-sm' : 'text-muted-foreground'}`}>
                    EN
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Sync */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold">{language === 'ru' ? 'Синхронизация календаря' : 'Calendar Sync'}</h2>
                <p className="text-sm text-muted-foreground">
                  {language === 'ru' 
                    ? 'Автоматическое обновление при изменении расписания' 
                    : 'Auto-update when schedule changes'}
                </p>
              </div>
            </div>
            <div className="pl-13">
              <CalendarSync>
                <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div className="text-left">
                      <p className="font-medium text-sm">
                        {language === 'ru' ? 'Подписаться на календарь' : 'Subscribe to Calendar'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {language === 'ru' ? 'Google, Apple, Outlook' : 'Google, Apple, Outlook'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </CalendarSync>
            </div>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Lock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-bold">{t("settings.security")}</h2>
                <p className="text-sm text-muted-foreground">{t("settings.securityDesc")}</p>
              </div>
            </div>
            <div className="space-y-2 pl-13">
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Key className="w-5 h-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium text-sm">{t("settings.changePassword")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.changePasswordDesc")}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <div className="text-left">
                    <p className="font-medium text-sm">{t("settings.twoFactor")}</p>
                    <p className="text-xs text-muted-foreground">{t("settings.twoFactorDesc")}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Support */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 lg:p-6">
            <h2 className="font-bold mb-4">{t("settings.support")}</h2>
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium text-sm">{t("settings.helpCenter")}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium text-sm">{t("settings.contactSupport")}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
              <button className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium text-sm">{t("settings.terms")}</span>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <button className="w-full flex items-center justify-center gap-2 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 font-medium hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors">
          <LogOut className="w-5 h-5" />
          {t("settings.signOut")}
        </button>

        {/* Version */}
        <p className="text-center text-sm text-muted-foreground">
          {t("settings.version")} 1.0.0
        </p>
      </div>
    </AppLayout>
  );
}
