import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Bell, Send, Users, Calendar, Clock, CheckCircle, 
  AlertCircle, Info, Megaphone, Filter, Search, Trash2,
  Eye, MoreVertical, ChevronRight
} from "lucide-react";

interface Notification {
  id: number;
  title: { ru: string; en: string };
  message: { ru: string; en: string };
  type: 'info' | 'reminder' | 'alert' | 'announcement';
  audience: 'all' | 'active' | 'specific';
  sentAt: string;
  readCount: number;
  totalRecipients: number;
  status: 'sent' | 'scheduled' | 'draft';
  scheduledFor?: string;
}

const initialNotifications: Notification[] = [
  { 
    id: 1, 
    title: { ru: "Новогодние праздники", en: "New Year Holidays" },
    message: { ru: "Уважаемые пациенты! Сообщаем о графике работы в праздничные дни.", en: "Dear patients! We inform you about the holiday schedule." },
    type: "announcement",
    audience: "all",
    sentAt: "2024-12-10 10:00",
    readCount: 145,
    totalRecipients: 230,
    status: "sent"
  },
  { 
    id: 2, 
    title: { ru: "Напоминание о записи", en: "Appointment Reminder" },
    message: { ru: "Напоминаем о вашей записи на завтра.", en: "Reminder about your appointment tomorrow." },
    type: "reminder",
    audience: "specific",
    sentAt: "2024-12-09 18:00",
    readCount: 12,
    totalRecipients: 15,
    status: "sent"
  },
  { 
    id: 3, 
    title: { ru: "Обновление приложения", en: "App Update" },
    message: { ru: "Доступна новая версия приложения с улучшениями.", en: "New app version available with improvements." },
    type: "info",
    audience: "all",
    sentAt: "2024-12-08 12:00",
    readCount: 189,
    totalRecipients: 230,
    status: "sent"
  },
  { 
    id: 4, 
    title: { ru: "Срочное обслуживание", en: "Urgent Maintenance" },
    message: { ru: "Требуется срочное обслуживание протеза.", en: "Urgent prosthesis maintenance required." },
    type: "alert",
    audience: "specific",
    sentAt: "2024-12-07 09:00",
    readCount: 3,
    totalRecipients: 5,
    status: "sent"
  },
  { 
    id: 5, 
    title: { ru: "Акция на услуги", en: "Service Promotion" },
    message: { ru: "Специальное предложение на сервисное обслуживание.", en: "Special offer on service maintenance." },
    type: "announcement",
    audience: "active",
    scheduledFor: "2024-12-15 10:00",
    sentAt: "",
    readCount: 0,
    totalRecipients: 180,
    status: "scheduled"
  },
];

const notificationTypes = [
  { id: "info", icon: Info, label: { ru: "Информация", en: "Info" }, color: "bg-blue-100 text-blue-600" },
  { id: "reminder", icon: Clock, label: { ru: "Напоминание", en: "Reminder" }, color: "bg-purple-100 text-purple-600" },
  { id: "alert", icon: AlertCircle, label: { ru: "Важное", en: "Alert" }, color: "bg-red-100 text-red-600" },
  { id: "announcement", icon: Megaphone, label: { ru: "Объявление", en: "Announcement" }, color: "bg-green-100 text-green-600" },
];

