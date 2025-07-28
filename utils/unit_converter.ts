/**
 * Unit conversion utilities for FML to SceneScript conversion
 * 
 * FML uses centimeters (cm) for all measurements
 * SceneScript uses meters (m) for all measurements
 * Conversion factor: 1 meter = 100 centimeters
 */

/**
 * Convert centimeters to meters
 * @param cm - Value in centimeters
 * @returns Value in meters
 */
export function cmToMeters(cm: number): number {
  return cm / 100.0;
}

/**
 * Convert meters to centimeters
 * @param meters - Value in meters
 * @returns Value in centimeters
 */
export function metersToCm(meters: number): number {
  return meters * 100.0;
}

/**
 * Convert a 2D point from centimeters to meters
 * @param point - Point with x, y coordinates in cm
 * @returns Point with x, y coordinates in meters
 */
export function convertPoint2D(point: { x: number; y: number }): { x: number; y: number } {
  return {
    x: cmToMeters(point.x),
    y: cmToMeters(point.y)
  };
}

/**
 * Convert a 3D point from centimeters to meters
 * @param point - Point with x, y, z coordinates in cm
 * @returns Point with x, y, z coordinates in meters
 */
export function convertPoint3D(point: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
  return {
    x: cmToMeters(point.x),
    y: cmToMeters(point.y),
    z: cmToMeters(point.z)
  };
}

/**
 * Convert dimensions (width, height, depth) from centimeters to meters
 * @param dimensions - Object with width, height, depth in cm
 * @returns Object with width, height, depth in meters
 */
export function convertDimensions(dimensions: { width: number; height: number; depth?: number }): { width: number; height: number; depth?: number } {
  const result: { width: number; height: number; depth?: number } = {
    width: cmToMeters(dimensions.width),
    height: cmToMeters(dimensions.height)
  };
  
  if (dimensions.depth !== undefined) {
    result.depth = cmToMeters(dimensions.depth);
  }
  
  return result;
}

/**
 * Convert wall thickness from centimeters to meters
 * @param thicknessCm - Wall thickness in centimeters
 * @returns Wall thickness in meters
 */
export function convertWallThickness(thicknessCm: number): number {
  return cmToMeters(thicknessCm);
}

/**
 * Convert wall height from centimeters to meters
 * @param heightCm - Wall height in centimeters
 * @returns Wall height in meters
 */
export function convertWallHeight(heightCm: number): number {
  return cmToMeters(heightCm);
}

/**
 * Convert opening dimensions from centimeters to meters
 * @param widthCm - Opening width in centimeters
 * @param heightCm - Opening height in centimeters
 * @returns Object with width and height in meters
 */
export function convertOpeningDimensions(widthCm: number, heightCm: number): { width: number; height: number } {
  return {
    width: cmToMeters(widthCm),
    height: cmToMeters(heightCm)
  };
}

/**
 * Convert item dimensions from centimeters to meters
 * @param item - Item with width, height, z_height in cm
 * @returns Object with width, height, z_height in meters
 */
export function convertItemDimensions(item: { width: number; height: number; z_height: number }): { width: number; height: number; z_height: number } {
  return {
    width: cmToMeters(item.width),
    height: cmToMeters(item.height),
    z_height: cmToMeters(item.z_height)
  };
}

/**
 * Calculate half-extents for bounding box from full dimensions
 * @param widthCm - Width in centimeters
 * @param heightCm - Height in centimeters
 * @param depthCm - Depth in centimeters
 * @returns Half-extents in meters
 */
export function calculateHalfExtents(widthCm: number, heightCm: number, depthCm: number): { halfX: number; halfY: number; halfZ: number } {
  return {
    halfX: cmToMeters(widthCm) / 2,
    halfY: cmToMeters(heightCm) / 2,
    halfZ: cmToMeters(depthCm) / 2
  };
}

/**
 * Convert degrees to radians
 * @param degrees - Angle in degrees
 * @returns Angle in radians
 */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Convert radians to degrees
 * @param radians - Angle in radians
 * @returns Angle in degrees
 */
export function radiansToDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

/**
 * Calculate distance between two 2D points in meters
 * @param point1 - First point in meters
 * @param point2 - Second point in meters
 * @returns Distance in meters
 */
export function calculateDistance2D(point1: { x: number; y: number }, point2: { x: number; y: number }): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate distance between two 2D points in centimeters
 * @param point1 - First point in centimeters
 * @param point2 - Second point in centimeters
 * @returns Distance in meters
 */
export function calculateDistance2DCm(point1: { x: number; y: number }, point2: { x: number; y: number }): number {
  const point1M = convertPoint2D(point1);
  const point2M = convertPoint2D(point2);
  return calculateDistance2D(point1M, point2M);
} 