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
  Search, Eye, CheckCircle, XCircle, Clock, Package, 
  Calendar, User, Phone, MapPin, Download, Filter,
  ChevronRight, AlertCircle, Truck
} from "lucide-react";

interface Order {
  id: number;
  orderNumber: string;
  patient: { name: string; phone: string; email: string };
  service: { ru: string; en: string };
  date: string;
  time: string;
  status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  specialist: string;
  notes?: string;
  price: number;
}

const initialOrders: Order[] = [
  { id: 1, orderNumber: "ORD-2024-001", patient: { name: "Иван Петров", phone: "+7 999 123-45-67", email: "ivan@email.com" }, service: { ru: "Ежегодный осмотр", en: "Annual Check-up" }, date: "2024-12-15", time: "10:00", status: "confirmed", specialist: "Иван Сидоров", price: 0 },
  { id: 2, orderNumber: "ORD-2024-002", patient: { name: "Мария Иванова", phone: "+7 999 234-56-78", email: "maria@email.com" }, service: { ru: "Настройка протеза", en: "Prosthesis Adjustment" }, date: "2024-12-16", time: "14:30", status: "pending", specialist: "Анна Петрова", price: 0 },
  { id: 3, orderNumber: "ORD-2024-003", patient: { name: "Алексей Смирнов", phone: "+7 999 345-67-89", email: "alex@email.com" }, service: { ru: "Ремонт протеза", en: "Prosthesis Repair" }, date: "2024-12-14", time: "11:00", status: "in-progress", specialist: "Иван Сидоров", notes: "Замена вкладыша", price: 15000 },
  { id: 4, orderNumber: "ORD-2024-004", patient: { name: "Елена Козлова", phone: "+7 999 456-78-90", email: "elena@email.com" }, service: { ru: "Консультация", en: "Consultation" }, date: "2024-12-10", time: "09:00", status: "completed", specialist: "Dr. Smith", price: 5000 },
  { id: 5, orderNumber: "ORD-2024-005", patient: { name: "Дмитрий Волков", phone: "+7 999 567-89-01", email: "dmitry@email.com" }, service: { ru: "Экстренный ремонт", en: "Emergency Repair" }, date: "2024-12-08", time: "16:00", status: "cancelled", specialist: "Анна Петрова", notes: "Отменено пациентом", price: 10000 },
];

