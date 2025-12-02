/**
 * useOperationalPeriodGrouping Hook
 *
 * Groups checklists by operational period with temporal hierarchy:
 * 1. Current Operational Period (most important)
 * 2. Incident-Level Checklists (no period - always visible)
 * 3. Previous Operational Periods (less important, collapsible)
 *
 * Assumes user is always within a single event (handled by C5).
 */

import { useMemo } from 'react';
import type { ChecklistInstanceDto } from '../services/checklistService';

/**
 * Section type for grouping
 */
export type SectionType = 'current' | 'incident' | 'previous';

/**
 * Operational Period Section
 */
export interface OperationalPeriodSection {
  type: SectionType;
  operationalPeriodId?: string;
  operationalPeriodName?: string;
  checklists: ChecklistInstanceDto[];
  sortOrder: number; // For ordering sections
  averageProgress: number; // Average completion across all checklists in section
}

/**
 * Hook options
 */
interface UseOperationalPeriodGroupingOptions {
  currentOperationalPeriodId?: string; // From C5 context (if available)
  sortPreviousByDate?: boolean; // Sort previous periods chronologically (default: true)
}

/**
 * Hook return type
 */
interface UseOperationalPeriodGroupingReturn {
  sections: OperationalPeriodSection[];
  currentSection: OperationalPeriodSection | null;
  incidentSection: OperationalPeriodSection | null;
  previousSections: OperationalPeriodSection[];
  totalChecklists: number;
  hasCurrentPeriod: boolean;
}

/**
 * Custom hook for grouping checklists by operational period
 */
export const useOperationalPeriodGrouping = (
  checklists: ChecklistInstanceDto[],
  options: UseOperationalPeriodGroupingOptions = {}
): UseOperationalPeriodGroupingReturn => {
  const {
    currentOperationalPeriodId,
    sortPreviousByDate = true,
  } = options;

  const grouped = useMemo(() => {
    const sections: OperationalPeriodSection[] = [];
    let currentSection: OperationalPeriodSection | null = null;
    let incidentSection: OperationalPeriodSection | null = null;
    const previousSections: OperationalPeriodSection[] = [];

    // Helper to calculate average progress
    const calculateAverageProgress = (
      checklistList: ChecklistInstanceDto[]
    ): number => {
      if (checklistList.length === 0) return 0;
      const total = checklistList.reduce(
        (sum, c) => sum + Number(c.progressPercentage),
        0
      );
      return Math.round(total / checklistList.length);
    };

    // 1. Current Operational Period
    if (currentOperationalPeriodId) {
      const currentChecklists = checklists.filter(
        (c) => c.operationalPeriodId === currentOperationalPeriodId
      );

      if (currentChecklists.length > 0) {
        currentSection = {
          type: 'current',
          operationalPeriodId: currentOperationalPeriodId,
          operationalPeriodName: currentChecklists[0].operationalPeriodName,
          checklists: currentChecklists,
          sortOrder: 0,
          averageProgress: calculateAverageProgress(currentChecklists),
        };
        sections.push(currentSection);
      }
    }

    // 2. Incident-Level Checklists (no operational period)
    const incidentChecklists = checklists.filter((c) => !c.operationalPeriodId);

    if (incidentChecklists.length > 0) {
      incidentSection = {
        type: 'incident',
        checklists: incidentChecklists,
        sortOrder: 1,
        averageProgress: calculateAverageProgress(incidentChecklists),
      };
      sections.push(incidentSection);
    }

    // 3. Previous Operational Periods (all other periods)
    const previousPeriodIds = new Set(
      checklists
        .filter(
          (c) =>
            c.operationalPeriodId &&
            c.operationalPeriodId !== currentOperationalPeriodId
        )
        .map((c) => c.operationalPeriodId!)
    );

    previousPeriodIds.forEach((periodId) => {
      const periodChecklists = checklists.filter(
        (c) => c.operationalPeriodId === periodId
      );

      if (periodChecklists.length > 0) {
        const section: OperationalPeriodSection = {
          type: 'previous',
          operationalPeriodId: periodId,
          operationalPeriodName: periodChecklists[0].operationalPeriodName,
          checklists: periodChecklists,
          sortOrder: 2, // Will be updated for chronological sorting
          averageProgress: calculateAverageProgress(periodChecklists),
        };
        previousSections.push(section);
      }
    });

    // Sort previous sections chronologically (most recent first)
    if (sortPreviousByDate && previousSections.length > 0) {
      previousSections.sort((a, b) => {
        // Sort by most recent checklist creation date
        const aLatest = Math.max(
          ...a.checklists.map((c) => new Date(c.createdAt).getTime())
        );
        const bLatest = Math.max(
          ...b.checklists.map((c) => new Date(c.createdAt).getTime())
        );
        return bLatest - aLatest; // Most recent first
      });

      // Update sort order
      previousSections.forEach((section, idx) => {
        section.sortOrder = 2 + idx;
      });
    }

    // Add previous sections to main sections array
    sections.push(...previousSections);

    return {
      sections,
      currentSection,
      incidentSection,
      previousSections,
      totalChecklists: checklists.length,
      hasCurrentPeriod: currentSection !== null,
    };
  }, [checklists, currentOperationalPeriodId, sortPreviousByDate]);

  return grouped;
};
