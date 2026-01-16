import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Plus, Wrench, Calendar as CalendarIcon, CheckCircle2, Clock, MapPin, 
  Phone, MessageCircle, Navigation, ChevronRight, X, CalendarPlus,
  AlertCircle, Star, Shield, Settings, Zap
} from "lucide-react";

const serviceTypes = [
  { 
    id: "adjustment", 
    icon: Settings, 
    labelKey: "service.adjustment",
    descKey: "service.adjustmentDesc",
    duration: 60,
    price: "Бесплатно",
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" 
  },
  { 
    id: "checkup", 
    icon: Shield, 
    labelKey: "service.checkup",
    descKey: "service.checkupDesc",
    duration: 90,
    price: "Бесплатно",
    color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400" 
  },
  { 
    id: "repair", 
    icon: Wrench, 
    labelKey: "service.repair",
    descKey: "service.repairDesc",
    duration: 120,
    price: "от 5000 ₽",
    color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" 
  },
  { 
    id: "emergency", 
    icon: Zap, 
    labelKey: "service.emergency",
    descKey: "service.emergencyDesc",
    duration: 45,
    price: "от 10000 ₽",
    color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" 
  },
];

const timeSlots = [
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00"
];

// Service requests now fetched from API

const specialists = [
  { id: 1, name: "Иван Сидоров", role: { ru: "Протезист", en: "Prosthetist" }, rating: 4.9, reviews: 127, available: true },
  { id: 2, name: "Анна Петрова", role: { ru: "Техник", en: "Technician" }, rating: 4.8, reviews: 89, available: true },
  { id: 3, name: "Dr. Smith", role: { ru: "Врач ЛФК", en: "Rehab Doctor" }, rating: 5.0, reviews: 203, available: false },
];

