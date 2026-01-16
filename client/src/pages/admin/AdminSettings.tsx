import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  Settings, 
  Bell, 
  Shield, 
  Database, 
  Mail, 
  Clock,
  Users,
  FileText,
  Save,
  RefreshCw
} from "lucide-react";

export default function AdminSettings() {
  
  const [saving, setSaving] = useState(false);

  // General settings
  const [clinicName, setClinicName] = useState("Ortho Innovations");
  const [timezone, setTimezone] = useState("Europe/Moscow");
  const [language, setLanguage] = useState("ru");

  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [reminderDays, setReminderDays] = useState("7,3,1");

  // Security settings
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [ipWhitelist, setIpWhitelist] = useState("");

  // System settings
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState("daily");
  const [logRetention, setLogRetention] = useState("30");

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    toast.success("Настройки сохранены", {
      description: "Все изменения успешно применены",
    });
  };

  return (
    <AdminLayout title="Настройки">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Настройки системы</h1>
            <p className="text-muted-foreground mt-1">Управление параметрами администрирования</p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Сохранить
              </>
            )}
          </Button>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Общие</span>
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Уведомления</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Безопасность</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span className="hidden sm:inline">Система</span>
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Общие настройки
                </CardTitle>
                <CardDescription>
                  Основные параметры клиники и системы
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="clinicName">Название клиники</Label>
                    <Input
                      id="clinicName"
                      value={clinicName}
                      onChange={(e) => setClinicName(e.target.value)}
                      placeholder="Ortho Innovations"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone">Часовой пояс</Label>
                    <Select value={timezone} onValueChange={setTimezone}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Europe/Moscow">Москва (UTC+3)</SelectItem>
                        <SelectItem value="Europe/Dubai">Дубай (UTC+4)</SelectItem>
                        <SelectItem value="Asia/Almaty">Алматы (UTC+6)</SelectItem>
                        <SelectItem value="Europe/London">Лондон (UTC+0)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Язык системы</Label>
                  <Select value={language} onValueChange={setLanguage}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ru">Русский</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="ar">العربية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Настройки пациентов
                </CardTitle>
                <CardDescription>
                  Параметры работы с пациентами
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Автоматическая регистрация</Label>
                    <p className="text-sm text-muted-foreground">
                      Создавать профиль пациента при первом входе
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Верификация изменений</Label>
                    <p className="text-sm text-muted-foreground">
                      Требовать подтверждение критических изменений профиля
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Каналы уведомлений
                </CardTitle>
                <CardDescription>
                  Настройка способов отправки уведомлений пациентам
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <Label>Email уведомления</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Отправлять уведомления на email пациентов
                    </p>
                  </div>
                  <Switch 
                    checked={emailNotifications} 
                    onCheckedChange={setEmailNotifications} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      <Label>Push уведомления</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Отправлять push-уведомления в приложение
                    </p>
                  </div>
                  <Switch 
                    checked={pushNotifications} 
                    onCheckedChange={setPushNotifications} 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <Label>SMS уведомления</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Отправлять SMS-сообщения (платная услуга)
                    </p>
                  </div>
                  <Switch 
                    checked={smsNotifications} 
                    onCheckedChange={setSmsNotifications} 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Напоминания о приёмах
                </CardTitle>
                <CardDescription>
                  Настройка автоматических напоминаний
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reminderDays">Дни напоминаний (через запятую)</Label>
                  <Input
                    id="reminderDays"
                    value={reminderDays}
                    onChange={(e) => setReminderDays(e.target.value)}
                    placeholder="7,3,1"
                  />
                  <p className="text-sm text-muted-foreground">
                    Напоминания будут отправлены за указанное количество дней до события
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Аутентификация
                </CardTitle>
                <CardDescription>
                  Настройки безопасности входа в систему
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Двухфакторная аутентификация</Label>
                    <p className="text-sm text-muted-foreground">
                      Требовать 2FA для администраторов
                    </p>
                  </div>
                  <Switch 
                    checked={twoFactorAuth} 
                    onCheckedChange={setTwoFactorAuth} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Таймаут сессии (минуты)</Label>
                  <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 минут</SelectItem>
                      <SelectItem value="30">30 минут</SelectItem>
                      <SelectItem value="60">1 час</SelectItem>
                      <SelectItem value="120">2 часа</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ограничение доступа</CardTitle>
                <CardDescription>
                  Настройка IP-фильтрации для админ-панели
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="ipWhitelist">Белый список IP (через запятую)</Label>
                  <Input
                    id="ipWhitelist"
                    value={ipWhitelist}
                    onChange={(e) => setIpWhitelist(e.target.value)}
                    placeholder="192.168.1.1, 10.0.0.1"
                  />
                  <p className="text-sm text-muted-foreground">
                    Оставьте пустым для доступа с любого IP
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* System Settings */}
          <TabsContent value="system" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Резервное копирование
                </CardTitle>
                <CardDescription>
                  Настройка автоматического бэкапа данных
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Автоматический бэкап</Label>
                    <p className="text-sm text-muted-foreground">
                      Создавать резервные копии автоматически
                    </p>
                  </div>
                  <Switch 
                    checked={autoBackup} 
                    onCheckedChange={setAutoBackup} 
                  />
                </div>
                {autoBackup && (
                  <div className="space-y-2">
                    <Label>Частота бэкапа</Label>
                    <Select value={backupFrequency} onValueChange={setBackupFrequency}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Каждый час</SelectItem>
                        <SelectItem value="daily">Ежедневно</SelectItem>
                        <SelectItem value="weekly">Еженедельно</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Логирование</CardTitle>
                <CardDescription>
                  Настройка хранения системных логов
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logRetention">Хранение логов (дней)</Label>
                  <Select value={logRetention} onValueChange={setLogRetention}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7">7 дней</SelectItem>
                      <SelectItem value="14">14 дней</SelectItem>
                      <SelectItem value="30">30 дней</SelectItem>
                      <SelectItem value="90">90 дней</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" className="w-full sm:w-auto">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Очистить логи
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Информация о системе</CardTitle>
                <CardDescription>
                  Текущее состояние системы
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Версия приложения</span>
                    <span className="font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">База данных</span>
                    <span className="font-medium text-green-600">Подключена</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Firebase</span>
                    <span className="font-medium text-green-600">Активен</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Последний бэкап</span>
                    <span className="font-medium">Сегодня, 06:00</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
