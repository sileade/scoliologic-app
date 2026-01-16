import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  ChevronLeft, ChevronRight, Plus, Clock, User, MapPin,
  Calendar as CalendarIcon, Video, Phone, MoreVertical, X
} from "lucide-react";

interface Appointment {
  id: number;
  title: string;
  patient: string;
  time: string;
  duration: number;
  type: 'checkup' | 'adjustment' | 'consultation' | 'repair';
  status: 'scheduled' | 'completed' | 'cancelled';
  location?: string;
  notes?: string;
}

interface DaySchedule {
  date: Date;
  appointments: Appointment[];
}

const generateWeekSchedule = (startDate: Date): DaySchedule[] => {
  const appointments: { [key: string]: Appointment[] } = {
    "Mon": [
      { id: 1, title: "Ежегодный осмотр", patient: "Иван Петров", time: "09:00", duration: 60, type: "checkup", status: "scheduled" },
      { id: 2, title: "Настройка протеза", patient: "Мария Иванова", time: "10:30", duration: 45, type: "adjustment", status: "scheduled" },
      { id: 3, title: "Консультация", patient: "Алексей Смирнов", time: "14:00", duration: 30, type: "consultation", status: "scheduled" },
    ],
    "Tue": [
      { id: 4, title: "Ремонт протеза", patient: "Елена Козлова", time: "09:30", duration: 90, type: "repair", status: "scheduled" },
      { id: 5, title: "Осмотр", patient: "Дмитрий Волков", time: "11:30", duration: 60, type: "checkup", status: "scheduled" },
    ],
    "Wed": [
      { id: 6, title: "Консультация", patient: "Анна Сидорова", time: "10:00", duration: 30, type: "consultation", status: "scheduled" },
      { id: 7, title: "Настройка", patient: "Петр Николаев", time: "11:00", duration: 45, type: "adjustment", status: "scheduled" },
      { id: 8, title: "Осмотр", patient: "Ольга Федорова", time: "15:00", duration: 60, type: "checkup", status: "scheduled" },
    ],
    "Thu": [
      { id: 9, title: "Ремонт", patient: "Сергей Морозов", time: "09:00", duration: 120, type: "repair", status: "scheduled" },
      { id: 10, title: "Консультация", patient: "Наталья Белова", time: "14:30", duration: 30, type: "consultation", status: "scheduled" },
    ],
    "Fri": [
      { id: 11, title: "Осмотр", patient: "Виктор Кузнецов", time: "09:30", duration: 60, type: "checkup", status: "scheduled" },
      { id: 12, title: "Настройка", patient: "Татьяна Попова", time: "11:00", duration: 45, type: "adjustment", status: "scheduled" },
      { id: 13, title: "Консультация", patient: "Андрей Соколов", time: "16:00", duration: 30, type: "consultation", status: "scheduled" },
    ],
    "Sat": [
      { id: 14, title: "Экстренный осмотр", patient: "Михаил Лебедев", time: "10:00", duration: 60, type: "checkup", status: "scheduled" },
    ],
    "Sun": [],
  };

  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const schedule: DaySchedule[] = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dayName = days[date.getDay()];
    schedule.push({
      date,
      appointments: appointments[dayName] || []
    });
  }
  
  return schedule;
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "checkup": return "bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300";
    case "adjustment": return "bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300";
    case "consultation": return "bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300";
    case "repair": return "bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300";
    default: return "bg-gray-100 border-gray-300 text-gray-800";
  }
};

