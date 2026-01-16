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
  ShieldIcon, 
  RehabIcon, 
  BookIcon, 
  ServiceIcon,
  ChevronRightIcon,
  PlayIcon,
  ProfileIcon,
  PhoneIcon,
  MapPinIcon
} from "@/components/NotionIcons";

export default function Dashboard() {
  const { t, language } = useLanguage();
  
  // Fetch data from API with caching for faster subsequent loads
  const queryOptions = { staleTime: 30000, refetchOnWindowFocus: false, retry: 1 };
  const { data: dashboardData, isLoading: dashboardLoading } = trpc.dashboard.getSummary.useQuery(undefined, queryOptions);
  const { data: todaysTasks, isLoading: tasksLoading } = trpc.rehabilitation.getTodaysTasks.useQuery(undefined, queryOptions);
  const { data: profile } = trpc.patient.getProfile.useQuery(undefined, queryOptions);
  const { data: prosthesis } = trpc.prosthesis.get.useQuery(undefined, queryOptions);
  
  const dayNumber = dashboardData?.dayOfRecovery || 1;
  const completedTasks = todaysTasks?.filter(task => task.completed).length || 0;
  const totalTasks = todaysTasks?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Dynamic greeting based on time of day
  const greetingData = getTimeBasedGreeting();
  const motivationalMessage = getMotivationalMessage(dayNumber, language);
  
  const patientName = profile?.firstName || (profile as any)?.name || "Пациент";
  const nextAppointment = dashboardData?.nextAppointment;

  // Team members from profile or default
  const teamMembers = [
    { 
      id: 1, 
      role: { ru: "Личный менеджер", en: "Personal Manager" },
      name: (profile as any)?.managerName || "Не назначен",
      phone: (profile as any)?.managerPhone || "",
      hours: { ru: "Пн-Пт 9:00-18:00", en: "Mon-Fri 9:00-18:00" }
    },
    { 
      id: 2, 
      role: { ru: "Протезист", en: "Prosthetist" },
      name: (profile as any)?.prosthetistName || "Не назначен",
      phone: (profile as any)?.prosthetistPhone || "",
      hours: { ru: "Пн-Сб 10:00-19:00", en: "Mon-Sat 10:00-19:00" }
    },
    { 
      id: 3, 
      role: { ru: "Врач ЛФК", en: "Rehab Doctor" },
      name: (profile as any)?.rehabDoctorName || "Не назначен",
      phone: (profile as any)?.rehabDoctorPhone || "",
      hours: { ru: "Пн-Пт 8:00-17:00", en: "Mon-Fri 8:00-17:00" }
    },
  ];

  const isLoading = dashboardLoading || tasksLoading;

  return (
    <AppLayout>
      <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6 lg:space-y-8 max-w-6xl mx-auto">
        {/* Greeting */}
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
            {greetingData.emoji} {greetingData.greeting[language]}, {patientName.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground text-sm lg:text-base">
            {language === 'ru' ? `День ${dayNumber} вашего пути восстановления.` : `Day ${dayNumber} of your recovery journey.`} {motivationalMessage}
          </p>
        </div>

        {/* Stats Cards - 2 cols mobile, 3 cols desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
          {/* Next Appointment */}
          <Link href="/rehabilitation">
            <Card className="border-none shadow-sm card-interactive bg-gradient-to-br from-primary/10 to-primary/5 h-full">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <CalendarIcon size={18} />
                  <span className="text-xs lg:text-sm font-medium uppercase tracking-wide">
                    {t("dashboard.nextAppointment")}
                  </span>
                </div>
                {isLoading ? (
                  <>
                    <Skeleton className="h-6 w-24 mb-1" />
                    <Skeleton className="h-4 w-20" />
                  </>
                ) : nextAppointment ? (
                  <>
                    <p className="font-bold text-lg lg:text-xl">{nextAppointment.doctorName || "Врач"}</p>
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
                    <p className="font-bold text-lg lg:text-xl">{language === 'ru' ? 'Нет записи' : 'No appointment'}</p>
                    <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Запишитесь на приём' : 'Book an appointment'}</p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Daily Goal */}
          <Link href="/rehabilitation">
            <Card className="border-none shadow-sm card-interactive h-full">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center gap-2 text-primary mb-2">
                  <CheckIcon size={18} />
                  <span className="text-xs lg:text-sm font-medium uppercase tracking-wide">
                    {t("dashboard.dailyGoal")}
                  </span>
                </div>
                {isLoading ? (
                  <>
                    <Skeleton className="h-6 w-20 mb-1" />
                    <Skeleton className="h-4 w-24" />
                  </>
                ) : (
                  <>
                    <p className="font-bold text-lg lg:text-xl">{progressPercent}% {t("dashboard.complete")}</p>
                    <p className="text-sm text-muted-foreground">
                      {totalTasks - completedTasks} {t("dashboard.exercisesRemaining")}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </Link>

          {/* Prosthesis Status - Full width on mobile */}
          <Link href="/prosthesis" className="col-span-2 lg:col-span-1">
            <Card className="border-none shadow-sm card-interactive bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 h-full">
              <CardContent className="p-4 lg:p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <ShieldIcon size={24} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs lg:text-sm font-medium text-muted-foreground uppercase tracking-wide">
                      {t("dashboard.prosthesisStatus")}
                    </p>
                    {isLoading ? (
                      <Skeleton className="h-6 w-20" />
                    ) : (
                      <>
                        <p className="font-bold text-lg lg:text-xl">{prosthesis?.warrantyStatus === 'active' ? t("dashboard.optimal") : (language === 'ru' ? 'Требует осмотра' : 'Needs inspection')}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`w-2 h-2 rounded-full ${prosthesis?.warrantyStatus === 'active' ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                          <span className={`text-xs ${prosthesis?.warrantyStatus === 'active' ? 'text-green-600' : 'text-yellow-600'} font-medium`}>
                            {prosthesis?.warrantyStatus === 'active' ? t("dashboard.activeWarranty") : (language === 'ru' ? 'Гарантия истекла' : 'Warranty expired')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <ChevronRightIcon size={20} className="text-muted-foreground hidden lg:block" />
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Main Content Grid - Single column mobile, 2 columns desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Today's Plan - Takes 2 columns on desktop */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg lg:text-xl">{t("dashboard.todaysPlan")}</h2>
              <Link 
                href="/rehabilitation" 
                className="text-sm text-primary font-medium flex items-center gap-1 hover:underline"
              >
                {t("rehab.viewAll")}
                <ChevronRightIcon size={16} />
              </Link>
            </div>

            <div className="space-y-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="border-none shadow-sm">
                    <CardContent className="p-3 lg:p-4 flex items-center gap-3">
                      <Skeleton className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : todaysTasks && todaysTasks.length > 0 ? (
                todaysTasks.map((task) => (
                  <Link key={task.id} href="/rehabilitation">
                    <Card className={`border-none shadow-sm card-interactive ${task.completed ? 'bg-muted/50' : ''}`}>
                      <CardContent className="p-3 lg:p-4 flex items-center gap-3">
                        <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center ${
                          task.completed 
                            ? 'bg-primary/10' 
                            : 'bg-accent/10'
                        }`}>
                          {task.completed ? (
                            <CheckIcon size={22} className="text-primary" />
                          ) : (
                            <PlayIcon size={22} className="text-accent" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium lg:text-lg ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1 text-xs lg:text-sm text-muted-foreground">
                            <ClockIcon size={12} />
                            {task.duration || '15'} {t("common.min")}
                          </div>
                        </div>
                        <ChevronRightIcon size={20} className="text-muted-foreground/50" />
                      </CardContent>
                    </Card>
                  </Link>
                ))
              ) : (
                <Card className="border-none shadow-sm">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    {language === 'ru' ? 'Нет заданий на сегодня' : 'No tasks for today'}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Quick Actions - Single column on desktop */}
          <div className="space-y-3">
            <h2 className="font-bold text-lg lg:text-xl">{t("dashboard.quickActions")}</h2>
            <div className="grid grid-cols-3 lg:grid-cols-1 gap-3">
              <Link href="/rehabilitation">
                <Card className="border-none shadow-sm card-interactive">
                  <CardContent className="p-4 lg:p-5 flex flex-col lg:flex-row items-center lg:gap-4 text-center lg:text-left">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-2 lg:mb-0">
                      <RehabIcon size={24} className="text-primary" />
                    </div>
                    <span className="text-xs lg:text-base font-medium">{t("dashboard.viewPlan")}</span>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/knowledge">
                <Card className="border-none shadow-sm card-interactive">
                  <CardContent className="p-4 lg:p-5 flex flex-col lg:flex-row items-center lg:gap-4 text-center lg:text-left">
                    <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-2 lg:mb-0">
                      <BookIcon size={24} className="text-secondary-foreground" />
                    </div>
                    <span className="text-xs lg:text-base font-medium">{t("dashboard.articles")}</span>
                  </CardContent>
                </Card>
              </Link>

              <Link href="/service">
                <Card className="border-none shadow-sm card-interactive">
                  <CardContent className="p-4 lg:p-5 flex flex-col lg:flex-row items-center lg:gap-4 text-center lg:text-left">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-2 lg:mb-0">
                      <ServiceIcon size={24} className="text-accent" />
                    </div>
                    <span className="text-xs lg:text-base font-medium">{t("dashboard.bookService")}</span>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>
        </div>

        {/* Team Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg lg:text-xl">{t("dashboard.yourTeam")}</h2>
            <Link 
              href="/profile" 
              className="text-sm text-primary font-medium flex items-center gap-1 hover:underline"
            >
              {t("rehab.viewAll")}
              <ChevronRightIcon size={16} />
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {teamMembers.map((member) => (
              <Card key={member.id} className="border-none shadow-sm card-interactive">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <ProfileIcon size={24} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        {member.role[language]}
                      </p>
                      <p className="font-semibold truncate">{member.name}</p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <ClockIcon size={12} />
                        {member.hours[language]}
                      </div>
                    </div>
                  </div>
                  {member.phone && (
                    <a 
                      href={`tel:${member.phone}`}
                      className="mt-3 flex items-center justify-center gap-2 p-2 rounded-lg bg-primary/5 text-primary text-sm font-medium hover:bg-primary/10 transition-colors"
                    >
                      <PhoneIcon size={16} />
                      {language === 'ru' ? 'Позвонить' : 'Call'}
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Book Service CTA */}
        <Link href="/service">
          <Card className="border-none shadow-sm card-interactive bg-gradient-to-r from-accent/10 to-accent/5">
            <CardContent className="p-4 lg:p-6 flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center">
                <ServiceIcon size={28} className="text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg">{t("dashboard.needService")}</h3>
                <p className="text-sm text-muted-foreground">{t("dashboard.bookServiceDesc")}</p>
              </div>
              <ChevronRightIcon size={24} className="text-accent" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </AppLayout>
  );
}
