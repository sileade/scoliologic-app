import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  UsersIcon, 
  CalendarIcon, 
  ChartIcon, 
  ServiceIcon,
  ChevronRightIcon,
  TrophyIcon,
  BellIcon
} from "@/components/NotionIcons";

export default function AdminDashboard() {
  const { t, language } = useLanguage();

  // Fetch admin dashboard data from API with caching
  const queryOptions = { staleTime: 30000, refetchOnWindowFocus: false, retry: 1 };
  const { data: dashboardStats, isLoading: statsLoading } = trpc.admin.getDashboardStats.useQuery(undefined, queryOptions);
  const { data: recentPatients, isLoading: patientsLoading } = trpc.admin.getPatients.useQuery(undefined, queryOptions);
  // Pending tasks - using orders as proxy
  const { data: pendingOrders, isLoading: tasksLoading } = trpc.admin.getOrders.useQuery(undefined, queryOptions);
  const pendingTasks = (pendingOrders || []).slice(0, 5).map((o: any) => ({
    id: o.id,
    type: 'order',
    title: o.serviceType || 'Заявка на сервис',
    patient: o.patientName || 'Patient',
    time: o.createdAt ? new Date(o.createdAt).toLocaleString() : ''
  }));

  const stats = [
    { 
      key: "totalPatients", 
      value: dashboardStats?.totalPatients?.toString() || "0", 
      change: "+0%",
      icon: UsersIcon,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    { 
      key: "activeToday", 
      value: dashboardStats?.activeRehabPlans?.toString() || "0", 
      change: "+0%",
      icon: ChartIcon,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30"
    },
    { 
      key: "pendingOrders", 
      value: dashboardStats?.pendingOrders?.toString() || "0", 
      change: "0",
      icon: ServiceIcon,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30"
    },
    { 
      key: "appointmentsToday", 
      value: dashboardStats?.todayAppointments?.toString() || "0", 
      change: "",
      icon: CalendarIcon,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30"
    },
  ];

  const isLoading = statsLoading;

  return (
    <AdminLayout title={t("admin.dashboard.title")}>
      <div className="space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.key} className="border-none shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {t(`admin.dashboard.${stat.key}`)}
                      </p>
                      {isLoading ? (
                        <Skeleton className="h-8 w-20 mt-1" />
                      ) : (
                        <p className="text-2xl font-bold mt-1">{stat.value}</p>
                      )}
                      {stat.change && (
                        <p className={`text-xs mt-1 ${stat.change.startsWith('+') ? 'text-green-600' : stat.change.startsWith('-') ? 'text-red-600' : 'text-muted-foreground'}`}>
                          {stat.change} {language === 'ru' ? 'за неделю' : 'this week'}
                        </p>
                      )}
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                      <Icon size={24} className={stat.color} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Patients */}
          <div className="lg:col-span-2">
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold">
                  {language === 'ru' ? 'Недавние пациенты' : 'Recent Patients'}
                </CardTitle>
                <Link href="/admin/patients">
                  <span className="text-sm text-primary hover:underline flex items-center gap-1">
                    {t("rehab.viewAll")}
                    <ChevronRightIcon size={16} />
                  </span>
                </Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {patientsLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 rounded-full" />
                          <div>
                            <Skeleton className="h-5 w-32 mb-1" />
                            <Skeleton className="h-4 w-20" />
                          </div>
                        </div>
                        <Skeleton className="h-6 w-16" />
                      </div>
                    ))
                  ) : recentPatients && recentPatients.length > 0 ? (
                    recentPatients.map((patient: any) => (
                      <Link key={patient.id} href={`/admin/patients/${patient.id}`}>
                        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {patient.name?.charAt(0) || 'P'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{patient.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {patient.lastVisit 
                                  ? (language === 'ru' ? 'Последний визит: ' : 'Last visit: ') + 
                                    new Date(patient.lastVisit).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')
                                  : (language === 'ru' ? 'Нет визитов' : 'No visits')
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <p className="text-sm font-medium">{patient.progress || 0}%</p>
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary transition-all"
                                  style={{ width: `${patient.progress || 0}%` }}
                                />
                              </div>
                            </div>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              patient.status === 'active' 
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : patient.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                            }`}>
                              {patient.status === 'active' 
                                ? (language === 'ru' ? 'Активен' : 'Active')
                                : patient.status === 'pending'
                                ? (language === 'ru' ? 'Ожидание' : 'Pending')
                                : (language === 'ru' ? 'Неактивен' : 'Inactive')
                              }
                            </span>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <UsersIcon size={48} className="mx-auto mb-4 opacity-50" />
                      <p>{language === 'ru' ? 'Нет пациентов' : 'No patients'}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Tasks */}
          <div>
            <Card className="border-none shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold">
                  {language === 'ru' ? 'Задачи' : 'Tasks'}
                </CardTitle>
                <span className="px-2 py-1 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded text-xs font-medium">
                  {pendingTasks?.length || 0}
                </span>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tasksLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="p-3 bg-muted/50 rounded-lg">
                        <Skeleton className="h-5 w-full mb-2" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                    ))
                  ) : pendingTasks && pendingTasks.length > 0 ? (
                    pendingTasks.slice(0, 5).map((task: any) => (
                      <div key={task.id} className="p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                        <div className="flex items-start gap-2">
                          <div className={`w-2 h-2 rounded-full mt-1.5 ${
                            task.type === 'verification' ? 'bg-blue-500' :
                            task.type === 'order' ? 'bg-orange-500' :
                            task.type === 'plan' ? 'bg-green-500' :
                            'bg-purple-500'
                          }`} />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{task.title || task.patient}</p>
                            <p className="text-xs text-muted-foreground">{task.time}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <TrophyIcon size={32} className="mx-auto mb-2 opacity-50" />
                      <p className="text-sm">{language === 'ru' ? 'Нет задач' : 'No tasks'}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="border-none shadow-sm mt-6">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">
                  {language === 'ru' ? 'Быстрые действия' : 'Quick Actions'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href="/admin/patients">
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                      <UsersIcon size={20} className="text-primary" />
                      <span className="text-sm font-medium">
                        {language === 'ru' ? 'Добавить пациента' : 'Add Patient'}
                      </span>
                    </div>
                  </Link>
                  <Link href="/admin/rehabilitation">
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                      <ChartIcon size={20} className="text-green-600" />
                      <span className="text-sm font-medium">
                        {language === 'ru' ? 'Создать план' : 'Create Plan'}
                      </span>
                    </div>
                  </Link>
                  <Link href="/admin/notifications">
                    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                      <BellIcon size={20} className="text-orange-600" />
                      <span className="text-sm font-medium">
                        {language === 'ru' ? 'Отправить рассылку' : 'Send Notification'}
                      </span>
                    </div>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
