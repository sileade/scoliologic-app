import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import { User, Mail, Phone, MapPin, Calendar, Heart, Shield, Award, ChevronRight, Edit2, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

export default function Profile() {
  const { t, language } = useLanguage();

  // Fetch profile data from API
  const { data: profile, isLoading: profileLoading } = trpc.patient.getProfile.useQuery();
  const { data: achievements, isLoading: achievementsLoading } = trpc.achievements.getAll.useQuery();
  const { data: dashboardData } = trpc.dashboard.getSummary.useQuery();
  const { data: plan } = trpc.rehabilitation.getPlan.useQuery();

  // Calculate stats
  const daysSinceSurgery = dashboardData?.dayOfRecovery || 0;
  const exercisesCompleted = (achievements as any)?.find((a: any) => a.type === 'exercises')?.count || 0;
  const progress = plan?.progress || 0;

  // Default achievements if none from API
  const displayAchievements = achievements && achievements.length > 0 ? achievements : [
    { id: 1, title: language === 'ru' ? "Первые шаги" : "First Steps", icon: "🚶", earned: true, type: 'milestone' },
    { id: 2, title: language === 'ru' ? "7-дневная серия" : "7-Day Streak", icon: "🔥", earned: daysSinceSurgery >= 7, type: 'streak' },
    { id: 3, title: language === 'ru' ? "100 упражнений" : "100 Exercises", icon: "💪", earned: exercisesCompleted >= 100, type: 'exercises' },
    { id: 4, title: language === 'ru' ? "Месяц прогресса" : "Month of Progress", icon: "📈", earned: daysSinceSurgery >= 30, type: 'milestone' },
  ];

  const isLoading = profileLoading;

  return (
    <AppLayout>
      <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6 max-w-4xl mx-auto">
        {/* Profile Header */}
        <Card className="border-none shadow-sm overflow-hidden">
          <div className="h-24 bg-gradient-to-r from-primary to-primary/80" />
          <CardContent className="p-4 lg:p-6 -mt-12">
            <div className="flex flex-col lg:flex-row lg:items-end gap-4">
              <div className="w-24 h-24 rounded-2xl bg-white dark:bg-gray-800 border-4 border-background shadow-lg flex items-center justify-center">
                {(profile as any)?.avatarUrl ? (
                  <img src={(profile as any).avatarUrl} alt="Avatar" className="w-full h-full rounded-xl object-cover" />
                ) : (
                  <User className="w-12 h-12 text-primary" />
                )}
              </div>
              <div className="flex-1">
                {isLoading ? (
                  <>
                    <Skeleton className="h-8 w-40 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-1">
                      <h1 className="text-2xl font-bold">{profile?.firstName || 'Пациент'} {profile?.lastName || ''}</h1>
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                    <p className="text-muted-foreground">{t("profile.verifiedPatient")}</p>
                  </>
                )}
              </div>
              <Link href="/settings">
                <button className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl font-medium hover:bg-primary/20 transition-colors">
                  <Edit2 className="w-4 h-4" />
                  {t("profile.editProfile")}
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recovery Progress */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 lg:p-6">
            <h2 className="font-bold text-lg mb-4">{t("profile.recoveryProgress")}</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">{t("rehab.inProgress")}</span>
                  {isLoading ? (
                    <Skeleton className="h-4 w-12" />
                  ) : (
                    <span className="font-semibold">{progress}%</span>
                  )}
                </div>
                <Progress value={progress} className="h-2" />
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  {isLoading ? (
                    <Skeleton className="h-8 w-12 mx-auto mb-1" />
                  ) : (
                    <p className="text-2xl font-bold text-primary">{exercisesCompleted}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{t("profile.exercisesCompleted")}</p>
                </div>
                <div className="text-center">
                  {isLoading ? (
                    <Skeleton className="h-8 w-12 mx-auto mb-1" />
                  ) : (
                    <p className="text-2xl font-bold text-primary">{daysSinceSurgery}</p>
                  )}
                  <p className="text-xs text-muted-foreground">{t("profile.daysSinceSurgery")}</p>
                </div>
                <div className="text-center">
                  {isLoading ? (
                    <Skeleton className="h-8 w-12 mx-auto mb-1" />
                  ) : (
                    <p className="text-2xl font-bold text-primary">
                      {dashboardData?.nextAppointment 
                        ? Math.ceil((new Date((dashboardData.nextAppointment as any).scheduledAt || (dashboardData.nextAppointment as any).date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                        : '-'
                      }
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">{t("profile.nextAppointment")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 lg:p-6">
              <h2 className="font-bold text-lg mb-4">{t("profile.personalInfo")}</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("profile.email")}</p>
                    {isLoading ? (
                      <Skeleton className="h-5 w-40" />
                    ) : (
                      <p className="font-medium">{(profile as any)?.email || profile?.phone || '-'}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("profile.phone")}</p>
                    {isLoading ? (
                      <Skeleton className="h-5 w-32" />
                    ) : (
                      <p className="font-medium">{profile?.phone || '-'}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("profile.dateOfBirth")}</p>
                    {isLoading ? (
                      <Skeleton className="h-5 w-28" />
                    ) : (
                      <p className="font-medium">
                        {profile?.dateOfBirth 
                          ? new Date(profile.dateOfBirth).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : '-'
                        }
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("profile.bloodType")}</p>
                    {isLoading ? (
                      <Skeleton className="h-5 w-12" />
                    ) : (
                      <p className="font-medium">{profile?.bloodType || '-'}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("profile.address")}</p>
                    {isLoading ? (
                      <Skeleton className="h-5 w-48" />
                    ) : (
                      <p className="font-medium">{profile?.address || '-'}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Insurance & Emergency */}
          <div className="space-y-6">
            {/* Insurance */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-lg">{t("profile.insurance")}</h2>
                  <Shield className="w-5 h-5 text-green-500" />
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("profile.provider")}</p>
                    {isLoading ? (
                      <Skeleton className="h-5 w-40" />
                    ) : (
                      <p className="font-medium">{profile?.insuranceProvider || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("profile.policyNumber")}</p>
                    {isLoading ? (
                      <Skeleton className="h-5 w-32" />
                    ) : (
                      <p className="font-medium">{profile?.insuranceNumber || '-'}</p>
                    )}
                  </div>
                  {profile?.insuranceProvider && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      {t("profile.activeCoverage")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 lg:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-lg">{t("profile.achievements")}</h2>
                  <Award className="w-5 h-5 text-yellow-500" />
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {achievementsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="aspect-square rounded-xl" />
                    ))
                  ) : (
                    displayAchievements.slice(0, 4).map((achievement: any) => (
                      <div
                        key={achievement.id}
                        className={`aspect-square rounded-xl flex flex-col items-center justify-center text-center p-2 ${
                          achievement.earned
                            ? 'bg-yellow-50 dark:bg-yellow-900/20'
                            : 'bg-muted opacity-50'
                        }`}
                      >
                        <span className="text-2xl mb-1">{achievement.icon || '🏆'}</span>
                        <span className="text-[10px] font-medium line-clamp-2">
                          {typeof achievement.title === 'object' ? achievement.title[language] : achievement.title}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Emergency Contact */}
            <Card className="border-none shadow-sm">
              <CardContent className="p-4 lg:p-6">
                <h2 className="font-bold text-lg mb-4">{t("profile.emergencyContact")}</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{t("profile.contactName")}</p>
                    {isLoading ? (
                      <Skeleton className="h-5 w-32" />
                    ) : (
                      <p className="font-medium">{profile?.emergencyContactName || '-'}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t("profile.contactPhone")}</p>
                    {isLoading ? (
                      <Skeleton className="h-5 w-28" />
                    ) : (
                      <p className="font-medium">{profile?.emergencyContactPhone || '-'}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Links */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 lg:p-6">
            <h2 className="font-bold text-lg mb-4">{t("profile.quickLinks")}</h2>
            <div className="space-y-2">
              <Link href="/prosthesis">
                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Shield className="w-5 h-5 text-primary" />
                    <span>{t("nav.prosthesis")}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
              <Link href="/rehabilitation">
                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary" />
                    <span>{t("nav.rehabilitation")}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
              <Link href="/service">
                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted transition-colors cursor-pointer">
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-primary" />
                    <span>{t("nav.service")}</span>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
