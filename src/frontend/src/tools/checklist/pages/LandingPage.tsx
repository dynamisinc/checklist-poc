/**
 * Landing Page - Variant Switcher
 *
 * Renders the appropriate landing page variant based on user configuration.
 * Supports switching between:
 * - Control (current card-based MyChecklistsPage)
 * - Task-First Minimal
 * - Role-Adaptive Dashboard
 * - Summary Cards
 *
 * Variant can be set via:
 * 1. Profile Menu setting
 * 2. URL parameter: ?landing=taskFirst
 * 3. localStorage: landingPageVariant
 */

import React from 'react';
import { useLandingVariant } from '../../../experiments';
import { MyChecklistsPage } from './MyChecklistsPage';
import {
  LandingTaskFirst,
  LandingRoleAdaptive,
  LandingSummaryCards,
} from '../components/landing-variants';

/**
 * Landing Page Component
 *
 * Switches between different landing page variants based on configuration
 */
export const LandingPage: React.FC = () => {
  const { variant } = useLandingVariant();

  // Render the appropriate variant
  switch (variant) {
    case 'taskFirst':
      return <LandingTaskFirst />;

    case 'roleAdaptive':
      return <LandingRoleAdaptive />;

    case 'summaryCards':
      return <LandingSummaryCards />;

    case 'control':
    default:
      return <MyChecklistsPage />;
  }
};

export default LandingPage;
