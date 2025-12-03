/**
 * Position Service
 * Provides API calls for position management
 */

import { apiClient } from '../../../core/services/api';
import type { Position } from '../types';

export const positionService = {
  /**
   * Fetch all positions for the current organization
   */
  getPositions: async (): Promise<Position[]> => {
    const response = await apiClient.get<Position[]>('/api/positions');
    return response.data;
  },

  /**
   * Fetch a specific position by ID
   */
  getPosition: async (id: string): Promise<Position> => {
    const response = await apiClient.get<Position>(`/api/positions/${id}`);
    return response.data;
  },

  /**
   * Seed default ICS positions (admin only)
   */
  seedDefaultPositions: async (): Promise<Position[]> => {
    const response = await apiClient.post<Position[]>('/api/positions/seed-defaults');
    return response.data;
  },
};
