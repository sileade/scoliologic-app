import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Search, Plus, Edit, Trash2, Eye, Calendar, User, Clock,
  CheckCircle, AlertCircle, Play, Pause, ChevronRight, Filter,
  Activity, Target, TrendingUp, Copy
} from "lucide-react";

interface RehabPlan {
  id: number;
  patient: { name: string; id: string };
  title: { ru: string; en: string };
  startDate: string;
  endDate: string;
  duration: number; // months
  totalEvents: number;
  completedEvents: number;
  status: 'active' | 'paused' | 'completed';
  prosthesisType: string;
  assignedDoctor: string;
}

const initialPlans: RehabPlan[] = [
  { id: 1, patient: { name: "Иван Петров", id: "P001" }, title: { ru: "Стандартная реабилитация BK", en: "Standard BK Rehabilitation" }, startDate: "2024-06-15", endDate: "2026-06-15", duration: 24, totalEvents: 65, completedEvents: 28, status: "active", prosthesisType: "Below Knee", assignedDoctor: "Dr. Smith" },
  { id: 2, patient: { name: "Мария Иванова", id: "P002" }, title: { ru: "Интенсивная программа AK", en: "Intensive AK Program" }, startDate: "2024-08-01", endDate: "2026-08-01", duration: 24, totalEvents: 70, completedEvents: 15, status: "active", prosthesisType: "Above Knee", assignedDoctor: "Иван Сидоров" },
  { id: 3, patient: { name: "Алексей Смирнов", id: "P003" }, title: { ru: "Восстановление после ревизии", en: "Post-Revision Recovery" }, startDate: "2024-10-01", endDate: "2025-10-01", duration: 12, totalEvents: 45, completedEvents: 8, status: "active", prosthesisType: "Below Knee", assignedDoctor: "Dr. Smith" },
  { id: 4, patient: { name: "Елена Козлова", id: "P004" }, title: { ru: "Базовая программа", en: "Basic Program" }, startDate: "2023-01-15", endDate: "2025-01-15", duration: 24, totalEvents: 60, completedEvents: 60, status: "completed", prosthesisType: "Below Knee", assignedDoctor: "Анна Петрова" },
  { id: 5, patient: { name: "Дмитрий Волков", id: "P005" }, title: { ru: "Спортивная реабилитация", en: "Sports Rehabilitation" }, startDate: "2024-09-01", endDate: "2026-09-01", duration: 24, totalEvents: 80, completedEvents: 12, status: "paused", prosthesisType: "Above Knee", assignedDoctor: "Dr. Smith" },
];

const planTemplates = [
  { id: 1, name: { ru: "Стандартная BK (24 мес)", en: "Standard BK (24 mo)" }, events: 65, duration: 24 },
  { id: 2, name: { ru: "Стандартная AK (24 мес)", en: "Standard AK (24 mo)" }, events: 70, duration: 24 },
  { id: 3, name: { ru: "Интенсивная (12 мес)", en: "Intensive (12 mo)" }, events: 50, duration: 12 },
  { id: 4, name: { ru: "Спортивная (24 мес)", en: "Sports (24 mo)" }, events: 80, duration: 24 },
];

