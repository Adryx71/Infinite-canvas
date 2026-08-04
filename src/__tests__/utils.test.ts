// Utility tests
// Not sure if these are necessary but might as well have some

import { describe, it, expect } from 'vitest';

// Helper function to test (if we had utils)
describe('Math utilities', () => {
  it('should calculate distance between points', () => {
    const distance = Math.hypot(3, 4);
    expect(distance).toBe(5);
  });

  it('should clamp values', () => {
    const clamp = (val: number, min: number, max: number) => 
      Math.min(Math.max(val, min), max);
    
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });

  it('should convert degrees to radians', () => {
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    expect(toRad(90)).toBeCloseTo(Math.PI / 2);
  });
});

describe('String utilities', () => {
  it('should generate UUID', () => {
    const uuid = crypto.randomUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('should parse hex colors', () => {
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      } : null;
    };
    
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('#ffffff')).toEqual({ r: 255, g: 255, b: 255 });
  });
});
