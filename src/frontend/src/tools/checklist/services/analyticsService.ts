/**
 * Analytics Service - API calls for analytics and insights
 *
 * Provides analytics data about:
 * - Template usage statistics
 * - Library item popularity
 * - System overview metrics
 */

import { apiClient, getErrorMessage } from '../../../services/api';
import type { AnalyticsDashboard } from '../../../types';

/**
 * Analytics service interface
 */
export const analyticsService = {
  /**
   * Get analytics dashboard data
   * @returns Dashboard with overview, most used templates, popular items, etc.
   */
  async getDashboard(): Promise<AnalyticsDashboard> {
    try {
      const response = await apiClient.get<AnalyticsDashboard>('/api/analytics/dashboard');
      return response.data;
    } catch (error) {
      const message = getErrorMessage(error);
      throw new Error(message || 'Failed to load analytics dashboard');
    }
  },
};
