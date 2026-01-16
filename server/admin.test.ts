import { describe, it, expect, beforeAll } from 'vitest';
import * as db from './db';

describe('Admin Database Functions', () => {
  describe('getAllPatients', () => {
    it('should return array of patients', async () => {
      const patients = await db.getAllPatients();
      expect(Array.isArray(patients)).toBe(true);
    });

    it('should filter by status', async () => {
      const activePatients = await db.getAllPatients({ status: 'active' });
      expect(Array.isArray(activePatients)).toBe(true);
    });
  });

  describe('getAllRehabPlans', () => {
    it('should return array of rehab plans', async () => {
      const plans = await db.getAllRehabPlans();
      expect(Array.isArray(plans)).toBe(true);
    });

    it('should filter by status', async () => {
      const activePlans = await db.getAllRehabPlans({ status: 'active' });
      expect(Array.isArray(activePlans)).toBe(true);
    });
  });

  describe('getAllContent', () => {
    it('should return array of content', async () => {
      const content = await db.getAllContent();
      expect(Array.isArray(content)).toBe(true);
    });

    it('should filter by type', async () => {
      const articles = await db.getAllContent({ type: 'article' });
      expect(Array.isArray(articles)).toBe(true);
    });

    it('should filter by status', async () => {
      const published = await db.getAllContent({ status: 'published' });
      expect(Array.isArray(published)).toBe(true);
    });
  });

  describe('getAllOrders', () => {
    it('should return array of orders', async () => {
      const orders = await db.getAllOrders();
      expect(Array.isArray(orders)).toBe(true);
    });

    it('should filter by status', async () => {
      const pendingOrders = await db.getAllOrders({ status: 'pending' });
      expect(Array.isArray(pendingOrders)).toBe(true);
    });
  });

  describe('getCalendarAppointments', () => {
    it('should return array of appointments for date range', async () => {
      const startDate = new Date().toISOString();
      const endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const appointments = await db.getCalendarAppointments(startDate, endDate);
      expect(Array.isArray(appointments)).toBe(true);
    });
  });

  describe('getAnalyticsData', () => {
    it('should return analytics for week period', async () => {
      const analytics = await db.getAnalyticsData('week');
      expect(analytics).toBeDefined();
      if (analytics) {
        expect(analytics.period).toBe('week');
        expect(typeof analytics.totalPatients).toBe('number');
      }
    });

    it('should return analytics for month period', async () => {
      const analytics = await db.getAnalyticsData('month');
      expect(analytics).toBeDefined();
      if (analytics) {
        expect(analytics.period).toBe('month');
      }
    });

    it('should return analytics for year period', async () => {
      const analytics = await db.getAnalyticsData('year');
      expect(analytics).toBeDefined();
      if (analytics) {
        expect(analytics.period).toBe('year');
      }
    });
  });

  describe('getAdminDashboardStats', () => {
    it('should return dashboard stats', async () => {
      const stats = await db.getAdminDashboardStats();
      expect(stats).toBeDefined();
      if (stats) {
        expect(typeof stats.totalPatients).toBe('number');
        expect(typeof stats.activeRehabPlans).toBe('number');
        expect(typeof stats.todayAppointments).toBe('number');
        expect(typeof stats.pendingOrders).toBe('number');
        expect(typeof stats.publishedArticles).toBe('number');
      }
    });
  });

  describe('getSentNotifications', () => {
    it('should return array of sent notifications', async () => {
      const notifications = await db.getSentNotifications();
      expect(Array.isArray(notifications)).toBe(true);
    });
  });
});