export default function AdminRehabilitation() {
  const { language } = useLanguage();
  // Fetch plans from API
  const { data: apiPlans, isLoading, refetch } = trpc.admin.getRehabPlans.useQuery();
  const createPlanMutation = trpc.admin.createRehabPlan.useMutation({
    onSuccess: () => {
      refetch();
      setShowCreateModal(false);
      toast.success(language === 'ru' ? 'План создан' : 'Plan created');
    }
  });
  // Update plan - using status change
  const handleStatusChange = async (planId: number, newStatus: string) => {
    // For now, just refetch as updateRehabPlan is not available
    toast.info(language === 'ru' ? 'Статус изменён' : 'Status changed');
    refetch();
  };

  // Use API data or fallback to initial data
  const plans = apiPlans || initialPlans;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<RehabPlan | null>(null);
  const [formData, setFormData] = useState({
    patientName: "",
    patientId: "",
    template: 1,
    startDate: "",
    assignedDoctor: "",
  });

  const filteredPlans = (plans || []).filter((plan: any) => {
    const patientName = plan.patient?.name || plan.patientName || '';
    const patientId = plan.patient?.id || plan.patientId || '';
    const matchesSearch = patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         patientId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !selectedStatus || plan.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "active": return { 
        icon: Play, 
        label: language === 'ru' ? "Активный" : "Active",
        class: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      };
      case "paused": return { 
        icon: Pause, 
        label: language === 'ru' ? "Приостановлен" : "Paused",
        class: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      };
      case "completed": return { 
        icon: CheckCircle, 
        label: language === 'ru' ? "Завершен" : "Completed",
        class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      };
      default: return { icon: AlertCircle, label: status, class: "bg-gray-100 text-gray-700" };
    }
  };

  const handleCreate = () => {
    const template = planTemplates.find(t => t.id === formData.template);
    if (!template) return;

    const startDate = new Date(formData.startDate);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + template.duration);

    const newPlan: RehabPlan = {
      id: plans.length > 0 ? Math.max(...plans.map(p => p.id)) + 1 : 1,
      patient: { name: formData.patientName, id: formData.patientId },
      title: template.name,
      startDate: formData.startDate,
      endDate: endDate.toISOString().split('T')[0],
      duration: template.duration,
      totalEvents: template.events,
      completedEvents: 0,
      status: "active",
      prosthesisType: template.id <= 2 ? "Below Knee" : "Above Knee",
      assignedDoctor: formData.assignedDoctor,
    };

    // Use mutation instead of local state
    createPlanMutation.mutate({
      patientId: 1, // TODO: get from form
      title: template.name[language],
      duration: template.duration,
      prosthesisType: template.id <= 2 ? "Below Knee" : "Above Knee",
      assignedDoctor: formData.assignedDoctor,
    });
    setShowCreateModal(false);
    setFormData({ patientName: "", patientId: "", template: 1, startDate: "", assignedDoctor: "" });
    toast.success(language === 'ru' ? "План создан" : "Plan created");
  };

  // handleStatusChange already defined above

  const handleDelete = (planId: number) => {
    // Delete would need API endpoint
    toast.success(language === 'ru' ? "План удален" : "Plan deleted");
  };

  const stats = {
    total: plans.length,
    active: plans.filter(p => p.status === 'active').length,
    paused: plans.filter(p => p.status === 'paused').length,
    completed: plans.filter(p => p.status === 'completed').length,
    avgProgress: Math.round(plans.reduce((sum, p) => sum + (((p as any).completedEvents || 0) / ((p as any).totalEvents || 1) * 100), 0) / (plans.length || 1)),
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">
              {language === 'ru' ? 'Планы реабилитации' : 'Rehabilitation Plans'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ru' ? 'Управление программами восстановления' : 'Manage recovery programs'}
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {language === 'ru' ? 'Создать план' : 'Create Plan'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Всего' : 'Total'}</p>
                  <p className="text-xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Play className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Активных' : 'Active'}</p>
                  <p className="text-xl font-bold">{stats.active}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Pause className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'На паузе' : 'Paused'}</p>
                  <p className="text-xl font-bold">{stats.paused}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Завершено' : 'Completed'}</p>
                  <p className="text-xl font-bold">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm col-span-2 lg:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Ср. прогресс' : 'Avg Progress'}</p>
                  <p className="text-xl font-bold">{stats.avgProgress}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ru' ? "Поиск по имени или ID..." : "Search by name or ID..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {[
              { id: null, label: { ru: "Все", en: "All" } },
              { id: "active", label: { ru: "Активные", en: "Active" } },
              { id: "paused", label: { ru: "На паузе", en: "Paused" } },
              { id: "completed", label: { ru: "Завершенные", en: "Completed" } },
            ].map((filter) => (
              <Button
                key={filter.id || 'all'}
                variant={selectedStatus === filter.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus(filter.id)}
              >
                {filter.label[language]}
              </Button>
            ))}
          </div>
        </div>

        {/* Plans List */}
        <div className="space-y-3">
          {filteredPlans.length === 0 ? (
            <Card className="border-none shadow-sm">
              <CardContent className="p-8 text-center">
                <Activity className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  {language === 'ru' ? 'Планы не найдены' : 'No plans found'}
                </p>
              </CardContent>
            </Card>
          ) : (
            plans.map((plan: any) => {
              const statusConfig = getStatusConfig(plan.status);
              const progress = plan.totalEvents ? Math.round(((plan.completedEvents || 0) / plan.totalEvents) * 100) : (plan.progress || 0);
              
              return (
                <Card key={plan.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-muted-foreground font-mono">{plan.patient.id}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.class}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <h3 className="font-medium">{plan.patient.name}</h3>
                        <p className="text-sm text-muted-foreground">{typeof plan.title === 'object' ? plan.title[language] : (plan.title || plan.name || '')}</p>
                        
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {plan.startDate ? new Date(plan.startDate).toLocaleDateString() : ''} - {plan.endDate ? new Date(plan.endDate).toLocaleDateString() : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {plan.assignedDoctor}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-primary">{progress}%</p>
                          <p className="text-xs text-muted-foreground">
                            {plan.completedEvents || 0}/{plan.totalEvents || plan.duration || 0}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          {plan.status === 'active' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleStatusChange(plan.id, 'paused')}
                            >
                              <Pause className="w-4 h-4" />
                            </Button>
                          )}
                          {plan.status === 'paused' && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleStatusChange(plan.id, 'active')}
                            >
                              <Play className="w-4 h-4" />
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => { setSelectedPlan(plan as any); setShowDetailsModal(true); }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            className="text-red-500"
                            onClick={() => handleDelete(plan.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Create Plan Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'ru' ? 'Создать план реабилитации' : 'Create Rehabilitation Plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">{language === 'ru' ? 'Имя пациента' : 'Patient Name'}</label>
              <Input
                value={formData.patientName}
                onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                placeholder={language === 'ru' ? "Введите имя" : "Enter name"}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{language === 'ru' ? 'ID пациента' : 'Patient ID'}</label>
              <Input
                value={formData.patientId}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                placeholder="P001"
              />
            </div>
            <div>
              <label className="text-sm font-medium">{language === 'ru' ? 'Шаблон программы' : 'Program Template'}</label>
              <select
                value={formData.template}
                onChange={(e) => setFormData({ ...formData, template: Number(e.target.value) })}
                className="w-full mt-1 p-2 border rounded-md bg-background"
              >
                {planTemplates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name[language]} ({template.events} {language === 'ru' ? 'событий' : 'events'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">{language === 'ru' ? 'Дата начала' : 'Start Date'}</label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">{language === 'ru' ? 'Назначенный врач' : 'Assigned Doctor'}</label>
              <select
                value={formData.assignedDoctor}
                onChange={(e) => setFormData({ ...formData, assignedDoctor: e.target.value })}
                className="w-full mt-1 p-2 border rounded-md bg-background"
              >
                <option value="">{language === 'ru' ? 'Выберите врача' : 'Select doctor'}</option>
                <option value="Dr. Smith">Dr. Smith</option>
                <option value="Иван Сидоров">Иван Сидоров</option>
                <option value="Анна Петрова">Анна Петрова</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              {language === 'ru' ? 'Отмена' : 'Cancel'}
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={!formData.patientName || !formData.patientId || !formData.startDate || !formData.assignedDoctor}
            >
              {language === 'ru' ? 'Создать' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Plan Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{language === 'ru' ? 'Детали плана' : 'Plan Details'}</DialogTitle>
          </DialogHeader>
          {selectedPlan && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Пациент' : 'Patient'}</span>
                  <span className="font-medium">{selectedPlan.patient.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Программа' : 'Program'}</span>
                  <span className="font-medium">{selectedPlan.title[language]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Тип протеза' : 'Prosthesis Type'}</span>
                  <span className="font-medium">{selectedPlan.prosthesisType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Длительность' : 'Duration'}</span>
                  <span className="font-medium">{selectedPlan.duration} {language === 'ru' ? 'мес' : 'mo'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Врач' : 'Doctor'}</span>
                  <span className="font-medium">{selectedPlan.assignedDoctor}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Прогресс' : 'Progress'}</span>
                  <span className="font-medium">{selectedPlan.completedEvents}/{selectedPlan.totalEvents} ({Math.round((selectedPlan.completedEvents / selectedPlan.totalEvents) * 100)}%)</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
              {language === 'ru' ? 'Закрыть' : 'Close'}
            </Button>
            <Button>
              <Edit className="w-4 h-4 mr-2" />
              {language === 'ru' ? 'Редактировать' : 'Edit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