export default function Service() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState("active");
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedService, setSelectedService] = useState<typeof serviceTypes[0] | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedSpecialist, setSelectedSpecialist] = useState<typeof specialists[0] | null>(null);
  const [bookingStep, setBookingStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);

  // Fetch service requests from API with stale-while-revalidate
  const { data: serviceRequests, isLoading: requestsLoading, refetch: refetchRequests, error: requestsError } = trpc.service.getRequests.useQuery(undefined, {
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
    retry: 1,
  });
  
  // Create service request mutation with optimistic update
  const createRequestMutation = trpc.service.createRequest.useMutation({
    onSuccess: () => {
      refetchRequests();
    },
    onError: (error) => {
      console.error('Service request creation error:', error);
    }
  });
  
  // Cancel service request mutation
  const cancelRequestMutation = trpc.service.cancelRequest.useMutation({
    onSuccess: () => {
      refetchRequests();
      setSelectedRequest(null);
      toast.success(language === 'ru' ? 'Заявка отменена' : 'Request cancelled');
    },
    onError: (error) => {
      console.error('Service request cancellation error:', error);
      toast.error(language === 'ru' ? 'Ошибка при отмене заявки' : 'Failed to cancel request');
    }
  });

  const filteredRequests = (serviceRequests || []).filter((req: any) => {
    if (activeTab === "active") return req.status !== "completed";
    if (activeTab === "completed") return req.status === "completed";
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled": return { class: "bg-primary/10 text-primary", label: t("service.scheduled") };
      case "in-progress": return { class: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400", label: t("service.inProgress") };
      case "completed": return { class: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400", label: t("rehab.completed") };
      default: return { class: "bg-muted text-muted-foreground", label: t("service.pending") };
    }
  };

  const handleServiceSelect = (service: typeof serviceTypes[0]) => {
    setSelectedService(service);
    setBookingStep(1);
    setSelectedDate(undefined);
    setSelectedTime(null);
    setSelectedSpecialist(null);
    setShowBookingModal(true);
  };

  const handleNextStep = () => {
    if (bookingStep === 1 && selectedDate && selectedTime) {
      setBookingStep(2);
    } else if (bookingStep === 2 && selectedSpecialist) {
      setShowBookingModal(false);
      setShowConfirmModal(true);
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedService || !selectedDate || !selectedTime) return;
    
    setIsSubmitting(true);
    try {
      // Map frontend service type to API type (emergency -> consultation)
      const typeMap: Record<string, 'checkup' | 'adjustment' | 'repair' | 'consultation'> = {
        'adjustment': 'adjustment',
        'checkup': 'checkup',
        'repair': 'repair',
        'emergency': 'consultation', // Emergency maps to consultation type
      };
      
      await createRequestMutation.mutateAsync({
        type: typeMap[selectedService.id] || 'checkup',
        description: `${t(selectedService.descKey)}. ${language === 'ru' ? 'Специалист' : 'Specialist'}: ${selectedSpecialist?.name || 'Any'}`,
      });
      
      setShowConfirmModal(false);
      toast.success(
        language === 'ru' 
          ? "Запись успешно создана! Добавлено в календарь." 
          : "Booking confirmed! Added to calendar.",
        { duration: 5000 }
      );
    } catch (error) {
      toast.error(language === 'ru' ? 'Ошибка при создании записи' : 'Error creating booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addToGoogleCalendar = () => {
    if (!selectedDate || !selectedTime || !selectedService) return;
    
    const startDate = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + (selectedService.duration || 60));
    
    const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
    
    const title = encodeURIComponent(`Ortho Innovations: ${t(selectedService.labelKey)}`);
    const details = encodeURIComponent(
      language === 'ru' 
        ? `Специалист: ${selectedSpecialist?.name}\nТип услуги: ${t(selectedService.labelKey)}`
        : `Specialist: ${selectedSpecialist?.name}\nService: ${t(selectedService.labelKey)}`
    );
    const location = encodeURIComponent("Dubai Healthcare City, Building 47, Dubai, UAE");
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${formatDate(startDate)}/${formatDate(endDate)}&details=${details}&location=${location}`;
    
    window.open(url, '_blank');
    toast.success(language === 'ru' ? "Открыт Google Calendar" : "Google Calendar opened");
  };

  const addToAppleCalendar = () => {
    if (!selectedDate || !selectedTime || !selectedService) return;
    
    const startDate = new Date(selectedDate);
    const [hours, minutes] = selectedTime.split(':').map(Number);
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + (selectedService.duration || 60));
    
    const formatDate = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '').slice(0, -1);
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Ortho Innovations//Service Booking//EN
BEGIN:VEVENT
DTSTART:${formatDate(startDate)}
DTEND:${formatDate(endDate)}
SUMMARY:Ortho Innovations: ${t(selectedService.labelKey)}
DESCRIPTION:${language === 'ru' ? 'Специалист' : 'Specialist'}: ${selectedSpecialist?.name}
LOCATION:Dubai Healthcare City, Building 47, Dubai, UAE
BEGIN:VALARM
TRIGGER:-P1D
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
BEGIN:VALARM
TRIGGER:-P7D
ACTION:DISPLAY
DESCRIPTION:Reminder
END:VALARM
END:VEVENT
END:VCALENDAR`;
    
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ortho-service-booking.ics';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success(language === 'ru' ? "Файл календаря скачан" : "Calendar file downloaded");
  };

  const disabledDays = [
    { dayOfWeek: [0] }, // Sundays
    { before: new Date() } // Past dates
  ];

  return (
    <AppLayout>
      <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6 max-w-6xl mx-auto">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl lg:text-3xl font-bold">{t("service.title")}</h1>
            <p className="text-muted-foreground text-sm lg:text-base">{t("service.subtitle")}</p>
          </div>
        </div>

        {/* Quick Service Types - Now clickable */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {serviceTypes.map((type) => (
            <Card 
              key={type.id} 
              className="border-none shadow-sm card-interactive cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleServiceSelect(type)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-3 ${type.color}`}>
                  <type.icon className="w-7 h-7" />
                </div>
                <span className="text-sm font-semibold mb-1">{t(type.labelKey)}</span>
                <span className="text-xs text-muted-foreground">{type.duration} мин</span>
                <span className="text-xs font-medium text-primary mt-1">{type.price}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Next Scheduled Service Alert */}
        {filteredRequests.find((r: any) => r.status === 'scheduled') && (
          <Card className="border-none shadow-sm bg-gradient-to-r from-primary/10 to-primary/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <CalendarIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {language === 'ru' ? 'Ближайшая запись' : 'Next appointment'}
                </p>
                <p className="font-semibold">
                  {(filteredRequests.find((r: any) => r.status === 'scheduled') as any)?.type || 'Service'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {(filteredRequests.find((r: any) => r.status === 'scheduled') as any)?.createdAt ? new Date((filteredRequests.find((r: any) => r.status === 'scheduled') as any).createdAt).toLocaleDateString() : ''}
                </p>
              </div>
              <Button variant="outline" size="sm" className="hidden lg:flex">
                <CalendarPlus className="w-4 h-4 mr-2" />
                {language === 'ru' ? 'В календарь' : 'Add to calendar'}
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Service Requests */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">{t("service.requests")}</h2>
              <div className="flex gap-1 bg-muted rounded-lg p-1">
                {[
                  { id: "active", label: t("service.active") },
                  { id: "completed", label: t("service.completedTab") },
                  { id: "all", label: t("service.allTab") },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      activeTab === tab.id ? 'bg-background shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {requestsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="border-none shadow-sm">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-xl" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-20 mb-2" />
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : filteredRequests.length === 0 ? (
                <Card className="border-none shadow-sm">
                  <CardContent className="p-8 text-center">
                    <CalendarIcon className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                    <p className="text-muted-foreground">
                      {language === 'ru' ? 'Нет записей' : 'No appointments'}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredRequests.map((req: any) => {
                  const statusBadge = getStatusBadge(req.status);
                  const serviceType = serviceTypes.find(t => t.id === req.type);
                  const serviceName = serviceType ? t(serviceType.labelKey) : (req.serviceType || (typeof req.title === 'object' ? req.title[language] : req.title));
                  const formattedDate = req.scheduledDate 
                    ? new Date(req.scheduledDate).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long' })
                    : req.date;
                  return (
                    <Card 
                      key={req.id} 
                      className="border-none shadow-sm card-interactive cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => setSelectedRequest(req)}
                    >
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${serviceType?.color || 'bg-muted'}`}>
                          {serviceType && <serviceType.icon className="w-6 h-6" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusBadge.class}`}>
                              {statusBadge.label}
                            </span>
                          </div>
                          <h3 className="font-semibold text-foreground">{serviceName}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <CalendarIcon className="w-3.5 h-3.5" />
                            <span>{formattedDate}</span>
                          </div>
                          {req.specialist && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                              <Star className="w-3.5 h-3.5" />
                              <span>{req.specialist}</span>
                            </div>
                          )}
                          {req.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {req.description}
                            </p>
                          )}
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* Service Location */}
          <div className="space-y-4">
            <h2 className="font-bold text-lg">{t("service.location")}</h2>
            <Card className="border-none shadow-sm overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 relative flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="w-10 h-10 text-primary mx-auto mb-2" />
                  <p className="text-sm font-medium">Dubai Healthcare City</p>
                </div>
              </div>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-1">Ortho Innovations L.L.C.</h3>
                <p className="text-sm text-muted-foreground mb-4">Dubai Healthcare City, Building 47, Dubai, UAE</p>
                <div className="grid grid-cols-3 gap-2">
                  <a 
                    href="tel:+97143456789" 
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Phone className="w-5 h-5" />
                    <span className="text-xs">{t("service.callClinic")}</span>
                  </a>
                  <a 
                    href="https://wa.me/97143456789" 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span className="text-xs">{t("service.sendMessage")}</span>
                  </a>
                  <a 
                    href="https://maps.google.com/?q=Dubai+Healthcare+City+Building+47"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center gap-1 p-3 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Navigation className="w-5 h-5" />
                    <span className="text-xs">{t("service.getDirections")}</span>
                  </a>
                </div>
              </CardContent>
            </Card>

            {/* Working Hours */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {language === 'ru' ? 'Часы работы' : 'Working Hours'}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Пн-Пт' : 'Mon-Fri'}</span>
                    <span className="font-medium">09:00 - 18:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Сб' : 'Sat'}</span>
                    <span className="font-medium">10:00 - 15:00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{language === 'ru' ? 'Вс' : 'Sun'}</span>
                    <span className="text-red-500">{language === 'ru' ? 'Выходной' : 'Closed'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedService && (
                <>
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedService.color}`}>
                    <selectedService.icon className="w-4 h-4" />
                  </div>
                  {t(selectedService.labelKey)}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {bookingStep === 1 
                ? (language === 'ru' ? 'Выберите дату и время' : 'Select date and time')
                : (language === 'ru' ? 'Выберите специалиста' : 'Select specialist')
              }
            </DialogDescription>
          </DialogHeader>

          {bookingStep === 1 && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={disabledDays}
                  className="rounded-md border"
                />
              </div>

              {selectedDate && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {language === 'ru' ? 'Доступное время:' : 'Available times:'}
                  </p>
                  <div className="grid grid-cols-4 gap-2">
                    {timeSlots.map((time) => (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          selectedTime === time 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {bookingStep === 2 && (
            <div className="space-y-3">
              {specialists.map((spec) => (
                <Card 
                  key={spec.id}
                  className={`border cursor-pointer transition-all ${
                    selectedSpecialist?.id === spec.id 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                  } ${!spec.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => spec.available && setSelectedSpecialist(spec)}
                >
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary">
                        {spec.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{spec.name}</p>
                      <p className="text-sm text-muted-foreground">{spec.role[language]}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-medium">{spec.rating}</span>
                        <span className="text-xs text-muted-foreground">({spec.reviews})</span>
                      </div>
                    </div>
                    {!spec.available && (
                      <span className="text-xs text-red-500">
                        {language === 'ru' ? 'Недоступен' : 'Unavailable'}
                      </span>
                    )}
                    {selectedSpecialist?.id === spec.id && (
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            {bookingStep === 2 && (
              <Button variant="outline" onClick={() => setBookingStep(1)}>
                {language === 'ru' ? 'Назад' : 'Back'}
              </Button>
            )}
            <Button 
              onClick={handleNextStep}
              disabled={
                (bookingStep === 1 && (!selectedDate || !selectedTime)) ||
                (bookingStep === 2 && !selectedSpecialist)
              }
            >
              {bookingStep === 1 
                ? (language === 'ru' ? 'Далее' : 'Next')
                : (language === 'ru' ? 'Подтвердить' : 'Confirm')
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              {language === 'ru' ? 'Запись подтверждена!' : 'Booking Confirmed!'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Card className="border-none bg-muted/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Услуга' : 'Service'}</span>
                  <span className="font-medium">{selectedService && t(selectedService.labelKey)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Дата' : 'Date'}</span>
                  <span className="font-medium">{selectedDate?.toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Время' : 'Time'}</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Специалист' : 'Specialist'}</span>
                  <span className="font-medium">{selectedSpecialist?.name}</span>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <p className="text-sm font-medium text-center">
                {language === 'ru' ? 'Добавить в календарь:' : 'Add to calendar:'}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={addToGoogleCalendar}
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Google
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={addToAppleCalendar}
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  Apple
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={handleConfirmBooking} className="w-full" disabled={isSubmitting}>
              {language === 'ru' ? 'Готово' : 'Done'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Service Request Detail Modal */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedRequest && (
                <>
                  {selectedRequest.type === 'adjustment' && <Settings className="w-6 h-6 text-primary" />}
                  {selectedRequest.type === 'checkup' && <Shield className="w-6 h-6 text-green-500" />}
                  {selectedRequest.type === 'repair' && <Wrench className="w-6 h-6 text-orange-500" />}
                  {selectedRequest.type === 'consultation' && <Zap className="w-6 h-6 text-red-500" />}
                  {language === 'ru' 
                    ? (selectedRequest.type === 'adjustment' ? 'Настройка' 
                      : selectedRequest.type === 'checkup' ? 'Осмотр' 
                      : selectedRequest.type === 'repair' ? 'Ремонт' 
                      : 'Экстренный')
                    : (selectedRequest.type === 'adjustment' ? 'Adjustment' 
                      : selectedRequest.type === 'checkup' ? 'Checkup' 
                      : selectedRequest.type === 'repair' ? 'Repair' 
                      : 'Emergency')}
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {language === 'ru' ? 'Детали заявки на сервис' : 'Service request details'}
            </DialogDescription>
          </DialogHeader>

          {selectedRequest && (
            <div className="space-y-4">
              {/* Status */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground">
                  {language === 'ru' ? 'Статус' : 'Status'}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedRequest.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                  selectedRequest.status === 'scheduled' ? 'bg-green-500/20 text-green-500' :
                  selectedRequest.status === 'in_progress' ? 'bg-blue-500/20 text-blue-500' :
                  selectedRequest.status === 'completed' ? 'bg-gray-500/20 text-gray-500' :
                  'bg-red-500/20 text-red-500'
                }`}>
                  {selectedRequest.status === 'pending' ? (language === 'ru' ? 'Ожидает' : 'Pending') :
                   selectedRequest.status === 'scheduled' ? (language === 'ru' ? 'Запланировано' : 'Scheduled') :
                   selectedRequest.status === 'in_progress' ? (language === 'ru' ? 'В работе' : 'In Progress') :
                   selectedRequest.status === 'completed' ? (language === 'ru' ? 'Завершено' : 'Completed') :
                   (language === 'ru' ? 'Отменено' : 'Cancelled')}
                </span>
              </div>

              {/* Date */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4" />
                  {language === 'ru' ? 'Дата' : 'Date'}
                </span>
                <span className="font-medium">
                  {selectedRequest.scheduledDate 
                    ? new Date(selectedRequest.scheduledDate).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })
                    : (language === 'ru' ? 'Не назначена' : 'Not scheduled')}
                </span>
              </div>

              {/* Time */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {language === 'ru' ? 'Время' : 'Time'}
                </span>
                <span className="font-medium">
                  {selectedRequest.scheduledTime || (language === 'ru' ? 'Не назначено' : 'Not scheduled')}
                </span>
              </div>

              {/* Specialist */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Star className="w-4 h-4" />
                  {language === 'ru' ? 'Специалист' : 'Specialist'}
                </span>
                <span className="font-medium">
                  {selectedRequest.specialist || (language === 'ru' ? 'Будет назначен' : 'To be assigned')}
                </span>
              </div>

              {/* Description */}
              <div className="p-3 bg-muted/50 rounded-lg">
                <span className="text-sm text-muted-foreground block mb-2">
                  {language === 'ru' ? 'Описание' : 'Description'}
                </span>
                <p className="text-sm">
                  {selectedRequest.description || (language === 'ru' ? 'Нет описания' : 'No description')}
                </p>
              </div>

              {/* Doctor's Note */}
              {selectedRequest.notes && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <span className="text-sm text-primary font-medium block mb-2">
                    {language === 'ru' ? 'Комментарий врача' : "Doctor's Note"}
                  </span>
                  <p className="text-sm">{selectedRequest.notes}</p>
                </div>
              )}

              {/* Request ID */}
              <div className="text-center text-xs text-muted-foreground">
                {language === 'ru' ? 'Номер заявки' : 'Request ID'}: ORD-{String(selectedRequest.id).padStart(5, '0')}
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            {selectedRequest?.status === 'pending' && (
              <Button 
                variant="destructive" 
                disabled={cancelRequestMutation.isPending}
                onClick={() => {
                  cancelRequestMutation.mutate({ id: selectedRequest.id });
                }}
              >
                {cancelRequestMutation.isPending 
                  ? (language === 'ru' ? 'Отмена...' : 'Cancelling...') 
                  : (language === 'ru' ? 'Отменить заявку' : 'Cancel Request')}
              </Button>
            )}
            <Button variant="outline" onClick={() => setSelectedRequest(null)}>
              {language === 'ru' ? 'Закрыть' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
