/**
 * Icon Mapping Utility Tests
 *
 * Tests for event icon and color mapping utilities.
 * These are pure functions with no external dependencies.
 */

import { describe, it, expect } from 'vitest';
import { getEventTypeColor } from './iconMapping';

describe('getEventTypeColor', () => {
  it('returns green for planned events', () => {
    expect(getEventTypeColor('planned')).toBe('#4caf50');
  });

  it('returns green for planned events (case insensitive)', () => {
    expect(getEventTypeColor('Planned')).toBe('#4caf50');
    expect(getEventTypeColor('PLANNED')).toBe('#4caf50');
  });

  it('returns orange for unplanned events', () => {
    expect(getEventTypeColor('unplanned')).toBe('#ff9800');
  });

  it('returns orange for unknown event types', () => {
    expect(getEventTypeColor('emergency')).toBe('#ff9800');
    expect(getEventTypeColor('other')).toBe('#ff9800');
  });

  it('returns orange when eventType is undefined', () => {
    expect(getEventTypeColor(undefined)).toBe('#ff9800');
  });

  it('returns orange when eventType is empty string', () => {
    expect(getEventTypeColor('')).toBe('#ff9800');
  });
});