export default function AdminNotifications() {
  const { language } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [formData, setFormData] = useState({
    titleRu: "",
    titleEn: "",
    messageRu: "",
    messageEn: "",
    type: "info" as Notification['type'],
    audience: "all" as Notification['audience'],
    schedule: false,
    scheduledDate: "",
    scheduledTime: "",
  });

  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = n.title.ru.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         n.title.en.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = !selectedType || n.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getTypeConfig = (type: string) => {
    return notificationTypes.find(t => t.id === type) || notificationTypes[0];
  };

  const handleSend = () => {
    const newNotification: Notification = {
      id: Math.max(...notifications.map(n => n.id)) + 1,
      title: { ru: formData.titleRu, en: formData.titleEn },
      message: { ru: formData.messageRu, en: formData.messageEn },
      type: formData.type,
      audience: formData.audience,
      sentAt: formData.schedule ? "" : new Date().toISOString().slice(0, 16).replace('T', ' '),
      scheduledFor: formData.schedule ? `${formData.scheduledDate} ${formData.scheduledTime}` : undefined,
      readCount: 0,
      totalRecipients: formData.audience === 'all' ? 230 : formData.audience === 'active' ? 180 : 0,
      status: formData.schedule ? "scheduled" : "sent",
    };
    
    setNotifications([newNotification, ...notifications]);
    setShowCreateModal(false);
    setFormData({
      titleRu: "", titleEn: "", messageRu: "", messageEn: "",
      type: "info", audience: "all", schedule: false, scheduledDate: "", scheduledTime: ""
    });
    
    toast.success(
      formData.schedule 
        ? (language === 'ru' ? "Уведомление запланировано" : "Notification scheduled")
        : (language === 'ru' ? "Уведомление отправлено" : "Notification sent")
    );
  };

  const handleDelete = (id: number) => {
    setNotifications(notifications.filter(n => n.id !== id));
    toast.success(language === 'ru' ? "Уведомление удалено" : "Notification deleted");
  };

  const stats = {
    total: notifications.length,
    sent: notifications.filter(n => n.status === 'sent').length,
    scheduled: notifications.filter(n => n.status === 'scheduled').length,
    avgReadRate: Math.round(
      notifications.filter(n => n.status === 'sent').reduce((sum, n) => sum + (n.readCount / n.totalRecipients * 100), 0) / 
      notifications.filter(n => n.status === 'sent').length
    ) || 0,
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">
              {language === 'ru' ? 'Уведомления' : 'Notifications'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ru' ? 'Рассылка и управление уведомлениями' : 'Broadcast and manage notifications'}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Send className="w-4 h-4 mr-2" />
            {language === 'ru' ? 'Создать рассылку' : 'Create Broadcast'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Всего' : 'Total'}</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Отправлено' : 'Sent'}</p>
                  <p className="text-xl font-bold">{stats.sent}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Запланировано' : 'Scheduled'}</p>
                  <p className="text-xl font-bold">{stats.scheduled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Прочитано' : 'Read Rate'}</p>
                  <p className="text-xl font-bold">{stats.avgReadRate}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ru' ? "Поиск уведомлений..." : "Search notifications..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
            <Button
              variant={selectedType === null ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(null)}
            >
              {language === 'ru' ? 'Все' : 'All'}
            </Button>
            {notificationTypes.map((type) => (
              <Button
                key={type.id}
                variant={selectedType === type.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type.id)}
              >
                <type.icon className="w-4 h-4 mr-1" />
                {type.label[language]}
              </Button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <Card className="border-none shadow-sm">
              <CardContent className="p-8 text-center">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  {language === 'ru' ? 'Уведомления не найдены' : 'No notifications found'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => {
              const typeConfig = getTypeConfig(notification.type);
              const readRate = notification.totalRecipients > 0 
                ? Math.round((notification.readCount / notification.totalRecipients) * 100) 
                : 0;
              
              return (
                <Card key={notification.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${typeConfig.color}`}>
                        <typeConfig.icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium truncate">{notification.title[language]}</h3>
                          {notification.status === 'scheduled' && (
                            <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                              {language === 'ru' ? 'Запланировано' : 'Scheduled'}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{notification.message[language]}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {notification.totalRecipients} {language === 'ru' ? 'получателей' : 'recipients'}
                          </span>
                          {notification.status === 'sent' && (
                            <>
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {readRate}% {language === 'ru' ? 'прочитано' : 'read'}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {notification.sentAt}
                              </span>
                            </>
                          )}
                          {notification.status === 'scheduled' && notification.scheduledFor && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {notification.scheduledFor}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => { setSelectedNotification(notification); setShowPreviewModal(true); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDelete(notification.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Create Notification Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{language === 'ru' ? 'Создать уведомление' : 'Create Notification'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{language === 'ru' ? 'Заголовок (RU)' : 'Title (RU)'}</label>
              <Input
                value={formData.titleRu}
                onChange={(e) => setFormData({ ...formData, titleRu: e.target.value })}
                placeholder={language === 'ru' ? "Введите заголовок" : "Enter title"}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{language === 'ru' ? 'Заголовок (EN)' : 'Title (EN)'}</label>
              <Input
                value={formData.titleEn}
                onChange={(e) => setFormData({ ...formData, titleEn: e.target.value })}
                placeholder="Enter title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{language === 'ru' ? 'Сообщение (RU)' : 'Message (RU)'}</label>
              <Textarea
                value={formData.messageRu}
                onChange={(e) => setFormData({ ...formData, messageRu: e.target.value })}
                placeholder={language === 'ru' ? "Введите сообщение" : "Enter message"}
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{language === 'ru' ? 'Сообщение (EN)' : 'Message (EN)'}</label>
              <Textarea
                value={formData.messageEn}
                onChange={(e) => setFormData({ ...formData, messageEn: e.target.value })}
                placeholder="Enter message"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{language === 'ru' ? 'Тип' : 'Type'}</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full mt-1 p-2 border rounded-md bg-background"
                >
                  {notificationTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.label[language]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">{language === 'ru' ? 'Аудитория' : 'Audience'}</label>
                <select
                  value={formData.audience}
                  onChange={(e) => setFormData({ ...formData, audience: e.target.value as any })}
                  className="w-full mt-1 p-2 border rounded-md bg-background"
                >
                  <option value="all">{language === 'ru' ? 'Все пациенты' : 'All patients'}</option>
                  <option value="active">{language === 'ru' ? 'Активные' : 'Active'}</option>
                  <option value="specific">{language === 'ru' ? 'Выбранные' : 'Specific'}</option>
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="schedule"
                checked={formData.schedule}
                onChange={(e) => setFormData({ ...formData, schedule: e.target.checked })}
                className="rounded"
              />
              <label htmlFor="schedule" className="text-sm">
                {language === 'ru' ? 'Запланировать отправку' : 'Schedule sending'}
              </label>
            </div>
            {formData.schedule && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">{language === 'ru' ? 'Дата' : 'Date'}</label>
                  <Input
                    type="date"
                    value={formData.scheduledDate}
                    onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">{language === 'ru' ? 'Время' : 'Time'}</label>
                  <Input
                    type="time"
                    value={formData.scheduledTime}
                    onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </Button>
            <Button onClick={handleSend} disabled={!formData.titleRu || !formData.messageRu}>
              <Send className="w-4 h-4 mr-2" />
              {formData.schedule 
                ? (language === 'ru' ? 'Запланировать' : 'Schedule')
                : (language === 'ru' ? 'Отправить' : 'Send')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'ru' ? 'Просмотр уведомления' : 'Notification Preview'}</DialogTitle>
          </DialogHeader>
          {selectedNotification && (
            <div className="space-y-4">
              <Card className="border-none bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getTypeConfig(selectedNotification.type).color}`}>
                      {(() => { const Icon = getTypeConfig(selectedNotification.type).icon; return <Icon className="w-5 h-5" />; })()}
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedNotification.title[language]}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{selectedNotification.message[language]}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Тип' : 'Type'}</span>
                  <span className="font-medium">{getTypeConfig(selectedNotification.type).label[language]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Получателей' : 'Recipients'}</span>
                  <span className="font-medium">{selectedNotification.totalRecipients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Прочитано' : 'Read'}</span>
                  <span className="font-medium">{selectedNotification.readCount} ({Math.round((selectedNotification.readCount / selectedNotification.totalRecipients) * 100)}%)</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewModal(false)}>
              {language === 'ru' ? 'Закрыть' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
