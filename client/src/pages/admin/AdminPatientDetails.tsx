import { useParams, useLocation } from "wouter";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  ArrowLeft, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Activity,
  FileText,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Shield,
  Edit,
  Bell,
  QrCode,
  MapPin,
  Plus,
  Download,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

export default function AdminPatientDetails() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const patientId = useMemo(() => parseInt(id || "0"), [id]);

  // Fetch patient data with full details
  const { data: patient, isLoading: patientLoading } = trpc.admin.getPatient.useQuery(
    { id: patientId },
    { enabled: patientId > 0, staleTime: 30000 }
  );

  // Fetch service requests
  const { data: allOrders, isLoading: ordersLoading } = trpc.admin.getOrders.useQuery(
    undefined,
    { staleTime: 30000 }
  );

  // Fetch rehabilitation plans
  const { data: allPlans, isLoading: plansLoading } = trpc.admin.getRehabPlans.useQuery(
    undefined,
    { staleTime: 30000 }
  );

  const patientOrders = useMemo(() => 
    allOrders?.filter((o: any) => o.patientId === patientId) || [],
    [allOrders, patientId]
  );
  const patientPlans = useMemo(() => 
    allPlans?.filter((p: any) => p.patientId === patientId) || [],
    [allPlans, patientId]
  );
  const patientAppointments = patient?.appointments || [];

  const isLoading = patientLoading || ordersLoading || plansLoading;

  // Modal states
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    dateOfBirth: ''
  });
  const [appointmentForm, setAppointmentForm] = useState({
    title: 'Приём',
    date: '',
    time: '10:00',
    duration: '60',
    description: ''
  });

  // Mutations
  const utils = trpc.useUtils();
  const updatePatientMutation = trpc.admin.updatePatient.useMutation({
    onSuccess: () => {
      toast.success('Данные пациента обновлены');
      utils.admin.getPatient.invalidate({ id: patientId });
      utils.admin.getPatients.invalidate();
      setEditModalOpen(false);
    },
    onError: (error) => {
      toast.error('Ошибка при обновлении: ' + error.message);
    }
  });

  const createAppointmentMutation = trpc.admin.createAppointment.useMutation({
    onSuccess: () => {
      toast.success('Запись на приём создана');
      utils.admin.getPatient.invalidate({ id: patientId });
      setAppointmentModalOpen(false);
    },
    onError: (error) => {
      toast.error('Ошибка при создании записи: ' + error.message);
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-orange-50 text-orange-600 border-orange-200">Ожидает</Badge>;
      case "confirmed":
        return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">Подтверждено</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-purple-50 text-purple-600 border-purple-200">В работе</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Завершено</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">Отменено</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  };

  // Action handlers
  const handleSendNotification = () => {
    toast.info('Функция в разработке');
  };

  const handleCreateAppointment = () => {
    // Reset form and open modal
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setAppointmentForm({
      title: 'Приём',
      date: tomorrow.toISOString().split('T')[0],
      time: '10:00',
      duration: '60',
      description: ''
    });
    setAppointmentModalOpen(true);
  };

  const handleEdit = () => {
    if (!patient) return;
    // Populate form with current patient data
    setEditForm({
      name: patient.name || '',
      phone: patient.phone || '',
      email: patient.email || '',
      dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().split('T')[0] : ''
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    updatePatientMutation.mutate({
      id: patientId,
      name: editForm.name || undefined,
      phone: editForm.phone || undefined,
      email: editForm.email || undefined,
      dateOfBirth: editForm.dateOfBirth || undefined
    });
  };

  const handleSaveAppointment = () => {
    if (!appointmentForm.date || !appointmentForm.time) {
      toast.error('Укажите дату и время');
      return;
    }
    const scheduledAt = new Date(`${appointmentForm.date}T${appointmentForm.time}:00`);
    createAppointmentMutation.mutate({
      patientId,
      title: appointmentForm.title,
      description: appointmentForm.description || undefined,
      scheduledAt: scheduledAt.toISOString(),
      duration: parseInt(appointmentForm.duration)
    });
  };

  const handleDownloadQR = () => {
    toast.info('Функция в разработке');
  };

  const handleExportPDF = () => {
    // Generate PDF with patient history
    const patientData = {
      name: patient?.name || 'Не указано',
      phone: patient?.phone || 'Не указан',
      email: patient?.email || 'Не указан',
      status: patient?.status || 'active',
      createdAt: formatDate(patient?.createdAt || null),
      orders: patientOrders.length,
      plans: patientPlans.length,
      appointments: patientAppointments.length
    };

    // Create text content for PDF
    let content = `КАРТА ПАЦИЕНТА\n`;
    content += `================\n\n`;
    content += `Имя: ${patientData.name}\n`;
    content += `Телефон: ${patientData.phone}\n`;
    content += `Email: ${patientData.email}\n`;
    content += `Статус: ${patientData.status === 'active' ? 'Активен' : 'Неактивен'}\n`;
    content += `Дата регистрации: ${patientData.createdAt}\n\n`;
    
    content += `СТАТИСТИКА\n`;
    content += `--------\n`;
    content += `Заказов: ${patientData.orders}\n`;
    content += `Планов реабилитации: ${patientData.plans}\n`;
    content += `Приёмов: ${patientData.appointments}\n\n`;

    if (patientOrders.length > 0) {
      content += `ИСТОРИЯ ЗАКАЗОВ\n`;
      content += `--------------\n`;
      patientOrders.forEach((order: any, i: number) => {
        content += `${i + 1}. ${order.serviceType} - ${order.status} (${formatDate(order.createdAt)})\n`;
      });
      content += `\n`;
    }

    if (patientAppointments.length > 0) {
      content += `ИСТОРИЯ ПРИЁМОВ\n`;
      content += `--------------\n`;
      patientAppointments.forEach((apt: any, i: number) => {
        content += `${i + 1}. ${apt.title || 'Приём'} - ${formatDate(apt.scheduledAt)}\n`;
      });
    }

    // Download as text file (for now, can be enhanced to PDF later)
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patient_${patientId}_history.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('История пациента скачана');
  };

  if (isLoading) {
    return (
      <AdminLayout title="Загрузка...">
        <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
          <Skeleton className="h-64" />
        </div>
      </AdminLayout>
    );
  }

  if (!patient) {
    return (
      <AdminLayout title="Пациент не найден">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Пациент не найден</h2>
            <p className="text-muted-foreground mb-4">Пациент с ID {patientId} не существует</p>
            <Button onClick={() => setLocation("/admin/patients")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Вернуться к списку
            </Button>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  // Calculate day of recovery
  const dayOfRecovery = patient.rehabPlan?.startDate
    ? Math.max(1, Math.ceil((Date.now() - new Date(patient.rehabPlan.startDate).getTime()) / (1000 * 60 * 60 * 24)))
    : null;

  // Calculate statistics
  const completedOrders = patientOrders.filter(o => o.status === "completed").length;
  const pendingOrders = patientOrders.filter(o => o.status === "pending").length;
  const activePlans = patientPlans.filter(p => p.status === "active").length;
  const upcomingAppointments = patientAppointments.filter(a => 
    a.scheduledAt && new Date(a.scheduledAt) > new Date()
  ).length;

  return (
    <AdminLayout title={patient.name || "Пациент"}>
      <div className="space-y-6">
        {/* Header with back button and actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
          <Button 
            variant="ghost" 
            onClick={() => setLocation("/admin/patients")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Назад к списку
          </Button>
          
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleExportPDF}>
              <Download className="w-4 h-4 mr-2" />
              Экспорт
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadQR}>
              <QrCode className="w-4 h-4 mr-2" />
              QR-код
            </Button>
            <Button variant="outline" size="sm" onClick={handleSendNotification}>
              <Bell className="w-4 h-4 mr-2" />
              Уведомление
            </Button>
            <Button variant="outline" size="sm" onClick={handleCreateAppointment}>
              <Plus className="w-4 h-4 mr-2" />
              Приём
            </Button>
            <Button size="sm" onClick={handleEdit}>
              <Edit className="w-4 h-4 mr-2" />
              Редактировать
            </Button>
          </div>
        </div>

        {/* Patient Header Card */}
        <Card className="border border-[hsl(174,72%,56%)]/30">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-3xl font-bold text-primary">
                  {patient.name?.charAt(0) || 'P'}
                </span>
              </div>
              
              {/* Main Info */}
              <div className="flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-2xl font-bold">{patient.name || "Без имени"}</h1>
                  <Badge 
                    variant="outline" 
                    className={patient.status === "active" 
                      ? "bg-green-50 text-green-600 border-green-200" 
                      : "bg-gray-50 text-gray-600 border-gray-200"
                    }
                  >
                    {patient.status === "active" ? "Активен" : "Неактивен"}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Регистрация: {formatDate(patient.createdAt)}</span>
                  </div>
                  {dayOfRecovery && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Activity className="w-4 h-4" />
                      <span>День восстановления: {dayOfRecovery}</span>
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{patient.email}</span>
                    </div>
                  )}
                  {patient.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <span>{patient.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 shrink-0">
                <div className="text-center p-3 bg-primary/5 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{patient.rehabPlan?.progress || 0}%</p>
                  <p className="text-xs text-muted-foreground">Прогресс</p>
                </div>
                <div className="text-center p-3 bg-primary/5 rounded-lg">
                  <p className="text-2xl font-bold text-primary">{upcomingAppointments}</p>
                  <p className="text-xs text-muted-foreground">Приёмов</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      {/* Contact Info */}
      <Card className="border border-[hsl(174,72%,56%)]/30">
        <CardHeader>
          <CardTitle className="text-lg">Контактная информация</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                <Phone className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Телефон</p>
                <p className="font-medium">{patient.phone || "Не указан"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-purple-50 flex items-center justify-center">
                <Mail className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{patient.email || "Не указан"}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Дата рождения</p>
                <p className="font-medium">{patient.dateOfBirth ? formatDate(patient.dateOfBirth) : "Не указана"}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border border-[hsl(174,72%,56%)]/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Всего заказов</p>
                <p className="text-2xl font-bold">{patientOrders.length}</p>
              </div>
              <Package className="h-8 w-8 text-primary/20" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-[hsl(174,72%,56%)]/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ожидают</p>
                <p className="text-2xl font-bold text-orange-600">{pendingOrders}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-[hsl(174,72%,56%)]/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Активных планов</p>
                <p className="text-2xl font-bold text-purple-600">{activePlans}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="border border-[hsl(174,72%,56%)]/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Приёмов</p>
                <p className="text-2xl font-bold text-green-600">{upcomingAppointments}</p>
              </div>
              <Calendar className="h-8 w-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs with History */}
      <Tabs defaultValue="orders" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="orders">
            <Package className="h-4 w-4 mr-2" />
            Заказы ({patientOrders.length})
          </TabsTrigger>
          <TabsTrigger value="rehabilitation">
            <Activity className="h-4 w-4 mr-2" />
            Реабилитация ({patientPlans.length})
          </TabsTrigger>
          <TabsTrigger value="appointments">
            <Calendar className="h-4 w-4 mr-2" />
            Приёмы ({patientAppointments.length})
          </TabsTrigger>
        </TabsList>

        {/* Orders Tab */}
        <TabsContent value="orders" className="mt-4">
          <Card className="border border-[hsl(174,72%,56%)]/30">
            <CardHeader>
              <CardTitle>История заказов</CardTitle>
              <CardDescription>Все заявки на сервис от пациента</CardDescription>
            </CardHeader>
            <CardContent>
              {patientOrders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Нет заказов</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patientOrders.map((order) => (
                    <div 
                      key={order.id} 
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{typeof order.service === 'object' ? order.service.ru : order.service}</p>
                          <p className="text-sm text-muted-foreground">
                            {order.orderNumber} • {order.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {getStatusBadge(order.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Rehabilitation Tab */}
        <TabsContent value="rehabilitation" className="mt-4">
          <Card className="border border-[hsl(174,72%,56%)]/30">
            <CardHeader>
              <CardTitle>Планы реабилитации</CardTitle>
              <CardDescription>Программы восстановления пациента</CardDescription>
            </CardHeader>
            <CardContent>
              {patientPlans.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Нет планов реабилитации</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patientPlans.map((plan) => (
                    <div 
                      key={plan.id} 
                      className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                          <Activity className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">{plan.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(plan.startDate)} — {formatDate(plan.endDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm font-medium">{plan.progress || 0}%</p>
                          <p className="text-xs text-muted-foreground">прогресс</p>
                        </div>
                        <Badge 
                          variant="outline"
                          className={
                            plan.status === "active" 
                              ? "bg-green-50 text-green-600 border-green-200"
                              : plan.status === "completed"
                              ? "bg-blue-50 text-blue-600 border-blue-200"
                              : "bg-gray-50 text-gray-600 border-gray-200"
                          }
                        >
                          {plan.status === "active" ? "Активен" : plan.status === "completed" ? "Завершён" : plan.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="mt-4">
          <Card className="border border-[hsl(174,72%,56%)]/30">
            <CardHeader>
              <CardTitle>История приёмов</CardTitle>
              <CardDescription>Записи на приём к специалистам</CardDescription>
            </CardHeader>
            <CardContent>
              {patientAppointments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>Нет записей на приём</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {patientAppointments.map((appointment) => {
                    const isPast = appointment.scheduledAt && new Date(appointment.scheduledAt) < new Date();
                    return (
                      <div 
                        key={appointment.id} 
                        className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            isPast ? "bg-gray-100" : "bg-green-100"
                          }`}>
                            <Calendar className={`h-5 w-5 ${isPast ? "text-gray-600" : "text-green-600"}`} />
                          </div>
                          <div>
                            <p className="font-medium">{appointment.title || "Приём"}</p>
                            <p className="text-sm text-muted-foreground">
                              {appointment.scheduledAt 
                                ? new Date(appointment.scheduledAt).toLocaleString("ru-RU", {
                                    day: "numeric",
                                    month: "long",
                                    hour: "2-digit",
                                    minute: "2-digit"
                                  })
                                : "Дата не назначена"
                              }
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {appointment.status === "completed" && (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          )}
                          {appointment.status === "cancelled" && (
                            <XCircle className="h-5 w-5 text-red-500" />
                          )}
                          {appointment.status === "scheduled" && !isPast && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200">
                              Запланирован
                            </Badge>
                          )}
                          {isPast && appointment.status !== "completed" && appointment.status !== "cancelled" && (
                            <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
                              Прошёл
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </div>

      {/* Edit Patient Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Редактирование пациента</DialogTitle>
            <DialogDescription>
              Измените контактную информацию пациента
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Иван Иванов"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Телефон</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                placeholder="patient@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dateOfBirth">Дата рождения</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={editForm.dateOfBirth}
                onChange={(e) => setEditForm({ ...editForm, dateOfBirth: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveEdit} disabled={updatePatientMutation.isPending}>
              {updatePatientMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Appointment Modal */}
      <Dialog open={appointmentModalOpen} onOpenChange={setAppointmentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Запись на приём</DialogTitle>
            <DialogDescription>
              Создайте запись на приём для пациента
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="apt-title">Тип приёма</Label>
              <Select
                value={appointmentForm.title}
                onValueChange={(value) => setAppointmentForm({ ...appointmentForm, title: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите тип" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Приём">Приём</SelectItem>
                  <SelectItem value="Консультация">Консультация</SelectItem>
                  <SelectItem value="Осмотр">Осмотр</SelectItem>
                  <SelectItem value="Настройка протеза">Настройка протеза</SelectItem>
                  <SelectItem value="Реабилитация">Реабилитация</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="apt-date">Дата</Label>
                <Input
                  id="apt-date"
                  type="date"
                  value={appointmentForm.date}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="apt-time">Время</Label>
                <Input
                  id="apt-time"
                  type="time"
                  value={appointmentForm.time}
                  onChange={(e) => setAppointmentForm({ ...appointmentForm, time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apt-duration">Продолжительность (мин)</Label>
              <Select
                value={appointmentForm.duration}
                onValueChange={(value) => setAppointmentForm({ ...appointmentForm, duration: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Выберите" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 мин</SelectItem>
                  <SelectItem value="60">1 час</SelectItem>
                  <SelectItem value="90">1.5 часа</SelectItem>
                  <SelectItem value="120">2 часа</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="apt-description">Описание (опционально)</Label>
              <Input
                id="apt-description"
                value={appointmentForm.description}
                onChange={(e) => setAppointmentForm({ ...appointmentForm, description: e.target.value })}
                placeholder="Дополнительная информация..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAppointmentModalOpen(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveAppointment} disabled={createAppointmentMutation.isPending}>
              {createAppointmentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
