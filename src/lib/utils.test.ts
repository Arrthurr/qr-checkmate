import { calculateDistance } from '@/lib/utils';

describe('calculateDistance', () => {
  test('should calculate the distance between two distinct points (New York and Los Angeles)', () => {
    // Coordinates for New York City
    const lat1 = 40.7128;
    const lon1 = -74.0060;
    // Coordinates for Los Angeles
    const lat2 = 34.0522;
    const lon2 = -118.2437;
    const expectedDistance = 3935748; // Distance in meters (approximate)

    const distance = calculateDistance(lat1, lon1, lat2, lon2);
    // Allow for a small margin of error due to floating point calculations
    expect(distance).toBeCloseTo(expectedDistance, -3); // Check within 1000 meters
  });

  test('should return 0 when the two points are the same', () => {
    expect(calculateDistance(10, 20, 10, 20)).toBe(0);
  });
});