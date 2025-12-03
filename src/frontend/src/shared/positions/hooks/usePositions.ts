/**
 * usePositions Hook
 * Fetches positions from the API with caching
 */

import { useState, useEffect, useCallback } from 'react';
import { positionService } from '../services/positionService';
import type { Position } from '../types';

// Cache for positions (shared across all instances of the hook)
let cachedPositions: Position[] | null = null;
let cachePromise: Promise<Position[]> | null = null;

export const usePositions = () => {
  const [positions, setPositions] = useState<Position[]>(cachedPositions || []);
  const [loading, setLoading] = useState(!cachedPositions);
  const [error, setError] = useState<string | null>(null);

  const fetchPositions = useCallback(async (forceRefresh = false) => {
    // If cached and not forcing refresh, use cache
    if (cachedPositions && !forceRefresh) {
      setPositions(cachedPositions);
      setLoading(false);
      return;
    }

    // If already fetching, wait for that promise
    if (cachePromise && !forceRefresh) {
      try {
        setLoading(true);
        const data = await cachePromise;
        setPositions(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load positions');
      } finally {
        setLoading(false);
      }
      return;
    }

    // Start new fetch
    setLoading(true);
    setError(null);

    cachePromise = positionService.getPositions();

    try {
      const data = await cachePromise;
      cachedPositions = data;
      setPositions(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load positions';
      setError(message);
      console.error('Failed to fetch positions:', err);
    } finally {
      setLoading(false);
      cachePromise = null;
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchPositions();
  }, [fetchPositions]);

  // Get position names for backward compatibility
  const positionNames = positions.map((p) => p.name);

  // Get position by name
  const getPositionByName = useCallback(
    (name: string): Position | undefined => {
      return positions.find((p) => p.name.toLowerCase() === name.toLowerCase());
    },
    [positions]
  );

  // Get position by ID
  const getPositionById = useCallback(
    (id: string): Position | undefined => {
      return positions.find((p) => p.id === id);
    },
    [positions]
  );

  // Clear cache (useful for testing or after admin changes)
  const clearCache = useCallback(() => {
    cachedPositions = null;
    cachePromise = null;
  }, []);

  return {
    positions,
    positionNames,
    loading,
    error,
    refetch: () => fetchPositions(true),
    getPositionByName,
    getPositionById,
    clearCache,
  };
};
