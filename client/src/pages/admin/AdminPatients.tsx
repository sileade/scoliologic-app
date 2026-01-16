import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  UsersIcon, 
  SearchIcon,
  ChevronRightIcon,
  PlusIcon
} from "@/components/NotionIcons";
import { Download, Filter } from "lucide-react";

export default function AdminPatients() {
  const { t, language } = useLanguage();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch patients from API
  const { data: patients, isLoading } = trpc.admin.getPatients.useQuery();

  const filteredPatients = (patients || []).filter((patient: any) => {
    const matchesSearch = searchQuery === "" || 
      patient.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || patient.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusCounts = () => {
    const all = patients?.length || 0;
    const active = patients?.filter((p: any) => p.status === 'active').length || 0;
    const pending = patients?.filter((p: any) => p.status === 'pending').length || 0;
    const inactive = patients?.filter((p: any) => p.status === 'inactive').length || 0;
    return { all, active, pending, inactive };
  };

  const counts = getStatusCounts();

  return (
    <AdminLayout title={t("admin.patients.title")}>
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between">
          <div className="flex gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("admin.patients.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              {t("admin.patients.export")}
            </Button>
            <Link href="/admin/patients/new">
              <Button>
                <PlusIcon size={18} className="mr-2" />
                {t("admin.patients.addNew")}
              </Button>
            </Link>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2">
          {["all", "active", "pending", "inactive"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {t(`admin.status.${status}`)}
              <span className="ml-2 text-xs opacity-70">
                ({counts[status as keyof typeof counts]})
              </span>
            </button>
          ))}
        </div>

        {/* Patients Table */}
        <Card className="border-none shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-4 font-medium text-muted-foreground">{t("admin.patients.name")}</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">{t("admin.patients.contact")}</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">{t("admin.patients.prosthesis")}</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">{t("admin.patients.progress")}</th>
                    <th className="text-left p-4 font-medium text-muted-foreground">{t("admin.patients.status")}</th>
                    <th className="text-left p-4 font-medium text-muted-foreground"></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-full" />
                            <Skeleton className="h-5 w-40" />
                          </div>
                        </td>
                        <td className="p-4"><Skeleton className="h-5 w-32" /></td>
                        <td className="p-4"><Skeleton className="h-5 w-24" /></td>
                        <td className="p-4"><Skeleton className="h-5 w-16" /></td>
                        <td className="p-4"><Skeleton className="h-6 w-20" /></td>
                        <td className="p-4"><Skeleton className="h-8 w-8" /></td>
                      </tr>
                    ))
                  ) : filteredPatients.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-muted-foreground">
                        <UsersIcon size={48} className="mx-auto mb-4 opacity-50" />
                        <p>{language === 'ru' ? 'Пациенты не найдены' : 'No patients found'}</p>
                      </td>
                    </tr>
                  ) : (
                    filteredPatients.map((patient: any) => (
                      <tr 
                                        key={patient.id} 
                                        className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer"
                                        onClick={() => setLocation(`/admin/patients/${patient.id}`)}
                                      >
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {patient.name?.charAt(0) || 'P'}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{patient.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {language === 'ru' ? 'Регистрация: ' : 'Registered: '}
                                {patient.createdAt 
                                  ? new Date(patient.createdAt).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US')
                                  : '-'
                                }
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <p className="text-sm">{patient.email || '-'}</p>
                          <p className="text-xs text-muted-foreground">{patient.phone || '-'}</p>
                        </td>
                        <td className="p-4">
                          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                            {patient.prosthesisModel || '-'}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all"
                                style={{ width: `${patient.progress || 0}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{patient.progress || 0}%</span>
                          </div>
                        </td>
                        <td className="p-4">
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
                        </td>
                        <td className="p-4">
                          <Link href={`/admin/patients/${patient.id}`}>
                            <Button variant="ghost" size="icon">
                              <ChevronRightIcon size={18} />
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {!isLoading && filteredPatients.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {language === 'ru' 
                ? `Показано ${filteredPatients.length} из ${patients?.length || 0} пациентов`
                : `Showing ${filteredPatients.length} of ${patients?.length || 0} patients`
              }
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled>
                {language === 'ru' ? 'Назад' : 'Previous'}
              </Button>
              <Button variant="outline" size="sm" disabled>
                {language === 'ru' ? 'Далее' : 'Next'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
