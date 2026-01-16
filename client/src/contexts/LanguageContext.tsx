import { createContext, useContext, useState, ReactNode } from "react";

type Language = "ru" | "en";

interface Translations {
  [key: string]: {
    ru: string;
    en: string;
  };
}

export const translations: Translations = {
  // Navigation
  "nav.dashboard": { ru: "Главная", en: "Dashboard" },
  "nav.rehabilitation": { ru: "Лечение", en: "Treatment" },
  "nav.documents": { ru: "Документы", en: "Documents" },
  "nav.prosthesis": { ru: "Изделия", en: "Devices" },
  "nav.messages": { ru: "Чат", en: "Messages" },
  "nav.knowledge": { ru: "База знаний", en: "Knowledge" },
  "nav.service": { ru: "Сервис", en: "Service" },
  "nav.profile": { ru: "Профиль", en: "Profile" },
  "nav.settings": { ru: "Настройки", en: "Settings" },
  
  // Documents
  "documents.title": { ru: "Мои документы", en: "My Documents" },
  "documents.subtitle": { ru: "Медицинские документы и справки", en: "Medical documents and certificates" },
  "documents.medicalRecords": { ru: "Медицинские записи", en: "Medical Records" },
  "documents.prescriptions": { ru: "Рецепты", en: "Prescriptions" },
  "documents.certificates": { ru: "Справки", en: "Certificates" },
  "documents.contracts": { ru: "Договоры", en: "Contracts" },
  "documents.ipr": { ru: "ИПР/ИПРА", en: "IPR/IPRA" },
  "documents.sfr": { ru: "Документы СФР", en: "SFR Documents" },
  "documents.upload": { ru: "Загрузить документ", en: "Upload Document" },
  "documents.download": { ru: "Скачать", en: "Download" },
  "documents.view": { ru: "Просмотр", en: "View" },
  "documents.empty": { ru: "Документы не найдены", en: "No documents found" },
  
  // Devices (Prosthesis/Orthesis/Corsets)
  "devices.title": { ru: "Мои изделия", en: "My Devices" },
  "devices.subtitle": { ru: "Ортезы, корсеты и протезы", en: "Orthoses, corsets and prostheses" },
  "devices.corsets": { ru: "Корсеты", en: "Corsets" },
  "devices.orthoses": { ru: "Ортезы", en: "Orthoses" },
  "devices.prostheses": { ru: "Протезы", en: "Prostheses" },
  "devices.all": { ru: "Все изделия", en: "All Devices" },
  "devices.active": { ru: "Активные", en: "Active" },
  "devices.history": { ru: "История", en: "History" },
  "devices.serialNumber": { ru: "Серийный номер", en: "Serial Number" },
  "devices.manufacturer": { ru: "Производитель", en: "Manufacturer" },
  "devices.installDate": { ru: "Дата установки", en: "Installation Date" },
  "devices.warranty": { ru: "Гарантия", en: "Warranty" },
  "devices.nextService": { ru: "Следующее ТО", en: "Next Service" },
  "devices.wearSchedule": { ru: "График ношения", en: "Wear Schedule" },
  "devices.fromMIS": { ru: "Данные из МИС", en: "Data from MIS" },
  
  // Messages (Secure Messenger)
  "messages.title": { ru: "Сообщения", en: "Messages" },
  "messages.subtitle": { ru: "Защищённый чат с врачами", en: "Secure chat with doctors" },
  "messages.newChat": { ru: "Новый чат", en: "New Chat" },
  "messages.search": { ru: "Поиск сообщений...", en: "Search messages..." },
  "messages.typeMessage": { ru: "Введите сообщение...", en: "Type a message..." },
  "messages.send": { ru: "Отправить", en: "Send" },
  "messages.encrypted": { ru: "Сообщения защищены шифрованием", en: "Messages are encrypted" },
  "messages.online": { ru: "В сети", en: "Online" },
  "messages.offline": { ru: "Не в сети", en: "Offline" },
  "messages.lastSeen": { ru: "Был(а) в сети", en: "Last seen" },
  "messages.typing": { ru: "печатает...", en: "typing..." },
  "messages.delivered": { ru: "Доставлено", en: "Delivered" },
  "messages.read": { ru: "Прочитано", en: "Read" },
  "messages.attachFile": { ru: "Прикрепить файл", en: "Attach file" },
  "messages.doctors": { ru: "Врачи", en: "Doctors" },
  "messages.support": { ru: "Поддержка", en: "Support" },
  
  // Auth (Gosuslugi)
  "auth.title": { ru: "Вход в приложение", en: "Sign In" },
  "auth.subtitle": { ru: "Войдите для доступа к личному кабинету", en: "Sign in to access your account" },
  "auth.gosuslugi": { ru: "Войти через Госуслуги", en: "Sign in with Gosuslugi" },
  "auth.gosuslugiDesc": { ru: "Безопасный вход через ЕСИА", en: "Secure login via ESIA" },
  "auth.phone": { ru: "Войти по номеру телефона", en: "Sign in with phone" },
  "auth.email": { ru: "Войти по email", en: "Sign in with email" },
  "auth.register": { ru: "Регистрация", en: "Register" },
  "auth.logout": { ru: "Выйти", en: "Sign Out" },
  "auth.terms": { ru: "Продолжая, вы соглашаетесь с условиями использования", en: "By continuing, you agree to the terms of service" },
  
  // Scoliologic specific
  "scolio.spine": { ru: "Позвоночник", en: "Spine" },
  "scolio.scoliosis": { ru: "Сколиоз", en: "Scoliosis" },
  "scolio.kyphosis": { ru: "Кифоз", en: "Kyphosis" },
  "scolio.lordosis": { ru: "Лордоз", en: "Lordosis" },
  "scolio.curvature": { ru: "Искривление", en: "Curvature" },
  "scolio.degree": { ru: "Градус", en: "Degree" },
  "scolio.cobbAngle": { ru: "Угол Кобба", en: "Cobb Angle" },
  "scolio.treatment": { ru: "Лечение", en: "Treatment" },
  "scolio.conservative": { ru: "Консервативное", en: "Conservative" },
  "scolio.surgical": { ru: "Хирургическое", en: "Surgical" },
  "scolio.lfk": { ru: "ЛФК", en: "Physical Therapy" },
  "scolio.massage": { ru: "Массаж", en: "Massage" },
  "scolio.corsetTherapy": { ru: "Корсетотерапия", en: "Corset Therapy" },
  
  // Dashboard
  "dashboard.greeting": { ru: "Доброе утро", en: "Good Morning" },
  "dashboard.journey": { ru: "День {day} вашего пути восстановления. Так держать!", en: "You're on day {day} of your rehabilitation journey. Keep it up!" },
  "dashboard.nextAppointment": { ru: "Следующий приём", en: "Next Appointment" },
  "dashboard.dailyGoal": { ru: "Цель на день", en: "Daily Goal" },
  "dashboard.prosthesisStatus": { ru: "Статус протеза", en: "Prosthesis Status" },
  "dashboard.todaysPlan": { ru: "План на сегодня", en: "Today's Plan" },
  "dashboard.complete": { ru: "Выполнено", en: "Complete" },
  "dashboard.exercisesRemaining": { ru: "упражнений осталось", en: "exercises remaining" },
  "dashboard.optimal": { ru: "Оптимально", en: "Optimal" },
  "dashboard.activeWarranty": { ru: "Гарантия активна", en: "Active Warranty" },
  "dashboard.nextService": { ru: "Сервис через {days} дней", en: "Next service in {days} days" },
  "dashboard.tomorrow": { ru: "Завтра", en: "Tomorrow" },
  "dashboard.quickActions": { ru: "Быстрые действия", en: "Quick Actions" },
  "dashboard.viewPlan": { ru: "Смотреть план", en: "View Plan" },
  "dashboard.articles": { ru: "Статьи", en: "Articles" },
  "dashboard.bookService": { ru: "Записаться", en: "Book Service" },
  "dashboard.needService": { ru: "Требуется сервис", en: "Service Required" },
  "dashboard.bookServiceDesc": { ru: "Запишитесь на обслуживание вашего протеза", en: "Schedule maintenance for your prosthesis" },
  
  // Rehabilitation
  "rehab.title": { ru: "План реабилитации", en: "Rehabilitation Plan" },
  "rehab.subtitle": { ru: "Ваш персональный путь восстановления", en: "Your personalized recovery journey" },
  "rehab.todaysProgress": { ru: "Прогресс за сегодня", en: "Today's Progress" },
  "rehab.tasksCompleted": { ru: "заданий выполнено", en: "tasks completed" },
  "rehab.todaysTasks": { ru: "Задания на сегодня", en: "Today's Tasks" },
  "rehab.viewAll": { ru: "Смотреть все", en: "View all" },
  "rehab.start": { ru: "Начать", en: "Start" },
  "rehab.upcomingAppointments": { ru: "Предстоящие приёмы", en: "Upcoming Appointments" },
  "rehab.thisWeek": { ru: "На этой неделе", en: "This Week" },
  "rehab.exercisesCompleted": { ru: "Упражнений выполнено", en: "Exercises completed" },
  "rehab.activeMinutes": { ru: "Активных минут", en: "Active minutes" },
  "rehab.streak": { ru: "Серия", en: "Streak" },
  "rehab.days": { ru: "дней", en: "days" },
  "rehab.recoveryPhases": { ru: "Этапы восстановления", en: "Recovery Phases" },
  "rehab.phases": { ru: "Этапы восстановления", en: "Recovery Phases" },
  "rehab.noPlan": { ru: "План не назначен", en: "No plan assigned" },
  "rehab.completed": { ru: "Завершено", en: "Completed" },
  "rehab.inProgress": { ru: "В процессе", en: "In Progress" },
  "rehab.upcoming": { ru: "Предстоит", en: "Upcoming" },
  "rehab.tasks": { ru: "заданий", en: "tasks" },
  
  // Knowledge Base
  "knowledge.title": { ru: "База знаний", en: "Knowledge Base" },
  "knowledge.subtitle": { ru: "Образовательные материалы для вашего восстановления", en: "Educational resources for your recovery" },
  "knowledge.search": { ru: "Поиск статей и видео...", en: "Search articles and videos..." },
  "knowledge.featured": { ru: "Рекомендуемое", en: "Featured" },
  "knowledge.all": { ru: "Все", en: "All" },
  "knowledge.exercises": { ru: "Упражнения", en: "Exercises" },
  "knowledge.nutrition": { ru: "Питание", en: "Nutrition" },
  "knowledge.recovery": { ru: "Восстановление", en: "Recovery Tips" },
  "knowledge.faq": { ru: "Вопросы", en: "FAQ" },
  "knowledge.allResources": { ru: "Все материалы", en: "All Resources" },
  "knowledge.items": { ru: "материалов", en: "items" },
  "knowledge.video": { ru: "Видео", en: "Video" },
  "knowledge.article": { ru: "Статья", en: "Article" },
  "knowledge.minRead": { ru: "мин чтения", en: "min read" },
  "knowledge.min": { ru: "мин", en: "min" },
  "knowledge.noResults": { ru: "Статьи не найдены.", en: "No articles found matching your search." },
  
  // Prosthesis
  "prosthesis.title": { ru: "Мой протез", en: "My Prosthesis" },
  "prosthesis.subtitle": { ru: "Информация об импланте и гарантии", en: "Implant information and warranty details" },
  "prosthesis.warrantyActive": { ru: "Гарантия активна", en: "Warranty Active" },
  "prosthesis.showQR": { ru: "Показать QR-код", en: "Show QR Code" },
  "prosthesis.serialNumber": { ru: "Серийный номер", en: "Serial Number" },
  "prosthesis.implantDate": { ru: "Дата установки", en: "Implant Date" },
  "prosthesis.surgeon": { ru: "Хирург", en: "Surgeon" },
  "prosthesis.hospital": { ru: "Клиника", en: "Hospital" },
  "prosthesis.warrantyCoverage": { ru: "Гарантийное покрытие", en: "Warranty Coverage" },
  "prosthesis.warrantyPeriod": { ru: "Срок гарантии", en: "Warranty Period" },
  "prosthesis.yearsRemaining": { ru: "лет осталось", en: "years remaining" },
  "prosthesis.validUntil": { ru: "Действует до", en: "Valid until" },
  "prosthesis.manufacturingDefects": { ru: "Производственные дефекты", en: "Manufacturing defects" },
  "prosthesis.materialFailure": { ru: "Поломка материала", en: "Material failure" },
  "prosthesis.revisionSurgery": { ru: "Ревизионная операция", en: "Revision surgery costs" },
  "prosthesis.rehabSupport": { ru: "Поддержка реабилитации", en: "Rehabilitation support" },
  "prosthesis.annualCheckups": { ru: "Ежегодные осмотры", en: "Annual check-ups" },
  "prosthesis.accidentalDamage": { ru: "Случайные повреждения", en: "Accidental damage" },
  "prosthesis.maintenanceSchedule": { ru: "График обслуживания", en: "Maintenance Schedule" },
  "prosthesis.documents": { ru: "Документы", en: "Documents" },
  "prosthesis.needHelp": { ru: "Нужна помощь с протезом?", en: "Need assistance with your prosthesis?" },
  "prosthesis.supportAvailable": { ru: "Наша служба поддержки доступна 24/7.", en: "Our support team is available 24/7 to help with any questions or concerns." },
  "prosthesis.contactSupport": { ru: "Связаться с поддержкой", en: "Contact Support" },
  
  // Service
  "service.title": { ru: "Сервисный центр", en: "Service Center" },
  "service.subtitle": { ru: "Обслуживание и поддержка вашего протеза", en: "Maintenance and support for your prosthesis" },
  "service.newRequest": { ru: "Новая заявка", en: "New Service Request" },
  "service.adjustment": { ru: "Настройка", en: "Adjustment" },
  "service.checkup": { ru: "Осмотр", en: "Check-up" },
  "service.repair": { ru: "Ремонт", en: "Repair" },
  "service.consultation": { ru: "Консультация", en: "Consultation" },
  "service.requests": { ru: "Заявки на сервис", en: "Service Requests" },
  "service.active": { ru: "Активные", en: "Active" },
  "service.completedTab": { ru: "Завершённые", en: "Completed" },
  "service.allTab": { ru: "Все", en: "All" },
  "service.inProgress": { ru: "В работе", en: "In Progress" },
  "service.scheduled": { ru: "Запланировано", en: "Scheduled" },
  "service.pending": { ru: "Ожидает", en: "Pending" },
  "service.location": { ru: "Место обслуживания", en: "Service Location" },
  "service.callClinic": { ru: "Позвонить", en: "Call Clinic" },
  "service.sendMessage": { ru: "Написать", en: "Send Message" },
  "service.getDirections": { ru: "Маршрут", en: "Get Directions" },
  "service.adjustmentDesc": { ru: "Настройка посадки и выравнивания", en: "Fitting and alignment adjustment" },
  "service.checkupDesc": { ru: "Плановый осмотр протеза", en: "Scheduled prosthesis inspection" },
  "service.repairDesc": { ru: "Ремонт и замена компонентов", en: "Repair and component replacement" },
  "service.emergency": { ru: "Экстренный", en: "Emergency" },
  "service.emergencyDesc": { ru: "Срочный ремонт и помощь", en: "Urgent repair and assistance" },
  
  // Profile
  "profile.title": { ru: "Профиль", en: "Profile" },
  "profile.subtitle": { ru: "Ваша личная информация и данные о здоровье", en: "Your personal information and health data" },
  "profile.editProfile": { ru: "Редактировать", en: "Edit Profile" },
  "profile.verifiedPatient": { ru: "Верифицированный пациент", en: "Verified Patient" },
  "profile.recoveryProgress": { ru: "Прогресс восстановления", en: "Recovery Progress" },
  "profile.exercisesCompleted": { ru: "Упражнений выполнено", en: "Exercises Completed" },
  "profile.daysSinceSurgery": { ru: "Дней после операции", en: "Days Since Surgery" },
  "profile.nextAppointment": { ru: "Следующий приём", en: "Next Appointment" },
  "profile.inDays": { ru: "через {days} дней", en: "in {days} days" },
  "profile.personalInfo": { ru: "Личная информация", en: "Personal Information" },
  "profile.email": { ru: "Email", en: "Email" },
  "profile.phone": { ru: "Телефон", en: "Phone" },
  "profile.dateOfBirth": { ru: "Дата рождения", en: "Date of Birth" },
  "profile.bloodType": { ru: "Группа крови", en: "Blood Type" },
  "profile.address": { ru: "Адрес", en: "Address" },
  "profile.emergencyContact": { ru: "Экстренный контакт", en: "Emergency Contact" },
  "profile.insurance": { ru: "Страховка", en: "Insurance" },
  "profile.provider": { ru: "Страховая компания", en: "Provider" },
  "profile.policyNumber": { ru: "Номер полиса", en: "Policy Number" },
  "profile.activeCoverage": { ru: "Активное покрытие", en: "Active Coverage" },
  "profile.viewDetails": { ru: "Подробнее", en: "View Insurance Details" },
  "profile.achievements": { ru: "Достижения", en: "Achievements" },
  
  // Settings
  "settings.title": { ru: "Настройки", en: "Settings" },
  "settings.subtitle": { ru: "Управление настройками аккаунта", en: "Manage your account preferences" },
  "settings.notifications": { ru: "Уведомления", en: "Notifications" },
  "settings.notificationsDesc": { ru: "Выберите способ уведомлений", en: "Choose how you want to be notified" },
  "settings.emailNotif": { ru: "Email уведомления", en: "Email Notifications" },
  "settings.emailNotifDesc": { ru: "Получать обновления по email", en: "Receive updates via email" },
  "settings.pushNotif": { ru: "Push уведомления", en: "Push Notifications" },
  "settings.pushNotifDesc": { ru: "Получать push уведомления", en: "Receive push notifications on your device" },
  "settings.reminders": { ru: "Напоминания об упражнениях", en: "Exercise Reminders" },
  "settings.remindersDesc": { ru: "Ежедневные напоминания", en: "Daily reminders for your exercises" },
  "settings.updates": { ru: "Обновления продукта", en: "Product Updates" },
  "settings.updatesDesc": { ru: "Новости и анонсы", en: "News and feature announcements" },
  "settings.appearance": { ru: "Внешний вид", en: "Appearance" },
  "settings.appearanceDesc": { ru: "Настройте внешний вид приложения", en: "Customize how the app looks" },
  "settings.darkMode": { ru: "Тёмная тема", en: "Dark Mode" },
  "settings.darkModeDesc": { ru: "Использовать тёмную тему", en: "Use dark theme" },
  "settings.language": { ru: "Язык", en: "Language" },
  "settings.languageDesc": { ru: "Выберите язык приложения", en: "Choose app language" },
  "settings.security": { ru: "Безопасность", en: "Security" },
  "settings.securityDesc": { ru: "Управление настройками безопасности", en: "Manage your security settings" },
  "settings.changePassword": { ru: "Изменить пароль", en: "Change Password" },
  "settings.changePasswordDesc": { ru: "Обновите ваш пароль", en: "Update your password" },
  "settings.twoFactor": { ru: "Двухфакторная аутентификация", en: "Two-Factor Authentication" },
  "settings.twoFactorDesc": { ru: "Дополнительная защита", en: "Add an extra layer of security" },
  "settings.support": { ru: "Поддержка", en: "Support" },
  "settings.helpCenter": { ru: "Центр помощи", en: "Help Center" },
  "settings.contactSupport": { ru: "Связаться с поддержкой", en: "Contact Support" },
  "settings.terms": { ru: "Условия и политика", en: "Terms & Privacy Policy" },
  "settings.signOut": { ru: "Выйти", en: "Sign Out" },
  "settings.version": { ru: "Версия", en: "Version" },
  
  // Common
  "common.loading": { ru: "Загрузка...", en: "Loading..." },
  "common.error": { ru: "Ошибка", en: "Error" },
  "common.retry": { ru: "Повторить", en: "Retry" },
  "common.cancel": { ru: "Отмена", en: "Cancel" },
  "common.save": { ru: "Сохранить", en: "Save" },
  "common.delete": { ru: "Удалить", en: "Delete" },
  "common.edit": { ru: "Редактировать", en: "Edit" },
  "common.back": { ru: "Назад", en: "Back" },
  "common.next": { ru: "Далее", en: "Next" },
  "common.done": { ru: "Готово", en: "Done" },
  "common.min": { ru: "мин", en: "min" },
  "common.call": { ru: "Позвонить", en: "Call" },
  "common.message": { ru: "Написать", en: "Message" },
  
  // Dashboard Team
  "dashboard.yourTeam": { ru: "Ваша команда", en: "Your Team" },
  "dashboard.nearestCenter": { ru: "Ближайший сервисный центр", en: "Nearest Service Center" },
  "dashboard.serviceCenterName": { ru: "Ortho Innovations Москва", en: "Ortho Innovations Moscow" },
  "dashboard.serviceCenterAddress": { ru: "ул. Тверская, 15, Москва", en: "15 Tverskaya St, Moscow" },
  
  // Admin Panel
  "admin.doctorPanel": { ru: "Панель врача", en: "Doctor Panel" },
  "admin.backToPatient": { ru: "К приложению", en: "Back to App" },
  
  // Admin Navigation
  "admin.nav.dashboard": { ru: "Главная", en: "Dashboard" },
  "admin.nav.patients": { ru: "Пациенты", en: "Patients" },
  "admin.nav.rehabilitation": { ru: "Реабилитация", en: "Rehabilitation" },
  "admin.nav.content": { ru: "Контент", en: "Content" },
  "admin.nav.orders": { ru: "Заказы", en: "Orders" },
  "admin.nav.calendar": { ru: "Календарь", en: "Calendar" },
  "admin.nav.notifications": { ru: "Уведомления", en: "Notifications" },
  "admin.nav.analytics": { ru: "Аналитика", en: "Analytics" },
  
  // Admin Dashboard
  "admin.dashboard.title": { ru: "Панель управления", en: "Admin Dashboard" },
  "admin.dashboard.recentPatients": { ru: "Последние пациенты", en: "Recent Patients" },
  "admin.dashboard.pendingTasks": { ru: "Ожидающие задачи", en: "Pending Tasks" },
  "admin.dashboard.tasks": { ru: "задач", en: "tasks" },
  "admin.dashboard.totalPatients": { ru: "Всего пациентов", en: "Total Patients" },
  "admin.dashboard.activeToday": { ru: "Активны сегодня", en: "Active Today" },
  "admin.dashboard.pendingOrders": { ru: "Заявки в ожидании", en: "Pending Orders" },
  "admin.dashboard.appointmentsToday": { ru: "Приёмов сегодня", en: "Appointments Today" },
  
  // Admin Stats
  "admin.stats.totalPatients": { ru: "Всего пациентов", en: "Total Patients" },
  "admin.stats.activeToday": { ru: "Активны сегодня", en: "Active Today" },
  "admin.stats.pendingOrders": { ru: "Заявки в ожидании", en: "Pending Orders" },
  "admin.stats.appointmentsToday": { ru: "Приёмов сегодня", en: "Appointments Today" },
  "admin.stats.vsLastMonth": { ru: "вс прошлый месяц", en: "vs last month" },
  
  // Admin Status
  "admin.status.all": { ru: "Все", en: "All" },
  "admin.status.active": { ru: "Активный", en: "Active" },
  "admin.status.pending": { ru: "Ожидает", en: "Pending" },
  "admin.status.inactive": { ru: "Неактивный", en: "Inactive" },
  
  // Admin Actions
  "admin.actions.addPatient": { ru: "Добавить пациента", en: "Add Patient" },
  "admin.actions.sendNotification": { ru: "Отправить уведомление", en: "Send Notification" },
  
  // Admin Patients
  "admin.patients.title": { ru: "Управление пациентами", en: "Patient Management" },
  "admin.patients.searchPlaceholder": { ru: "Поиск пациентов...", en: "Search patients..." },
  "admin.patients.export": { ru: "Экспорт", en: "Export" },
  "admin.patients.addNew": { ru: "Добавить", en: "Add New" },
  "admin.patients.name": { ru: "Имя", en: "Name" },
  "admin.patients.contact": { ru: "Контакт", en: "Contact" },
  "admin.patients.prosthesis": { ru: "Протез", en: "Prosthesis" },
  "admin.patients.progress": { ru: "Прогресс", en: "Progress" },
  "admin.patients.status": { ru: "Статус", en: "Status" },
  "admin.patients.showing": { ru: "Показано", en: "Showing" },
  "admin.patients.of": { ru: "из", en: "of" },
  
  // Admin Analytics
  "admin.analytics.title": { ru: "Аналитика и отчёты", en: "Analytics & Reports" },
  "admin.analytics.exportCSV": { ru: "Экспорт CSV", en: "Export CSV" },
  "admin.analytics.kpiTitle": { ru: "Ключевые показатели", en: "Key Performance Indicators" },
  "admin.analytics.target": { ru: "Цель", en: "Target" },
  "admin.analytics.achieved": { ru: "Достигнуто", en: "Achieved" },
  "admin.analytics.inProgress": { ru: "В процессе", en: "In Progress" },
  "admin.analytics.monthlyUsers": { ru: "Пользователи по месяцам", en: "Monthly Users" },
  "admin.analytics.revenue": { ru: "Выручка", en: "Revenue" },
  "admin.analytics.totalUsers": { ru: "Всего пользователей", en: "Total Users" },
  "admin.analytics.totalRevenue": { ru: "Общая выручка", en: "Total Revenue" },
  "admin.analytics.topArticles": { ru: "Популярные статьи", en: "Top Articles" },
  "admin.analytics.views": { ru: "просмотров", en: "views" },
  "admin.analytics.userActivity": { ru: "Активность пользователей", en: "User Activity" },
  "admin.analytics.dailyActive": { ru: "Активных за день", en: "Daily Active" },
  "admin.analytics.weeklyActive": { ru: "Активных за неделю", en: "Weekly Active" },
  "admin.analytics.exercisesCompleted": { ru: "Упражнений выполнено", en: "Exercises Completed" },
  "admin.analytics.avgStreak": { ru: "Средняя серия", en: "Average Streak" },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem("ortho-language");
    return (saved as Language) || "ru";
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem("ortho-language", lang);
  };

  const t = (key: string, params?: Record<string, string | number>): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }
    
    let text = translation[language];
    
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        text = text.replace(`{${param}}`, String(value));
      });
    }
    
    return text;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
