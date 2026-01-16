import { useState, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { useLanguage } from '@/contexts/LanguageContext';
import { trpc } from '@/lib/trpc';
import { getTimeBasedGreeting } from '@/lib/greeting';
import { PullToRefresh } from '@/components/PullToRefresh';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { 
  CalendarIcon, 
  CheckIcon, 
  SpineIcon, 
  DocumentIcon, 
  MessageIcon,
  CorsetIcon,
} from '@/components/NotionIcons';

export default function Dashboard() {
  const { language, t } = useLanguage();
  const [, setLocation] = useLocation();
  
  // Fetch data
  const queryOptions = { staleTime: 30000, refetchOnWindowFocus: false, retry: 1 };
  const { data: dashboardData, isLoading, refetch } = trpc.dashboard.getSummary.useQuery(undefined, queryOptions);
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

  // Quick actions
  const quickActions = [
    { 
      icon: MessageIcon, 
      label: language === 'ru' ? 'Чат' : 'Chat', 
      href: '/messages',
      gradient: 'from-purple-500 to-purple-600',
      badge: 3
    },
    { 
      icon: CalendarIcon, 
      label: language === 'ru' ? 'Запись' : 'Book', 
      href: '/appointments',
      gradient: 'from-teal-500 to-teal-600'
    },
    { 
      icon: DocumentIcon, 
      label: language === 'ru' ? 'Документы' : 'Docs', 
      href: '/documents',
      gradient: 'from-orange-500 to-orange-600'
    },
    { 
      icon: CorsetIcon, 
      label: language === 'ru' ? 'Изделия' : 'Devices', 
      href: '/devices',
      gradient: 'from-lime-500 to-lime-600'
    },
  ];

  return (
    <div className="mobile-page bg-background">
      {/* Header */}
      <header className="mobile-header bg-white">
        <div>
          <p className="text-xs text-muted-foreground">
            {greetingData.greeting[language]}
          </p>
          <h1 className="text-lg font-bold text-foreground">
            {patientName.split(' ')[0]}
          </h1>
        </div>
        <button 
          className="btn-icon"
          onClick={() => {
            haptic();
            setLocation('/profile');
          }}
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </button>
      </header>

      {/* Content */}
      <PullToRefresh onRefresh={handleRefresh} className="mobile-content has-bottom-nav">
        {/* Day counter */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teal-50 rounded-full">
            <SpineIcon size={18} className="text-teal-600" />
            <span className="text-sm font-medium text-teal-700">
              {language === 'ru' ? `День ${dayNumber} лечения` : `Day ${dayNumber}`}
            </span>
          </div>
        </div>

        {/* Quick Actions */}
        <section className="mb-6">
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Link key={index} href={action.href}>
                  <button
                    className={`w-full quick-action-card bg-gradient-to-br ${action.gradient} text-white relative`}
                    onClick={haptic}
                  >
                    <Icon size={24} className="mb-1" />
                    <span className="text-[11px] font-medium">{action.label}</span>
                    {action.badge && (
                      <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                        {action.badge}
                      </span>
                    )}
                  </button>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Next Appointment */}
        {nextAppointment && (
          <section className="mb-4">
            <Link href="/appointments">
              <div className="mobile-card card-interactive" onClick={haptic}>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <CalendarIcon size={24} className="text-teal-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">
                      {language === 'ru' ? 'Ближайший приём' : 'Next'}
                    </p>
                    <p className="font-semibold truncate">{nextAppointment.doctorName || 'Врач'}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(nextAppointment.scheduledAt).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', { 
                        weekday: 'short', day: 'numeric', month: 'short' 
                      })}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          </section>
        )}

        {/* Daily Progress */}
        <section className="mb-4">
          <Link href="/rehabilitation">
            <div className="mobile-card card-interactive" onClick={haptic}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-lime-100 flex items-center justify-center">
                    <CheckIcon size={20} className="text-lime-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      {language === 'ru' ? 'Задания' : 'Tasks'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {completedTasks} / {totalTasks}
                    </p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-lime-600">{progressPercent}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-lime-400 to-lime-500 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          </Link>
        </section>

        {/* Treatment Status */}
        <section className="mb-4">
          <Link href="/devices">
            <div className="mobile-card card-interactive bg-gradient-to-br from-teal-50 to-teal-100" onClick={haptic}>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-teal-200 flex items-center justify-center">
                  <SpineIcon size={24} className="text-teal-700" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-teal-800">
                    {language === 'ru' ? 'Корсетотерапия' : 'Corset Therapy'}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                    <span className="text-sm text-teal-600">
                      {language === 'ru' ? 'Активно' : 'Active'}
                    </span>
                  </div>
                </div>
                <svg className="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </section>

        {/* AI Assistant */}
        <section className="mb-4">
          <Link href="/messages">
            <div 
              className="mobile-card card-interactive bg-gradient-to-br from-purple-500 to-purple-600 text-white"
              onClick={haptic}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
                  <span className="text-2xl">✨</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold">AI-ассистент</p>
                  <p className="text-sm text-white/80">
                    {language === 'ru' ? 'Задайте вопрос' : 'Ask a question'}
                  </p>
                </div>
                <svg className="w-5 h-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </section>

        {/* Tasks Preview */}
        {todaysTasks && todaysTasks.length > 0 && (
          <section className="mb-20">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
              {language === 'ru' ? 'Ближайшие задания' : 'Upcoming'}
            </h2>
            <div className="space-y-2">
              {todaysTasks.slice(0, 3).map((task) => (
                <Link key={task.id} href="/rehabilitation">
                  <div 
                    className={`mobile-card card-interactive ${task.completed ? 'opacity-60' : ''}`}
                    onClick={haptic}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        task.completed ? 'bg-teal-100' : 'bg-gray-100'
                      }`}>
                        {task.completed ? (
                          <CheckIcon size={18} className="text-teal-600" />
                        ) : (
                          <span className="w-4 h-4 rounded-full border-2 border-gray-300" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {task.title}
                        </p>
                        <p className="text-xs text-muted-foreground">{task.duration} мин</p>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </PullToRefresh>

      {/* Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
