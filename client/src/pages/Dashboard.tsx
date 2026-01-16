import { useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { getTimeBasedGreeting } from '@/lib/greeting';
import { PullToRefresh } from '@/components/PullToRefresh';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { EmptyState } from '@/components/ui/EmptyState';
import { 
  CalendarIcon, 
  CheckIcon, 
  SpineIcon, 
  MessageIcon,
  CorsetIcon,
} from '@/components/NotionIcons';

export default function Dashboard() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  
  // Fetch data
  const queryOptions = { staleTime: 30000, refetchOnWindowFocus: false, retry: 1 };
  const { data: dashboardData, refetch } = trpc.dashboard.getSummary.useQuery(undefined, queryOptions);
  const { data: todaysTasks, refetch: refetchTasks } = trpc.rehabilitation.getTodaysTasks.useQuery(undefined, queryOptions);
  const { data: profile } = trpc.patient.getProfile.useQuery(undefined, queryOptions);
  
  const dayNumber = dashboardData?.dayOfRecovery || 1;
  const completedTasks = todaysTasks?.filter(task => task.completed).length || 0;
  const totalTasks = todaysTasks?.length || 0;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const greetingData = getTimeBasedGreeting();
  const patientName = profile?.firstName || (profile as any)?.name || 'Пациент';
  const nextAppointment = dashboardData?.nextAppointment;

  // Pull to refresh
  const handleRefresh = useCallback(async () => {
    await Promise.all([refetch(), refetchTasks()]);
  }, [refetch, refetchTasks]);

  // Тактильная обратная связь
  const haptic = () => {
    if (navigator.vibrate) navigator.vibrate(10);
  };

  // Quick actions - только 4 основных
  const quickActions = [
    { 
      icon: MessageIcon, 
      label: language === 'ru' ? 'Чат' : 'Chat', 
      href: '/messages',
      color: 'bg-teal-500',
      badge: 0
    },
    { 
      icon: CalendarIcon, 
      label: language === 'ru' ? 'Запись' : 'Book', 
      href: '/appointments',
      color: 'bg-blue-500'
    },
    { 
      icon: CorsetIcon, 
      label: language === 'ru' ? 'Изделия' : 'Devices', 
      href: '/devices',
      color: 'bg-orange-500'
    },
    { 
      icon: CheckIcon, 
      label: language === 'ru' ? 'Задания' : 'Tasks', 
      href: '/rehabilitation',
      color: 'bg-lime-500'
    },
  ];

  return (
    <div className="mobile-page bg-gray-50">
      {/* Simplified Header */}
      <header className="px-4 pt-safe-top pb-4 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-500">
              {greetingData.greeting[language]}
            </p>
            <h1 className="text-xl font-bold text-gray-900">
              {patientName.split(' ')[0]}
            </h1>
          </div>
          <button 
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center transition-colors active:bg-gray-200"
            onClick={() => {
              haptic();
              setLocation('/profile');
            }}
            aria-label={language === 'ru' ? 'Профиль' : 'Profile'}
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Content */}
      <PullToRefresh onRefresh={handleRefresh} className="mobile-content has-bottom-nav">
        {/* Day counter - компактный */}
        <div className="flex justify-center py-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-full">
            <SpineIcon size={16} className="text-teal-600" />
            <span className="text-sm font-medium text-teal-700">
              {language === 'ru' ? `День ${dayNumber}` : `Day ${dayNumber}`}
            </span>
          </div>
        </div>

        {/* Quick Actions - 4 кнопки в ряд */}
        <section className="px-4 mb-6">
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link key={index} href={action.href}>
                  <button
                    className="w-full flex flex-col items-center py-3 px-2 bg-white rounded-2xl shadow-sm border border-gray-100 transition-all active:scale-95 relative"
                    onClick={haptic}
                  >
                    <div className={`w-10 h-10 ${action.color} rounded-xl flex items-center justify-center mb-2`}>
                      <Icon size={20} className="text-white" />
                    </div>
                    <span className="text-xs font-medium text-gray-700">{action.label}</span>
                    {action.badge !== undefined && action.badge > 0 && (
                      <span className="absolute top-2 right-2 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {action.badge > 9 ? '9+' : action.badge}
                      </span>
                    )}
                  </button>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Daily Progress - упрощённый */}
        <section className="px-4 mb-4">
          <Link href="/rehabilitation">
            <div 
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 transition-all active:scale-[0.98]"
              onClick={haptic}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {language === 'ru' ? 'Сегодня' : 'Today'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {completedTasks} {language === 'ru' ? 'из' : 'of'} {totalTasks} {language === 'ru' ? 'заданий' : 'tasks'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-teal-600">{progressPercent}%</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-teal-500 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </Link>
        </section>

        {/* Next Appointment - если есть */}
        {nextAppointment ? (
          <section className="px-4 mb-4">
            <Link href="/appointments">
              <div 
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 transition-all active:scale-[0.98]"
                onClick={haptic}
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <CalendarIcon size={22} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5">
                      {language === 'ru' ? 'Ближайший приём' : 'Next appointment'}
                    </p>
                    <p className="font-semibold text-gray-900 truncate">
                      {nextAppointment.doctorName || 'Врач'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(nextAppointment.scheduledAt).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { 
                        weekday: 'short', day: 'numeric', month: 'short' 
                      })}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          </section>
        ) : (
          <section className="px-4 mb-4">
            <EmptyState
              icon={<CalendarIcon size={32} className="text-gray-400" />}
              title={language === 'ru' ? 'Нет записей' : 'No appointments'}
              description={language === 'ru' ? 'Запишитесь на приём к врачу' : 'Book an appointment'}
              action={{
                label: language === 'ru' ? 'Записаться' : 'Book now',
                onClick: () => setLocation('/appointments')
              }}
              compact
            />
          </section>
        )}

        {/* Tasks Preview - упрощённый */}
        {todaysTasks && todaysTasks.length > 0 ? (
          <section className="px-4 mb-20">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-500">
                {language === 'ru' ? 'Задания на сегодня' : 'Today\'s tasks'}
              </h2>
              <Link href="/rehabilitation">
                <span className="text-xs text-teal-600 font-medium">
                  {language === 'ru' ? 'Все' : 'All'}
                </span>
              </Link>
            </div>
            <div className="space-y-2">
              {todaysTasks.slice(0, 3).map((task) => (
                <Link key={task.id} href="/rehabilitation">
                  <div 
                    className={`bg-white rounded-xl p-3 shadow-sm border border-gray-100 transition-all active:scale-[0.98] ${
                      task.completed ? 'opacity-60' : ''
                    }`}
                    onClick={haptic}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        task.completed ? 'bg-teal-100' : 'bg-gray-100'
                      }`}>
                        {task.completed ? (
                          <CheckIcon size={16} className="text-teal-600" />
                        ) : (
                          <span className="w-3 h-3 rounded-full border-2 border-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          task.completed ? 'line-through text-gray-400' : 'text-gray-900'
                        }`}>
                          {task.title}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400">{task.duration} мин</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <section className="px-4 mb-20">
            <EmptyState
              icon={<CheckIcon size={32} className="text-gray-400" />}
              title={language === 'ru' ? 'Нет заданий' : 'No tasks'}
              description={language === 'ru' ? 'На сегодня заданий нет' : 'No tasks for today'}
              compact
            />
          </section>
        )}
      </PullToRefresh>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
