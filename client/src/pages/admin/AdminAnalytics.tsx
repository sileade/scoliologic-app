import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  UsersIcon, 
  ChartIcon, 
  TrophyIcon,
  FireIcon
} from "@/components/NotionIcons";
import { Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

const kpis = [
  { key: "mau", value: "437", target: "35%", achieved: true, description: "активных пользователей в месяц" },
  { key: "serviceConversion", value: "18.5%", target: ">15%", achieved: true, description: "конверсия в запись на сервис" },
  { key: "paidConversion", value: "9.2%", target: ">8%", achieved: true, description: "конверсия в платные услуги" },
  { key: "retention", value: "34%", target: ">30%", achieved: true, description: "Retention Rate (90 дней)" },
  { key: "nps", value: "8.7", target: "8.5", achieved: true, description: "индекс лояльности" },
  { key: "profileCompletion", value: "87%", target: ">90%", achieved: false, description: "заполненных профилей" },
];

const monthlyData = [
  { month: "Янв", users: 320, orders: 45, revenue: 125000 },
  { month: "Фев", users: 358, orders: 52, revenue: 148000 },
  { month: "Мар", users: 392, orders: 61, revenue: 172000 },
  { month: "Апр", users: 401, orders: 58, revenue: 165000 },
  { month: "Май", users: 418, orders: 67, revenue: 189000 },
  { month: "Июн", users: 437, orders: 73, revenue: 205000 },
];

const topArticles = [
  { title: "Уход за протезом в летний период", views: 1245, engagement: "4.2 мин" },
  { title: "Упражнения для укрепления мышц", views: 987, engagement: "6.8 мин" },
  { title: "Как правильно надевать протез", views: 856, engagement: "3.5 мин" },
  { title: "Питание для восстановления", views: 743, engagement: "5.1 мин" },
];

export default function AdminAnalytics() {
  const { t } = useLanguage();

  return (
    <AdminLayout title={t("admin.analytics.title")}>
      <div className="space-y-8">
        {/* Export Button */}
        <div className="flex justify-end">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            {t("admin.analytics.exportCSV")}
          </Button>
        </div>

        {/* KPI Cards */}
        <div>
          <h2 className="text-lg font-semibold mb-4">{t("admin.analytics.kpiTitle")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpis.map((kpi) => (
              <Card key={kpi.key} className={`border-none shadow-sm ${kpi.achieved ? '' : 'ring-2 ring-orange-200 dark:ring-orange-800'}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-3xl font-bold">{kpi.value}</p>
                      <p className="text-sm text-muted-foreground mt-1">{kpi.description}</p>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      kpi.achieved 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                    }`}>
                      {t("admin.analytics.target")}: {kpi.target}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    {kpi.achieved ? (
                      <TrophyIcon size={16} className="text-green-600" />
                    ) : (
                      <FireIcon size={16} className="text-orange-600" />
                    )}
                    <span className={`text-sm ${kpi.achieved ? 'text-green-600' : 'text-orange-600'}`}>
                      {kpi.achieved ? t("admin.analytics.achieved") : t("admin.analytics.inProgress")}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Users Chart */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t("admin.analytics.monthlyUsers")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end gap-2">
                {monthlyData.map((data, index) => (
                  <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full bg-primary/80 rounded-t-lg transition-all hover:bg-primary"
                      style={{ height: `${(data.users / 500) * 100}%` }}
                    />
                    <span className="text-xs text-muted-foreground">{data.month}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("admin.analytics.totalUsers")}</span>
                <span className="font-semibold">1,247</span>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t("admin.analytics.revenue")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-end gap-2">
                {monthlyData.map((data) => (
                  <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                    <div 
                      className="w-full bg-green-500/80 rounded-t-lg transition-all hover:bg-green-500"
                      style={{ height: `${(data.revenue / 250000) * 100}%` }}
                    />
                    <span className="text-xs text-muted-foreground">{data.month}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("admin.analytics.totalRevenue")}</span>
                <span className="font-semibold">1,004,000 ₽</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Engagement Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Articles */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t("admin.analytics.topArticles")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topArticles.map((article, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{article.title}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{article.views} {t("admin.analytics.views")}</span>
                        <span>⏱ {article.engagement}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* User Activity */}
          <Card className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">{t("admin.analytics.userActivity")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <UsersIcon size={20} className="text-primary" />
                    <span>{t("admin.analytics.dailyActive")}</span>
                  </div>
                  <span className="font-semibold">89</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <ChartIcon size={20} className="text-green-600" />
                    <span>{t("admin.analytics.weeklyActive")}</span>
                  </div>
                  <span className="font-semibold">312</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <TrophyIcon size={20} className="text-orange-600" />
                    <span>{t("admin.analytics.exercisesCompleted")}</span>
                  </div>
                  <span className="font-semibold">2,847</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <FireIcon size={20} className="text-red-600" />
                    <span>{t("admin.analytics.avgStreak")}</span>
                  </div>
                  <span className="font-semibold">12 {t("rehab.days")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
