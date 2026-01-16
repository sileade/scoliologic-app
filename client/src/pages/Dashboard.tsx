import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import { getTimeBasedGreeting } from "@/lib/greeting";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CalendarIcon, 
  CheckIcon, 
  SpineIcon, 
  RehabIcon, 
  DocumentIcon, 
  MessageIcon,
  ChevronRightIcon,
  CorsetIcon,
} from "@/components/NotionIcons";

export default function Dashboard() {
  const { language } = useLanguage();
  
  // Fetch data from API with caching
  const queryOptions = { staleTime: 30000, refetchOnWindowFocus: false, retry: 1 };
  const { data: dashboardData, isLoading: dashboardLoading } = trpc.dashboard.getSummary.useQuery(undefined, queryOptions);
  const { data: todaysTasks, isLoading: tasksLoading } = trpc.rehabilitation.getTodaysTasks.useQuery(undefined, queryOptions);
  const { data: profile } = trpc.patient.getProfile.useQuery(undefined, queryOptions);
  
  const dayNumber = dashboardData?.dayOfRecovery || 1;
  const completedTasks = todaysTasks?.filter(task => task.completed).length || 0;
  const totalTasks = todaysTasks?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const greetingData = getTimeBasedGreeting();
  const patientName = profile?.firstName || (profile as any)?.name || "Пациент";
  const nextAppointment = dashboardData?.nextAppointment;
  const isLoading = dashboardLoading || tasksLoading;

  // Simplified quick actions - only 4 main actions
  const quickActions = [
    { 
      icon: MessageIcon, 
      label: language === 'ru' ? 'Чат с врачом' : 'Chat', 
      href: '/messages',
      color: 'bg-accent text-accent-foreground'
    },
    { 
      icon: RehabIcon, 
      label: language === 'ru' ? 'Упражнения' : 'Exercises', 
      href: '/rehabilitation',
      color: 'bg-primary/10 text-primary'
    },
    { 
      icon: DocumentIcon, 
      label: language === 'ru' ? 'Документы' : 'Documents', 
      href: '/documents',
      color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600'
    },
    { 
      icon: CorsetIcon, 
      label: language === 'ru' ? 'Изделия' : 'Devices', 
      href: '/prosthesis',
      color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600'
    },
  ];

  return (
    <AppLayout>
      <div className="px-4 py-6 lg:px-8 space-y-6 max-w-2xl mx-auto">
        {/* Greeting - simplified */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-foreground">
            {greetingData.greeting[language]}, {patientName.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground text-sm">
            {language === 'ru' ? `День ${dayNumber} лечения` : `Day ${dayNumber} of treatment`}
          </p>
        </div>

        {/* Quick Actions - compact grid */}
        <div className="grid grid-cols-4 gap-2">
          {quickActions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Link key={index} href={action.href}>
                <div className={`${action.color} rounded-2xl p-3 flex flex-col items-center gap-2 transition-transform active:scale-95`}>
                  <Icon size={24} />
                  <span className="text-xs font-medium text-center leading-tight">{action.label}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Next Appointment - main card */}
        <Link href="/rehabilitation">
          <Card className="card-interactive">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <CalendarIcon size={24} className="text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">
                    {language === 'ru' ? 'Следующий приём' : 'Next Appointment'}
                  </p>
                  {isLoading ? (
                    <Skeleton className="h-5 w-32" />
                  ) : nextAppointment ? (
                    <>
                      <p className="font-semibold truncate">{nextAppointment.doctorName || "Врач"}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(nextAppointment.scheduledAt).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { 
                          weekday: 'short', day: 'numeric', month: 'short' 
                        })}, {new Date(nextAppointment.scheduledAt).toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </>
                  ) : (
                    <p className="font-semibold text-muted-foreground">
                      {language === 'ru' ? 'Нет записи' : 'No appointment'}
                    </p>
                  )}
                </div>
                <ChevronRightIcon size={20} className="text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Daily Progress - simplified */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CheckIcon size={20} className="text-[hsl(75,100%,35%)]" />
                </div>
                <div>
                  <p className="font-semibold">
                    {language === 'ru' ? 'Задания на сегодня' : "Today's Tasks"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isLoading ? '...' : `${completedTasks} / ${totalTasks}`}
                  </p>
                </div>
              </div>
              <Link href="/rehabilitation">
                <span className="text-sm text-accent font-medium">
                  {language === 'ru' ? 'Открыть' : 'Open'}
                </span>
              </Link>
            </div>
            {isLoading ? (
              <Skeleton className="h-2 w-full rounded-full" />
            ) : (
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[hsl(75,100%,50%)] rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Treatment Status - compact */}
        <Link href="/prosthesis">
          <Card className="card-interactive bg-gradient-to-br from-accent/5 to-accent/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent/20 flex items-center justify-center">
                  <SpineIcon size={24} className="text-accent" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{language === 'ru' ? 'Корсетотерапия' : 'Corset Therapy'}</p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                    <span className="text-sm text-accent">
                      {language === 'ru' ? 'Активное лечение' : 'Active'}
                    </span>
                  </div>
                </div>
                <ChevronRightIcon size={20} className="text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Today's Tasks Preview - only show first 3 */}
        {!isLoading && todaysTasks && todaysTasks.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{language === 'ru' ? 'Ближайшие задания' : 'Upcoming Tasks'}</h2>
            </div>
            <div className="space-y-2">
              {todaysTasks.slice(0, 3).map((task) => (
                <Link key={task.id} href="/rehabilitation">
                  <Card className={`card-interactive ${task.completed ? 'opacity-60' : ''}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        task.completed ? 'bg-accent/20' : 'bg-muted'
                      }`}>
                        {task.completed ? (
                          <CheckIcon size={16} className="text-accent" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border-2 border-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{task.duration} мин</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
