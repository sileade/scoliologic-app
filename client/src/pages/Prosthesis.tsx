import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import { Shield, QrCode, Calendar, FileText, CheckCircle2, XCircle, ChevronRight, Phone, Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import QRCode from "react-qr-code";

const warrantyCoverage = [
  { id: 1, item: { ru: "Производственные дефекты", en: "Manufacturing defects" }, covered: true },
  { id: 2, item: { ru: "Поломка материала", en: "Material failure" }, covered: true },
  { id: 3, item: { ru: "Ревизионная операция", en: "Revision surgery costs" }, covered: true },
  { id: 4, item: { ru: "Поддержка реабилитации", en: "Rehabilitation support" }, covered: true },
  { id: 5, item: { ru: "Ежегодные осмотры", en: "Annual check-ups" }, covered: true },
  { id: 6, item: { ru: "Случайные повреждения", en: "Accidental damage" }, covered: false },
];

export default function Prosthesis() {
  const { t, language } = useLanguage();
  const [showQR, setShowQR] = useState(false);

  // Fetch prosthesis data from API with caching
  const queryOptions = { staleTime: 60000, refetchOnWindowFocus: false, retry: 1 };
  const { data: prosthesis, isLoading: prosthesisLoading } = trpc.prosthesis.get.useQuery(undefined, queryOptions);
  const { data: documents, isLoading: documentsLoading } = trpc.prosthesis.getDocuments.useQuery(undefined, queryOptions);
  const { data: serviceRequests } = trpc.service.getRequests.useQuery(undefined, queryOptions);

  // Get upcoming maintenance from service requests
  const upcomingMaintenance = serviceRequests?.filter(
    req => req.status === 'scheduled' || req.status === 'pending'
  ).slice(0, 2) || [];

  const isLoading = prosthesisLoading;

  // Generate QR code data
  const qrData = prosthesis ? JSON.stringify({
    serial: prosthesis.serialNumber,
    model: prosthesis.name,
    implantDate: prosthesis.implantDate,
    patient: prosthesis.patientId
  }) : '';

  return (
    <AppLayout>
      <div className="px-4 py-6 lg:px-8 lg:py-8 space-y-6 max-w-6xl mx-auto">
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-3xl font-bold">{t("prosthesis.title")}</h1>
          <p className="text-muted-foreground text-sm lg:text-base">{t("prosthesis.subtitle")}</p>
        </div>

        {/* Main Info Card */}
        <Card className="border-none shadow-sm bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20">
          <CardContent className="p-4 lg:p-6">
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-14 h-14 rounded-xl" />
                    <div>
                      <Skeleton className="h-6 w-32 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i}>
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-5 w-28" />
                    </div>
                  ))}
                </div>
              </div>
            ) : prosthesis ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Shield className="w-7 h-7 text-green-600" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg">{prosthesis.name || 'Ortho Pro X3'}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${(prosthesis.warrantyStatus === 'active') ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
                        <span className={`text-sm ${(prosthesis.warrantyStatus === 'active') ? 'text-green-600' : 'text-yellow-600'} font-medium`}>
                          {(prosthesis.warrantyStatus === 'active') ? t("prosthesis.warrantyActive") : (language === 'ru' ? 'Гарантия истекла' : 'Warranty expired')}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowQR(true)}
                    className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    {t("prosthesis.showQR")}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">{t("prosthesis.serialNumber")}</p>
                    <p className="font-semibold">{prosthesis.serialNumber || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("prosthesis.implantDate")}</p>
                    <p className="font-semibold">
                      {prosthesis.implantDate 
                        ? new Date(prosthesis.implantDate).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })
                        : 'N/A'
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("prosthesis.surgeon")}</p>
                    <p className="font-semibold">{prosthesis.surgeon || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t("prosthesis.hospital")}</p>
                    <p className="font-semibold">{prosthesis.hospital || 'N/A'}</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">{language === 'ru' ? 'Протез не зарегистрирован' : 'No prosthesis registered'}</p>
                <p className="text-sm">{language === 'ru' ? 'Обратитесь к врачу для регистрации' : 'Contact your doctor for registration'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR Code Dialog */}
        <Dialog open={showQR} onOpenChange={setShowQR}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{language === 'ru' ? 'QR-код протеза' : 'Prosthesis QR Code'}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-6">
              {qrData && (
                <div className="bg-white p-4 rounded-xl">
                  <QRCode value={qrData} size={200} />
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-4 text-center">
                {language === 'ru' 
                  ? 'Покажите этот код при посещении клиники для быстрой идентификации'
                  : 'Show this code when visiting the clinic for quick identification'
                }
              </p>
            </div>
          </DialogContent>
        </Dialog>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Warranty Coverage */}
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-lg">{t("prosthesis.warrantyCoverage")}</h2>
              </div>
              <div className="space-y-3">
                {warrantyCoverage.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <span className="text-sm">{item.item[language]}</span>
                    {item.covered ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                ))}
              </div>
              {prosthesis?.warrantyExpiry && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {language === 'ru' ? 'Гарантия действует до:' : 'Warranty valid until:'}
                  </p>
                  <p className="font-semibold">
                    {new Date(prosthesis.warrantyExpiry || new Date()).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Maintenance Schedule */}
          <Card className="border-none shadow-sm">
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="font-bold text-lg">{t("prosthesis.maintenanceSchedule")}</h2>
                </div>
                <Link href="/service">
                  <Button variant="outline" size="sm">
                    {language === 'ru' ? 'Записаться' : 'Book'}
                  </Button>
                </Link>
              </div>
              <div className="space-y-3">
                {upcomingMaintenance.length > 0 ? (
                  upcomingMaintenance.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{item.type || item.serviceType}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.preferredDate 
                            ? new Date(item.preferredDate).toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })
                            : language === 'ru' ? 'Дата не назначена' : 'Date not set'
                          }
                        </p>
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        item.status === 'scheduled' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                      }`}>
                        {item.status === 'scheduled' 
                          ? (language === 'ru' ? 'Запланировано' : 'Scheduled')
                          : (language === 'ru' ? 'Ожидание' : 'Pending')
                        }
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>{language === 'ru' ? 'Нет запланированных ТО' : 'No scheduled maintenance'}</p>
                    <Link href="/service" className="text-primary hover:underline text-xs">
                      {language === 'ru' ? 'Записаться на обслуживание' : 'Book a service'}
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Documents */}
        <Card className="border-none shadow-sm">
          <CardContent className="p-4 lg:p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="font-bold text-lg">{t("prosthesis.documents")}</h2>
            </div>
            <div className="space-y-2">
              {documentsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div>
                        <Skeleton className="h-4 w-32 mb-1" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    </div>
                  </div>
                ))
              ) : documents && documents.length > 0 ? (
                documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">{doc.date} • {doc.type}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>{language === 'ru' ? 'Документы не найдены' : 'No documents found'}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Support CTA */}
        <Card className="border-none shadow-sm bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="p-4 lg:p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
              <Phone className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">{t("prosthesis.needHelp")}</h3>
              <p className="text-sm text-muted-foreground">{t("prosthesis.supportAvailable")}</p>
            </div>
            <a href="tel:+97145551234">
              <Button>
                {language === 'ru' ? 'Позвонить' : 'Call Now'}
              </Button>
            </a>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