export default function AdminOrders() {
  const { language } = useLanguage();
  // Fetch orders from API with caching
  const queryOptions = { staleTime: 30000, refetchOnWindowFocus: false, retry: 1 };
  const { data: apiOrders, isLoading, refetch } = trpc.admin.getOrders.useQuery(undefined, queryOptions);
  const updateOrderMutation = trpc.admin.updateOrderStatus.useMutation({
    onSuccess: () => {
      refetch();
      toast.success(language === 'ru' ? 'Заказ обновлён' : 'Order updated');
    }
  });

  // Use API data or fallback to initial data
  const orders: Order[] = (apiOrders as any) || initialOrders;
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const filteredOrders = (orders || []).filter((order: any) => {
    const matchesSearch = order.patient.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         order.service.ru.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !selectedStatus || order.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "pending": return { 
        icon: Clock, 
        label: language === 'ru' ? "Ожидает" : "Pending",
        class: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
      };
      case "confirmed": return { 
        icon: CheckCircle, 
        label: language === 'ru' ? "Подтверждено" : "Confirmed",
        class: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
      };
      case "in-progress": return { 
        icon: Truck, 
        label: language === 'ru' ? "В работе" : "In Progress",
        class: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
      };
      case "completed": return { 
        icon: CheckCircle, 
        label: language === 'ru' ? "Завершено" : "Completed",
        class: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
      };
      case "cancelled": return { 
        icon: XCircle, 
        label: language === 'ru' ? "Отменено" : "Cancelled",
        class: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      };
      default: return { 
        icon: Clock, 
        label: status,
        class: "bg-gray-100 text-gray-700"
      };
    }
  };

  const handleStatusChange = (orderId: number, newStatus: string) => {
    updateOrderMutation.mutate({ id: orderId, status: newStatus as any });
  };

  const stats = {
    total: (orders || []).length,
    pending: (orders || []).filter((o: any) => o.status === 'pending').length,
    confirmed: (orders || []).filter((o: any) => o.status === 'confirmed' || o.status === 'scheduled').length,
    inProgress: (orders || []).filter((o: any) => o.status === 'in_progress').length,
    completed: (orders || []).filter((o: any) => o.status === 'completed').length,
    revenue: (orders || []).filter((o: any) => o.status === 'completed').reduce((sum: number, o: any) => sum + (o.price || 0), 0),
  };

  const statusFilters = [
    { id: null, label: { ru: "Все", en: "All" }, count: stats.total },
    { id: "pending", label: { ru: "Ожидает", en: "Pending" }, count: stats.pending },
    { id: "confirmed", label: { ru: "Подтверждено", en: "Confirmed" }, count: stats.confirmed },
    { id: "in-progress", label: { ru: "В работе", en: "In Progress" }, count: stats.inProgress },
    { id: "completed", label: { ru: "Завершено", en: "Completed" }, count: stats.completed },
  ];

  const exportToCSV = () => {
    const headers = ["Order #", "Patient", "Service", "Date", "Time", "Status", "Specialist", "Price"];
    const rows = filteredOrders.map((o: any) => [
      o.orderNumber,
      o.patient.name,
      o.service[language],
      o.date,
      o.time,
      getStatusConfig(o.status).label,
      o.specialist,
      o.price
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(language === 'ru' ? "Экспорт завершен" : "Export completed");
  };

  return (
    <AdminLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">
              {language === 'ru' ? 'Управление заказами' : 'Order Management'}
            </h1>
            <p className="text-muted-foreground">
              {language === 'ru' ? 'Записи на услуги и сервис' : 'Service bookings and appointments'}
            </p>
          </div>
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="w-4 h-4 mr-2" />
            {language === 'ru' ? 'Экспорт CSV' : 'Export CSV'}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-blue-600" />
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
                <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Ожидают' : 'Pending'}</p>
                  <p className="text-xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'В работе' : 'In Progress'}</p>
                  <p className="text-xl font-bold">{stats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-none shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{language === 'ru' ? 'Выручка' : 'Revenue'}</p>
                  <p className="text-xl font-bold">{stats.revenue.toLocaleString()} ₽</p>
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
              placeholder={language === 'ru' ? "Поиск по номеру, имени..." : "Search by number, name..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0">
            {statusFilters.map((filter) => (
              <Button
                key={filter.id || 'all'}
                variant={selectedStatus === filter.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatus(filter.id)}
                className="whitespace-nowrap"
              >
                {filter.label[language]}
                <span className="ml-1 text-xs opacity-70">({filter.count})</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          {filteredOrders.length === 0 ? (
            <Card className="border-none shadow-sm">
              <CardContent className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">
                  {language === 'ru' ? 'Заказы не найдены' : 'No orders found'}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              return (
                <Card key={order.id} className="border-none shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Order Info */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm text-muted-foreground">{order.orderNumber}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.class}`}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{order.patient.name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {order.service[language]}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {order.date}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {order.time}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {order.status === 'pending' && (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => handleStatusChange(order.id, 'confirmed')}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              {language === 'ru' ? 'Подтвердить' : 'Confirm'}
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-500"
                              onClick={() => handleStatusChange(order.id, 'cancelled')}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                        {order.status === 'confirmed' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStatusChange(order.id, 'in-progress')}
                          >
                            <Truck className="w-4 h-4 mr-1" />
                            {language === 'ru' ? 'Начать' : 'Start'}
                          </Button>
                        )}
                        {order.status === 'in-progress' && (
                          <Button 
                            size="sm" 
                            onClick={() => handleStatusChange(order.id, 'completed')}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            {language === 'ru' ? 'Завершить' : 'Complete'}
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => { setSelectedOrder(order); setShowDetailsModal(true); }}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* Order Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {language === 'ru' ? 'Детали заказа' : 'Order Details'} #{selectedOrder?.orderNumber}
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Статус' : 'Status'}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusConfig(selectedOrder.status).class}`}>
                    {getStatusConfig(selectedOrder.status).label}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Услуга' : 'Service'}</span>
                  <span className="font-medium">{selectedOrder.service[language]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Дата' : 'Date'}</span>
                  <span className="font-medium">{selectedOrder.date} {selectedOrder.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Специалист' : 'Specialist'}</span>
                  <span className="font-medium">{selectedOrder.specialist}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{language === 'ru' ? 'Стоимость' : 'Price'}</span>
                  <span className="font-medium">{selectedOrder.price === 0 ? (language === 'ru' ? 'Бесплатно' : 'Free') : `${selectedOrder.price.toLocaleString()} ₽`}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">{language === 'ru' ? 'Пациент' : 'Patient'}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span>{selectedOrder.patient.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${selectedOrder.patient.phone}`} className="text-primary hover:underline">
                      {selectedOrder.patient.phone}
                    </a>
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">{language === 'ru' ? 'Примечания' : 'Notes'}</h4>
                  <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
              {language === 'ru' ? 'Закрыть' : 'Close'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
