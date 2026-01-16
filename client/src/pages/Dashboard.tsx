import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import { getTimeBasedGreeting, getMotivationalMessage } from "@/lib/greeting";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CalendarIcon, 
  CheckIcon, 
  ClockIcon, 
  SpineIcon, 
  RehabIcon, 
  DocumentIcon, 
  MessageIcon,
  ChevronRightIcon,
  PlayIcon,
  ProfileIcon,
  PhoneIcon,
  MapPinIcon,
  CorsetIcon,
  ShieldIcon
} from "@/components/NotionIcons";

export default function Dashboard() {
  const { t, language } = useLanguage();
  
  // Fetch data from API with caching
  const queryOptions = { staleTime: 30000, refetchOnWindowFocus: false, retry: 1 };
  const { data: dashboardData, isLoading: dashboardLoading } = trpc.dashboard.getSummary.useQuery(undefined, queryOptions);
  const { data: todaysTasks, isLoading: tasksLoading } = trpc.rehabilitation.getTodaysTasks.useQuery(undefined, queryOptions);
  const { data: profile } = trpc.patient.getProfile.useQuery(undefined, queryOptions);
  
  const dayNumber = dashboardData?.dayOfRecovery || 1;
  const completedTasks = todaysTasks?.filter(task => task.completed).length || 0;
  const totalTasks = todaysTasks?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Dynamic greeting
  const greetingData = getTimeBasedGreeting();
  const motivationalMessage = getMotivationalMessage(dayNumber, language);
  
  const patientName = profile?.firstName || (profile as any)?.name || "Пациент";
  const nextAppointment = dashboardData?.nextAppointment;

  const isLoading = dashboardLoading || tasksLoading;

  // Quick actions for Scoliologic
  const quickActions = [
    { 
      icon: RehabIcon, 
      label: language === 'ru' ? 'План лечения' : 'Treatment Plan', 
      href: '/rehabilitation',
      color: 'scolio-card-lime'
    },
    { 
      icon: DocumentIcon, 
      label: language === 'ru' ? 'Документы' : 'Documents', 
      href: '/documents',
      color: 'scolio-card-teal'
    },
    { 
      icon: CorsetIcon, 
      label: language === 'ru' ? 'Мои изделия' : 'My Devices', 
      href: '/prosthesis',
      color: 'scolio-card-orange'
    },
    { 
      icon: MessageIcon, 
      label: language === 'ru' ? 'Написать врачу' : 'Message Doctor', 
      href: '/messages',
      color: 'scolio-card-mint'
    },
  ];

  return (
    <AppLayout>
      <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6 lg:space-y-8 max-w-6xl mx-auto">
        {/* Greeting */}
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            {greetingData.emoji} {greetingData.greeting[language]}, {patientName.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            {language === 'ru' ? `День ${dayNumber} вашего лечения.` : `Day ${dayNumber} of your treatment.`} {motivationalMessage}
          </p>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={index} href={action.href}>
                <div className={`scolio-card ${action.color} p-4 lg:p-5 h-full card-interactive`}>
                  <div className="flex flex-col items-start gap-3">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white/30 flex items-center justify-center">
                      <Icon size={24} className="text-current" />
                    </div>
                    <span className="font-semibold text-sm lg:text-base">{action.label}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Next Appointment */}
          <Link href="/rehabilitation">
            <Card className="scolio-feature-card card-interactive h-full">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <CalendarIcon size={20} className="text-accent" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {language === 'ru' ? 'Следующий приём' : 'Next Appointment'}
                  </span>
                </div>
                {isLoading ? (
                  <>
                    <Skeleton className="h-6 w-32 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </>
                ) : nextAppointment ? (
                  <>
                    <p className="font-bold text-lg">{nextAppointment.doctorName || "Врач"}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(nextAppointment.scheduledAt).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short' 
                      })}, {new Date(nextAppointment.scheduledAt).toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-lg">{language === 'ru' ? 'Нет записи' : 'No appointment'}</p>
                    <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Запишитесь на приём' : 'Book an appointment'}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Daily Progress */}
          <Link href="/rehabilitation">
            <Card className="scolio-feature-card card-interactive h-full">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CheckIcon size={20} className="text-[hsl(75,100%,35%)]" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {language === 'ru' ? 'Прогресс за день' : 'Daily Progress'}
                  </span>
                </div>
                {isLoading ? (
                  <>
                    <Skeleton className="h-6 w-24 mb-2" />
                    <Skeleton className="h-3 w-full" />
                  </>
                ) : (
                  <>
                    <p className="font-bold text-lg mb-2">{completedTasks} / {totalTasks} {language === 'ru' ? 'заданий' : 'tasks'}</p>
                    <div className="progress-scolio">
                      <div className="progress-scolio-bar" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Treatment Status */}
          <Link href="/prosthesis">
            <Card className="scolio-feature-card card-interactive h-full bg-gradient-to-br from-accent/5 to-accent/10">
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                    <SpineIcon size={20} className="text-accent" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    {language === 'ru' ? 'Статус лечения' : 'Treatment Status'}
                  </span>
                </div>
                <p className="font-bold text-lg">{language === 'ru' ? 'Корсетотерапия' : 'Corset Therapy'}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-sm text-accent font-medium">
                    {language === 'ru' ? 'Активное лечение' : 'Active Treatment'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Today's Plan */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg lg:text-xl">{language === 'ru' ? 'План на сегодня' : "Today's Plan"}</h2>
              <Link 
                href="/rehabilitation" 
                className="text-sm text-accent font-medium flex items-center gap-1 hover:underline"
              >
                {language === 'ru' ? 'Все задания' : 'View all'}
                <ChevronRightIcon size={16} />
              </Link>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="scolio-feature-card">
                    <CardContent className="p-4 flex items-center gap-4">
                      <Skeleton className="w-12 h-12 rounded-xl" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-40 mb-2" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : todaysTasks && todaysTasks.length > 0 ? (
                todaysTasks.slice(0, 4).map((task, index) => (
                  <Link key={task.id} href="/rehabilitation">
                    <Card className={`scolio-feature-card card-interactive animate-fade-in stagger-item ${task.completed ? 'opacity-60' : ''}`}>
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          task.completed 
                            ? 'bg-accent/20' 
                            : 'bg-primary/20'
                        }`}>
                          {task.completed ? (
                            <CheckIcon size={24} className="text-accent" />
                          ) : (
                            <PlayIcon size={24} className="text-[hsl(75,100%,35%)]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <ClockIcon size={14} />
                            <span>{task.duration || '15'} {language === 'ru' ? 'мин' : 'min'}</span>
                          </div>
                        </div>
                        <ChevronRightIcon size={20} className="text-muted-foreground/50" />
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <Card className="scolio-feature-card">
                  <CardContent className="p-8 text-center">
                    <div className="empty-state">
                      <RehabIcon className="empty-state-icon" size={48} />
                      <p className="empty-state-title">{language === 'ru' ? 'Нет заданий на сегодня' : 'No tasks for today'}</p>
                      <p className="empty-state-description">{language === 'ru' ? 'Отдохните или изучите базу знаний' : 'Rest or explore the knowledge base'}</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar - Contacts & Info */}
          <div className="space-y-4">
            {/* Your Team */}
            <div className="space-y-3">
              <h2 className="font-bold text-lg">{language === 'ru' ? 'Ваши врачи' : 'Your Doctors'}</h2>
              
              <Card className="scolio-feature-card">
                <CardContent className="p-4 space-y-4">
                  {/* Orthopedist */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white font-bold text-sm">
                      ОВ
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">Ортопед-вертебролог</p>
                      <p className="text-xs text-muted-foreground">Иванов И.И.</p>
                    </div>
                    <Link href="/messages" className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center hover:bg-accent/20 transition-colors">
                      <MessageIcon size={16} className="text-accent" />
                    </Link>
                  </div>
                  
                  <div className="divider-scolio" />
                  
                  {/* LFK Doctor */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[hsl(75,100%,45%)] flex items-center justify-center text-[hsl(220,20%,15%)] font-bold text-sm">
                      ЛФ
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">Врач ЛФК</p>
                      <p className="text-xs text-muted-foreground">Петрова А.С.</p>
                    </div>
                    <Link href="/messages" className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors">
                      <MessageIcon size={16} className="text-[hsl(75,100%,35%)]" />
                    </Link>
                  </div>
                  
                  <div className="divider-scolio" />
                  
                  {/* Manager */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[hsl(30,100%,70%)] flex items-center justify-center text-[hsl(220,20%,15%)] font-bold text-sm">
                      МН
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">Менеджер</p>
                      <p className="text-xs text-muted-foreground">Сидорова М.В.</p>
                    </div>
                    <Link href="/messages" className="w-8 h-8 rounded-full bg-[hsl(30,100%,70%)]/20 flex items-center justify-center hover:bg-[hsl(30,100%,70%)]/30 transition-colors">
                      <MessageIcon size={16} className="text-[hsl(30,100%,50%)]" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Nearest Center */}
            <div className="space-y-3">
              <h2 className="font-bold text-lg">{language === 'ru' ? 'Ближайший центр' : 'Nearest Center'}</h2>
              
              <Card className="scolio-feature-card">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                      <MapPinIcon size={20} className="text-accent" />
                    </div>
                    <div>
                      <p className="font-semibold">Scoliologic Москва</p>
                      <p className="text-sm text-muted-foreground">ул. Примерная, 15</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <a 
                      href="tel:+74951234567" 
                      className="flex-1 btn-scolio-outline text-center text-sm py-2"
                    >
                      <PhoneIcon size={16} className="inline mr-1" />
                      {language === 'ru' ? 'Позвонить' : 'Call'}
                    </a>
                    <a 
                      href="https://maps.google.com" 
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 btn-scolio-secondary text-center text-sm py-2"
                    >
                      <MapPinIcon size={16} className="inline mr-1" />
                      {language === 'ru' ? 'Маршрут' : 'Directions'}
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Secure Messaging Banner */}
            <Card className="scolio-card scolio-card-teal">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-2">
                  <ShieldIcon size={24} className="text-white" />
                  <p className="font-bold text-white">{language === 'ru' ? 'Защищённый чат' : 'Secure Chat'}</p>
                </div>
                <p className="text-sm text-white/80 mb-3">
                  {language === 'ru' 
                    ? 'Все сообщения защищены сквозным шифрованием' 
                    : 'All messages are end-to-end encrypted'}
                </p>
                <Link href="/messages" className="btn-scolio-primary inline-block text-sm py-2 px-4">
                  {language === 'ru' ? 'Открыть чат' : 'Open Chat'}
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