export default function AdminCalendar() {
  const { language } = useLanguage();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [showEventModal, setShowEventModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedDay, setSelectedDay] = useState<DaySchedule | null>(null);

  // Get Monday of current week
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const weekStart = getWeekStart(currentDate);
  const weekSchedule = generateWeekSchedule(weekStart);

  const navigateWeek = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatWeekRange = () => {
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return `${formatDate(weekStart)} - ${formatDate(weekEnd)}`;
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { weekday: 'short' });
  };

  const timeSlots = Array.from({ length: 10 }, (_, i) => `${(i + 9).toString().padStart(2, '0')}:00`);

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setShowEventModal(true);
  };

  const handleDayClick = (day: DaySchedule) => {
    setSelectedDay(day);
    setViewMode('day');
  };

  const stats = {
    todayAppointments: weekSchedule.find(d => isToday(d.date))?.appointments.length || 0,
    weekAppointments: weekSchedule.reduce((sum, d) => sum + d.appointments.length, 0),
    freeSlots: 35 - weekSchedule.reduce((sum, d) => sum + d.appointments.length, 0),
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">
              {language === 'ru' ? 'Календарь' : 'Calendar'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ru' ? 'Расписание приемов и записей' : 'Appointments and schedule'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday}>
              {language === 'ru' ? 'Сегодня' : 'Today'}
            </Button>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Новая запись' : 'New Appointment'}
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{stats.todayAppointments}</p>
              <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Сегодня' : 'Today'}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold">{stats.weekAppointments}</p>
              <p className="text-sm text-muted-foreground">{language === 'ru' ? 'На неделе' : 'This Week'}</p>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{stats.freeSlots}</p>
              <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Свободных' : 'Free Slots'}</p>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigateWeek(-1)}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-lg font-semibold min-w-[200px] text-center">
              {formatWeekRange()}
            </h2>
            <Button variant="ghost" size="icon" onClick={() => navigateWeek(1)}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex gap-1 bg-muted rounded-lg p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'week' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {language === 'ru' ? 'Неделя' : 'Week'}
            </button>
            <button
              onClick={() => setViewMode('day')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'day' ? 'bg-background shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {language === 'ru' ? 'День' : 'Day'}
            </button>
          </div>
        </div>

        {/* Week View */}
        {viewMode === 'week' && (
          <Card className="border-none shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <div className="grid grid-cols-7 border-b">
                {weekSchedule.map((day, index) => (
                  <div 
                    key={index}
                    className={`p-3 text-center border-r last:border-r-0 cursor-pointer hover:bg-muted/50 transition-colors ${
                      isToday(day.date) ? 'bg-primary/10' : ''
                    }`}
                    onClick={() => handleDayClick(day)}
                  >
                    <p className="text-xs text-muted-foreground uppercase">{getDayName(day.date)}</p>
                    <p className={`text-lg font-semibold ${isToday(day.date) ? 'text-primary' : ''}`}>
                      {day.date.getDate()}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {day.appointments.length} {language === 'ru' ? 'зап.' : 'apt.'}
                    </p>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 min-h-[400px]">
                {weekSchedule.map((day, dayIndex) => (
                  <div 
                    key={dayIndex} 
                    className={`border-r last:border-r-0 p-2 space-y-1 ${
                      day.date.getDay() === 0 ? 'bg-muted/30' : ''
                    }`}
                  >
                    {day.appointments.map((apt) => (
                      <div
                        key={apt.id}
                        className={`p-2 rounded-lg border text-xs cursor-pointer hover:opacity-80 transition-opacity ${getTypeColor(apt.type)}`}
                        onClick={() => handleAppointmentClick(apt)}
                      >
                        <p className="font-medium truncate">{apt.time}</p>
                        <p className="truncate">{apt.patient}</p>
                      </div>
                    ))}
                    {day.appointments.length === 0 && day.date.getDay() !== 0 && (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                        {language === 'ru' ? 'Нет записей' : 'No appointments'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Day View */}
        {viewMode === 'day' && (
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="space-y-2">
                {timeSlots.map((time) => {
                  const dayData = selectedDay || weekSchedule.find(d => isToday(d.date)) || weekSchedule[0];
                  const appointment = dayData.appointments.find(a => a.time === time);
                  
                  return (
                    <div key={time} className="flex gap-4 items-start">
                      <div className="w-16 text-sm text-muted-foreground py-2">{time}</div>
                      <div className="flex-1 min-h-[60px] border-l pl-4">
                        {appointment ? (
                          <div 
                            className={`p-3 rounded-lg border cursor-pointer ${getTypeColor(appointment.type)}`}
                            onClick={() => handleAppointmentClick(appointment)}
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{appointment.title}</p>
                              <span className="text-xs">{appointment.duration} мин</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-sm">
                              <User className="w-3 h-3" />
                              {appointment.patient}
                            </div>
                          </div>
                        ) : (
                          <div className="h-full border-b border-dashed" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-4 justify-center">
          {[
            { type: 'checkup', label: language === 'ru' ? 'Осмотр' : 'Check-up' },
            { type: 'adjustment', label: language === 'ru' ? 'Настройка' : 'Adjustment' },
            { type: 'consultation', label: language === 'ru' ? 'Консультация' : 'Consultation' },
            { type: 'repair', label: language === 'ru' ? 'Ремонт' : 'Repair' },
          ].map((item) => (
            <div key={item.type} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${getTypeColor(item.type).split(' ')[0]}`} />
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Event Details Modal */}
      <Dialog open={showEventModal} onOpenChange={setShowEventModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedAppointment?.title}</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className={`p-3 rounded-lg ${getTypeColor(selectedAppointment.type)}`}>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{selectedAppointment.time} • {selectedAppointment.duration} {language === 'ru' ? 'мин' : 'min'}</span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Пациент' : 'Patient'}</p>
                    <p className="font-medium">{selectedAppointment.patient}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Место' : 'Location'}</p>
                    <p className="font-medium">Ortho Innovations, Dubai Healthcare City</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1">
                  <Phone className="w-4 h-4 mr-2" />
                  {language === 'ru' ? 'Позвонить' : 'Call'}
                </Button>
                <Button variant="outline" className="flex-1">
                  <Video className="w-4 h-4 mr-2" />
                  {language === 'ru' ? 'Видео' : 'Video'}
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventModal(false)}>
              {language === 'ru' ? 'Закрыть' : 'Close'}
            </Button>
            <Button>
              {language === 'ru' ? 'Редактировать' : 'Edit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Appointment Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'ru' ? 'Новая запись' : 'New Appointment'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{language === 'ru' ? 'Пациент' : 'Patient'}</label>
              <Input placeholder={language === 'ru' ? "Выберите пациента" : "Select patient"} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">{language === 'ru' ? 'Дата' : 'Date'}</label>
                <Input type="date" />
              </div>
              <div>
                <label className="text-sm font-medium">{language === 'ru' ? 'Время' : 'Time'}</label>
                <Input type="time" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">{language === 'ru' ? 'Тип услуги' : 'Service Type'}</label>
              <select className="w-full mt-1 p-2 border rounded-md bg-background">
                <option value="checkup">{language === 'ru' ? 'Осмотр' : 'Check-up'}</option>
                <option value="adjustment">{language === 'ru' ? 'Настройка' : 'Adjustment'}</option>
                <option value="consultation">{language === 'ru' ? 'Консультация' : 'Consultation'}</option>
                <option value="repair">{language === 'ru' ? 'Ремонт' : 'Repair'}</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </Button>
            <Button onClick={() => { setShowCreateModal(false); toast.success(language === 'ru' ? 'Запись создана' : 'Appointment created'); }}>
              {language === 'ru' ? 'Создать' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
