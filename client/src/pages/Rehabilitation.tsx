import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { AddToCalendar } from "@/components/AddToCalendar";
import { createAppointmentEvent } from "@/lib/calendar";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  CheckIcon, 
  ClockIcon, 
  PlayIcon, 
  ChevronRightIcon,
  TrophyIcon,
  FireIcon,
  CalendarIcon,
  TargetIcon
} from "@/components/NotionIcons";

export default function Rehabilitation() {
  const { t, language } = useLanguage();
  const utils = trpc.useUtils();
  
  // Fetch data from API with caching
  const queryOptions = { staleTime: 30000, refetchOnWindowFocus: false, retry: 1 };
  const { data: plan, isLoading: planLoading } = trpc.rehabilitation.getPlan.useQuery(undefined, queryOptions);
  const { data: phases, isLoading: phasesLoading } = trpc.rehabilitation.getPhases.useQuery(
    { planId: plan?.id || 0 },
    { enabled: !!plan?.id, ...queryOptions }
  );
  const { data: todaysTasks, isLoading: tasksLoading } = trpc.rehabilitation.getTodaysTasks.useQuery(undefined, queryOptions);
  const { data: appointments, isLoading: appointmentsLoading } = trpc.appointments.getAll.useQuery(undefined, queryOptions);
  const { data: achievements } = trpc.achievements.getAll.useQuery(undefined, queryOptions);
  
  // Complete task mutation
  const completeTaskMutation = trpc.rehabilitation.completeTask.useMutation({
    onSuccess: () => {
      utils.rehabilitation.getTodaysTasks.invalidate();
      utils.dashboard.getSummary.invalidate();
      toast.success(language === 'ru' ? 'Задание выполнено!' : 'Task completed!');
    },
    onError: () => {
      toast.error(language === 'ru' ? 'Ошибка при выполнении' : 'Error completing task');
    }
  });
  
  const handleCompleteTask = (taskId: number) => {
    completeTaskMutation.mutate({ taskId });
  };
  
  const completedTasks = todaysTasks?.filter(task => task.completed).length || 0;
  const totalTasks = todaysTasks?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  // Calculate stats from achievements or defaults
  const exercisesCompleted = achievements?.length || 0;
  const activeMinutes = 45; // Default value
  const streak = 7; // Default value

  const isLoading = planLoading || tasksLoading;

  return (
    <AppLayout>
      <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6 lg:space-y-8 max-w-6xl mx-auto">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-bold">{t("rehab.title")}</h1>
          <p className="text-muted-foreground text-sm lg:text-base">{t("rehab.subtitle")}</p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-3 lg:gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
                <TrophyIcon size={22} className="text-primary" />
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-12 mx-auto mb-1" />
              ) : (
                <p className="text-xl lg:text-2xl font-bold">{exercisesCompleted}</p>
              )}
              <p className="text-xs lg:text-sm text-muted-foreground">{t("rehab.exercisesCompleted")}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-2">
                <ClockIcon size={22} className="text-accent" />
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-16 mx-auto mb-1" />
              ) : (
                <p className="text-xl lg:text-2xl font-bold">{activeMinutes.toLocaleString()}</p>
              )}
              <p className="text-xs lg:text-sm text-muted-foreground">{t("rehab.activeMinutes")}</p>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center mx-auto mb-2">
                <FireIcon size={22} className="text-orange-500" />
              </div>
              {isLoading ? (
                <Skeleton className="h-7 w-8 mx-auto mb-1" />
              ) : (
                <p className="text-xl lg:text-2xl font-bold">{streak}</p>
              )}
              <p className="text-xs lg:text-sm text-muted-foreground">{t("rehab.streak")} {t("rehab.days")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Today's Tasks */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg lg:text-xl">{t("rehab.todaysTasks")}</h2>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{completedTasks}/{totalTasks}</span>
                <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {tasksLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="border-none shadow-sm">
                    <CardContent className="p-4 flex items-center gap-3">
                      <Skeleton className="w-12 h-12 rounded-xl" />
                      <div className="flex-1">
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))
              ) : todaysTasks && todaysTasks.length > 0 ? (
                todaysTasks.map((task) => (
                  <Card key={task.id} className={`border-none shadow-sm ${task.completed ? 'bg-muted/50' : ''}`}>
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        task.completed 
                          ? 'bg-primary/10' 
                          : 'bg-accent/10'
                      }`}>
                        {task.completed ? (
                          <CheckIcon size={24} className="text-primary" />
                        ) : (
                          <PlayIcon size={24} className="text-accent" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ClockIcon size={14} />
                          <span>{task.duration || '15'} {t("common.min")}</span>
                          {task.type && (
                            <span className="px-2 py-0.5 bg-muted rounded text-xs capitalize">
                              {task.type}
                            </span>
                          )}
                        </div>
                      </div>
                      {!task.completed && (
                        <Button 
                          size="sm" 
                          onClick={() => handleCompleteTask(task.id)}
                          disabled={completeTaskMutation.isPending}
                        >
                          {language === 'ru' ? 'Выполнить' : 'Complete'}
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))
              ) : (
                <Card className="border-none shadow-sm">
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <TargetIcon size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="font-medium">{language === 'ru' ? 'Нет заданий на сегодня' : 'No tasks for today'}</p>
                    <p className="text-sm">{language === 'ru' ? 'Отдохните или просмотрите план' : 'Take a rest or review your plan'}</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Phases Progress */}
            <div className="space-y-3">
              <h2 className="font-bold text-lg">{t("rehab.phases")}</h2>
              <div className="space-y-2">
                {phasesLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="border-none shadow-sm">
                      <CardContent className="p-3">
                        <Skeleton className="h-5 w-full mb-2" />
                        <Skeleton className="h-2 w-full" />
                      </CardContent>
                    </Card>
                  ))
                ) : phases && phases.length > 0 ? (
                  phases.map((phase) => (
                    <Card key={phase.id} className={`border-none shadow-sm ${phase.status === 'current' ? 'ring-2 ring-primary' : ''}`}>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-medium text-sm ${phase.status === 'completed' ? 'text-muted-foreground' : ''}`}>
                            {phase.name}
                          </span>
                          {phase.status === 'completed' && (
                            <CheckIcon size={16} className="text-primary" />
                          )}
                        </div>
                        <Progress value={phase.progress || 0} className="h-1.5" />
                        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                          <span>{phase.completedTasks || 0}/{phase.totalTasks || 0} {language === 'ru' ? 'заданий' : 'tasks'}</span>
                          <span>{phase.progress || 0}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="border-none shadow-sm">
                    <CardContent className="p-4 text-center text-muted-foreground text-sm">
                      {language === 'ru' ? 'План не назначен' : 'No plan assigned'}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

            {/* Upcoming Appointments */}
            <div className="space-y-3">
              <h2 className="font-bold text-lg">{t("rehab.upcomingAppointments")}</h2>
              <div className="space-y-2">
                {appointmentsLoading ? (
                  Array.from({ length: 2 }).map((_, i) => (
                    <Card key={i} className="border-none shadow-sm">
                      <CardContent className="p-3">
                        <Skeleton className="h-5 w-full mb-2" />
                        <Skeleton className="h-4 w-24" />
                      </CardContent>
                    </Card>
                  ))
                ) : appointments && appointments.length > 0 ? (
                  appointments.slice(0, 3).map((apt) => (
                    <Card key={apt.id} className="border-none shadow-sm">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">{apt.title}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                              <CalendarIcon size={12} />
                              <span>
                                {new Date(apt.scheduledAt).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}, {new Date(apt.scheduledAt).toLocaleTimeString(language === 'ru' ? 'ru-RU' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                          <AddToCalendar 
                            event={createAppointmentEvent(
                              apt.doctorName || apt.title,
                              new Date(apt.scheduledAt),
                              apt.duration || 60,
                              apt.location || ''
                            )}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Card className="border-none shadow-sm">
                    <CardContent className="p-4 text-center text-muted-foreground text-sm">
                      {language === 'ru' ? 'Нет предстоящих приёмов' : 'No upcoming appointments'}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
