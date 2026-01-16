import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { getPatientRehabEvents, generateICSFeed, getCalendarSubscriptionURL } from "./calendar-feed";
import { processReminders, getNotificationPreferences, updateNotificationPreferences, REMINDER_INTERVALS } from "./notifications";
import { syncPatientCalendar, onScheduleChange, getLastSyncTime, getCalendarFeedVersion } from "./calendar-sync";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Patient profile procedures
  patient: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      // Try to get existing patient
      let patient = await db.getPatientByUserId(ctx.user.id);
      
      // If no patient exists, create one
      if (!patient && ctx.user.openId) {
        patient = await db.ensurePatientExists(ctx.user.openId, ctx.user.name || null);
      }
      
      return patient;
    }),
    
    updateProfile: protectedProcedure
      .input(z.object({
        phone: z.string().optional(),
        address: z.string().optional(),
        emergencyContactName: z.string().optional(),
        emergencyContactPhone: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.updatePatientProfile(ctx.user.id, input);
      }),
  }),

  // Prosthesis procedures
  prosthesis: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getPatientProsthesis(ctx.user.id);
    }),
    
    getDocuments: protectedProcedure.query(async ({ ctx }) => {
      // Return mock documents for now
      return [
        { id: 1, name: "Implant Certificate", date: "Oct 15, 2024", type: "PDF" },
        { id: 2, name: "Warranty Registration", date: "Oct 16, 2024", type: "PDF" },
        { id: 3, name: "Surgical Report", date: "Oct 15, 2024", type: "PDF" },
        { id: 4, name: "Post-Op Instructions", date: "Oct 15, 2024", type: "PDF" },
      ];
    }),
  }),

  // Rehabilitation procedures
  rehabilitation: router({
    getPlan: protectedProcedure.query(async ({ ctx }) => {
      return db.getPatientRehabPlan(ctx.user.id);
    }),
    
    getPhases: protectedProcedure
      .input(z.object({ planId: z.number() }))
      .query(async ({ input }) => {
        return db.getRehabPhases(input.planId);
      }),
    
    getTodaysTasks: protectedProcedure.query(async ({ ctx }) => {
      return db.getTodaysTasks(ctx.user.id);
    }),
    
    completeTask: protectedProcedure
      .input(z.object({ taskId: z.number() }))
      .mutation(async ({ input }) => {
        return db.completeTask(input.taskId);
      }),
  }),

  // Knowledge base procedures
  knowledge: router({
    getArticles: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        featured: z.boolean().optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getArticles(input);
      }),
    
    getArticle: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getArticleById(input.id);
      }),
    
    incrementViews: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.incrementArticleViews(input.id);
      }),
  }),

  // Service requests procedures
  service: router({
    getRequests: protectedProcedure.query(async ({ ctx }) => {
      return db.getServiceRequests(ctx.user.id);
    }),
    
    createRequest: protectedProcedure
      .input(z.object({
        type: z.enum(["adjustment", "checkup", "repair", "consultation"]),
        description: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.createServiceRequest(ctx.user.id, input);
      }),
    
    cancelRequest: protectedProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        return db.cancelServiceRequest(ctx.user.id, input.id);
      }),
  }),

  // Appointments procedures
  appointments: router({
    getUpcoming: protectedProcedure.query(async ({ ctx }) => {
      return db.getUpcomingAppointments(ctx.user.id);
    }),
    
    getAll: protectedProcedure.query(async ({ ctx }) => {
      return db.getAllAppointments(ctx.user.id);
    }),
  }),

  // Notifications procedures
  notifications: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
      return db.getNotifications(ctx.user.id);
    }),
    
    markAsRead: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.markNotificationAsRead(input.id);
      }),
    
    markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
      return db.markAllNotificationsAsRead(ctx.user.id);
    }),
    
    // Notification preferences
    getPreferences: protectedProcedure.query(async ({ ctx }) => {
      return getNotificationPreferences(ctx.user.id);
    }),
    
    updatePreferences: protectedProcedure
      .input(z.object({
        emailEnabled: z.boolean().optional(),
        pushEnabled: z.boolean().optional(),
        reminderDays: z.array(z.number()).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return updateNotificationPreferences(ctx.user.id, input);
      }),
    
    // Get available reminder intervals
    getReminderIntervals: publicProcedure.query(() => {
      return REMINDER_INTERVALS;
    }),
  }),

  // Achievements procedures
  achievements: router({
    getAll: protectedProcedure.query(async ({ ctx }) => {
      return db.getAchievements(ctx.user.id);
    }),
  }),

  // Calendar subscription
  calendar: router({
    getSubscriptionUrls: protectedProcedure.query(async ({ ctx }) => {
      const patient = await db.getPatientByUserId(ctx.user.id);
      if (!patient) return null;
      
      // Generate a simple token based on user ID (in production, use proper JWT)
      const token = Buffer.from(`${ctx.user.id}:${patient.id}`).toString('base64');
      const baseUrl = process.env.VITE_APP_URL || 'https://orthoinnovations.ae';
      
      return getCalendarSubscriptionURL(baseUrl, patient.id, token);
    }),
    
    getEvents: protectedProcedure.query(async ({ ctx }) => {
      const patient = await db.getPatientByUserId(ctx.user.id);
      if (!patient) return [];
      
      return getPatientRehabEvents(patient.id);
    }),
  }),

  // Dashboard summary
  dashboard: router({
    getSummary: protectedProcedure.query(async ({ ctx }) => {
      const [patient, prosthesis, plan, todaysTasks, appointments] = await Promise.all([
        db.getPatientByUserId(ctx.user.id),
        db.getPatientProsthesis(ctx.user.id),
        db.getPatientRehabPlan(ctx.user.id),
        db.getTodaysTasks(ctx.user.id),
        db.getUpcomingAppointments(ctx.user.id),
      ]);
      
      const completedToday = todaysTasks.filter(t => t.completed).length;
      const totalToday = todaysTasks.length;
      
      // Calculate day of recovery from plan start date
      const dayOfRecovery = plan?.startDate 
        ? Math.ceil((Date.now() - new Date(plan.startDate).getTime()) / (1000 * 60 * 60 * 24))
        : 1;
      
      return {
        patient,
        prosthesis,
        plan,
        todaysTasks,
        nextAppointment: appointments[0] || null,
        dailyProgress: totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0,
        dayOfRecovery: Math.max(1, dayOfRecovery),
      };
    }),
  }),

  // Admin routes for doctors to manage patient schedules
  admin: router({
    // Get all patients
    getPatients: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        status: z.enum(['active', 'inactive', 'all']).optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAllPatients(input);
      }),

    // Get patient by ID
    getPatient: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getPatientById(input.id);
      }),

    // Update patient profile (admin)
    updatePatient: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        dateOfBirth: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return db.updatePatientById(id, data);
      }),

    // Get all rehabilitation plans
    getRehabPlans: protectedProcedure
      .input(z.object({
        status: z.enum(['active', 'paused', 'completed', 'all']).optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAllRehabPlans(input);
      }),

    // Create rehabilitation plan
    createRehabPlan: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        title: z.string(),
        duration: z.number(),
        prosthesisType: z.string(),
        assignedDoctor: z.string(),
      }))
      .mutation(async ({ input }) => {
        return db.createRehabPlan(input);
      }),

    // Update rehabilitation plan status
    updateRehabPlanStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['active', 'paused', 'completed']),
      }))
      .mutation(async ({ input }) => {
        return db.updateRehabPlanStatus(input.id, input.status);
      }),

    // Get all content (articles, videos, exercises)
    getContent: protectedProcedure
      .input(z.object({
        type: z.enum(['article', 'video', 'exercise', 'all']).optional(),
        category: z.string().optional(),
        status: z.enum(['published', 'draft', 'all']).optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAllContent(input);
      }),

    // Create content
    createContent: protectedProcedure
      .input(z.object({
        titleRu: z.string(),
        titleEn: z.string(),
        type: z.enum(['article', 'video', 'exercise']),
        category: z.string(),
        content: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createContent(input);
      }),

    // Update content
    updateContent: protectedProcedure
      .input(z.object({
        id: z.number(),
        titleRu: z.string().optional(),
        titleEn: z.string().optional(),
        category: z.string().optional(),
        status: z.enum(['published', 'draft']).optional(),
      }))
      .mutation(async ({ input }) => {
        return db.updateContent(input.id, input);
      }),

    // Delete content
    deleteContent: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return db.deleteContent(input.id);
      }),

    // Get all orders/service requests
    getOrders: protectedProcedure
      .input(z.object({
        status: z.enum(['pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'all']).optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAllOrders(input);
      }),

    // Update order status
    updateOrderStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pending', 'scheduled', 'in_progress', 'completed', 'cancelled']),
      }))
      .mutation(async ({ input }) => {
        return db.updateOrderStatus(input.id, input.status);
      }),

    // Get calendar appointments for admin
    getCalendarAppointments: protectedProcedure
      .input(z.object({
        startDate: z.string(),
        endDate: z.string(),
      }))
      .query(async ({ input }) => {
        return db.getCalendarAppointments(input.startDate, input.endDate);
      }),

    // Send notification to patients
    sendNotification: protectedProcedure
      .input(z.object({
        titleRu: z.string(),
        titleEn: z.string(),
        messageRu: z.string(),
        messageEn: z.string(),
        type: z.enum(['info', 'reminder', 'alert', 'success']),
        audience: z.enum(['all', 'active', 'specific']),
        patientIds: z.array(z.number()).optional(),
        scheduledFor: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return db.createBroadcastNotification(input);
      }),

    // Get sent notifications
    getSentNotifications: protectedProcedure.query(async () => {
      return db.getSentNotifications();
    }),

    // Get analytics data
    getAnalytics: protectedProcedure
      .input(z.object({
        period: z.enum(['week', 'month', 'year']).optional(),
      }).optional())
      .query(async ({ input }) => {
        return db.getAnalyticsData(input?.period || 'month');
      }),

    // Get dashboard stats
    getDashboardStats: protectedProcedure.query(async () => {
      return db.getAdminDashboardStats();
      }),

    // Trigger calendar sync when doctor updates schedule
    syncPatientCalendar: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        changeType: z.enum(['appointment', 'task', 'phase', 'plan']),
        action: z.enum(['create', 'update', 'delete']),
        details: z.string(),
      }))
      .mutation(async ({ input }) => {
        return onScheduleChange(
          input.patientId,
          input.changeType,
          input.action,
          input.details
        );
      }),

    // Create appointment and auto-sync calendar
    createAppointment: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        title: z.string(),
        description: z.string().optional(),
        scheduledAt: z.string(), // ISO date string
        duration: z.number().optional(),
        doctorName: z.string().optional(),
        location: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const appointment = await db.createAppointment({
          patientId: input.patientId,
          title: input.title,
          description: input.description,
          scheduledAt: new Date(input.scheduledAt),
          duration: input.duration || 60,
          doctorName: input.doctorName,
          location: input.location,
        });

        // Auto-sync calendar
        await onScheduleChange(
          input.patientId,
          'appointment',
          'create',
          `${input.title} - ${new Date(input.scheduledAt).toLocaleDateString('ru-RU')}`
        );

        return appointment;
      }),

    // Update appointment and auto-sync calendar
    updateAppointment: protectedProcedure
      .input(z.object({
        id: z.number(),
        patientId: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        scheduledAt: z.string().optional(),
        duration: z.number().optional(),
        status: z.enum(['scheduled', 'completed', 'cancelled']).optional(),
      }))
      .mutation(async ({ input }) => {
        const appointment = await db.updateAppointment(input.id, {
          title: input.title,
          description: input.description,
          scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
          duration: input.duration,
          status: input.status,
        });

        // Auto-sync calendar
        await onScheduleChange(
          input.patientId,
          'appointment',
          'update',
          `Изменения в расписании: ${input.title || 'Приём'}`
        );

        return appointment;
      }),

    // Create task and auto-sync calendar
    createTask: protectedProcedure
      .input(z.object({
        patientId: z.number(),
        phaseId: z.number().optional(),
        title: z.string(),
        description: z.string().optional(),
        type: z.enum(['exercise', 'therapy', 'activity', 'medication']).optional(),
        duration: z.string().optional(),
        scheduledDate: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const task = await db.createTask({
          patientId: input.patientId,
          phaseId: input.phaseId,
          title: input.title,
          description: input.description,
          type: input.type || 'exercise',
          duration: input.duration,
          scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
        });

        // Auto-sync calendar
        await onScheduleChange(
          input.patientId,
          'task',
          'create',
          `Новое упражнение: ${input.title}`
        );

        return task;
      }),

    // Get calendar sync status for a patient
    getCalendarSyncStatus: protectedProcedure
      .input(z.object({ patientId: z.number() }))
      .query(async ({ input }) => {
        const lastSync = getLastSyncTime(input.patientId);
        const feedVersion = getCalendarFeedVersion(input.patientId);
        
        return {
          lastSyncTime: lastSync?.toISOString() || null,
          feedVersion,
          autoSyncEnabled: true,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
