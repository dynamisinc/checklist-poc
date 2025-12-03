/**
 * Experiment Configuration Tests
 *
 * Tests for variant validation and lookup utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  isValidVariant,
  getVariantInfo,
  checklistVariants,
} from './experimentConfig';

describe('isValidVariant', () => {
  it('returns true for valid variants', () => {
    expect(isValidVariant('control')).toBe(true);
    expect(isValidVariant('classic')).toBe(true);
    expect(isValidVariant('compact')).toBe(true);
    expect(isValidVariant('progressive')).toBe(true);
  });

  it('returns false for invalid variants', () => {
    expect(isValidVariant('invalid')).toBe(false);
    expect(isValidVariant('')).toBe(false);
    expect(isValidVariant('CONTROL')).toBe(false); // case-sensitive
  });
});

describe('getVariantInfo', () => {
  it('returns variant info for valid variants', () => {
    const controlInfo = getVariantInfo('control');
    expect(controlInfo).toBeDefined();
    expect(controlInfo?.name).toBe('Current (Cards)');
    expect(controlInfo?.icon).toBe('square');
  });

  it('returns classic variant info', () => {
    const classicInfo = getVariantInfo('classic');
    expect(classicInfo).toBeDefined();
    expect(classicInfo?.name).toBe('Classic Checklist');
    expect(classicInfo?.description).toContain('Simple list');
  });

  it('returns undefined for invalid variant', () => {
    // @ts-expect-error - testing invalid input
    const info = getVariantInfo('invalid');
    expect(info).toBeUndefined();
  });
});

describe('checklistVariants', () => {
  it('contains exactly 4 variants', () => {
    expect(checklistVariants).toHaveLength(4);
  });

  it('each variant has required properties', () => {
    checklistVariants.forEach((variant) => {
      expect(variant.id).toBeDefined();
      expect(variant.name).toBeDefined();
      expect(variant.description).toBeDefined();
      expect(variant.icon).toBeDefined();
    });
  });

  it('variant IDs are unique', () => {
    const ids = checklistVariants.map((v) => v.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
