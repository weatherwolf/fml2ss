/**
 * Meta Data Collection Utilities for FML to SceneScript Conversion
 * 
 * Provides standardized utilities for collecting meta data:
 * - Material data: Wall materials and decorations
 * - Swing data: Door swing direction and style
 * - Asset data: Asset references for doors, windows, and items
 * 
 * Note: These utilities no longer generate SceneScript commands.
 * All extra information is collected in meta.json files.
 */

export interface MetaDataResult {
  metaData: any;
  warnings: string[];
}

/**
 * Validate wall ID is in correct range
 */
export function validateWallId(id: number): boolean {
  return id >= 0;
}

/**
 * Validate door ID is in correct range
 */
export function validateDoorId(id: number): boolean {
  return id >= 1000 && id < 2000;
}

/**
 * Validate window ID is in correct range
 */
export function validateWindowId(id: number): boolean {
  return id >= 2000 && id < 3000;
}

/**
 * Validate item ID is in correct range
 */
export function validateItemId(id: number): boolean {
  return id >= 3000 && id < 4000;
}

/**
 * Validate asset reference is not empty
 */
export function validateAssetRef(ref: string): boolean {
  return Boolean(ref && ref.trim().length > 0);
}

/**
 * Create material meta data for wall materials (no longer generates commands)
 */
export function createMaterialMetaData(
  wallId: number,
  side: 'left' | 'right',
  type: 'color' | 'asset' | 'texture',
  value: string,
  additionalParams?: Record<string, string | number>
): MetaDataResult {
  const warnings: string[] = [];

  // Validate wall ID
  if (!validateWallId(wallId)) {
    warnings.push(`Invalid wall ID: ${wallId}. Must be >= 0`);
    return { metaData: null, warnings };
  }

  // Validate side
  if (side !== 'left' && side !== 'right') {
    warnings.push(`Invalid side: ${side}. Must be 'left' or 'right'`);
    return { metaData: null, warnings };
  }

  // Validate type
  if (type !== 'color' && type !== 'asset' && type !== 'texture') {
    warnings.push(`Invalid material type: ${type}. Must be 'color', 'asset', or 'texture'`);
    return { metaData: null, warnings };
  }

  // Validate value
  if (!value || value.trim().length === 0) {
    warnings.push(`Invalid material value: ${value}. Cannot be empty`);
    return { metaData: null, warnings };
  }

  // Build meta data
  const metaData = {
    type: type,
    value: value,
    ...additionalParams
  };

  return { metaData, warnings };
}

/**
 * Create swing meta data for door swing direction (no longer generates commands)
 */
export function createSwingMetaData(
  doorId: number,
  style: 'left' | 'right',
  inward: boolean,
  maxOpenDeg?: number
): MetaDataResult {
  const warnings: string[] = [];

  // Validate door ID
  if (!validateDoorId(doorId)) {
    warnings.push(`Invalid door ID: ${doorId}. Must be 1000-1999`);
    return { metaData: null, warnings };
  }

  // Validate style
  if (style !== 'left' && style !== 'right') {
    warnings.push(`Invalid swing style: ${style}. Must be 'left' or 'right'`);
    return { metaData: null, warnings };
  }

  // Build meta data
  const metaData = {
    style: style,
    inward: inward,
    ...(maxOpenDeg !== undefined && { maxOpenDeg })
  };

  return { metaData, warnings };
}

/**
 * Create asset meta data for asset references (no longer generates commands)
 */
export function createAssetMetaData(
  elementId: number,
  assetRef: string,
  elementType: 'wall' | 'door' | 'window' | 'item'
): MetaDataResult {
  const warnings: string[] = [];

  // Validate element ID based on type
  let isValidId = false;
  switch (elementType) {
    case 'wall':
      isValidId = validateWallId(elementId);
      break;
    case 'door':
      isValidId = validateDoorId(elementId);
      break;
    case 'window':
      isValidId = validateWindowId(elementId);
      break;
    case 'item':
      isValidId = validateItemId(elementId);
      break;
    default:
      warnings.push(`Invalid element type: ${elementType}`);
      return { metaData: null, warnings };
  }

  if (!isValidId) {
    warnings.push(`Invalid ${elementType} ID: ${elementId}`);
    return { metaData: null, warnings };
  }

  // Validate asset reference
  if (!validateAssetRef(assetRef)) {
    warnings.push(`Invalid asset reference: ${assetRef}. Cannot be empty`);
    return { metaData: null, warnings };
  }

  // Build meta data
  const metaData = {
    asset: assetRef
  };

  return { metaData, warnings };
}

/**
 * DEPRECATED: These functions are no longer used as all extra information
 * is now collected in meta.json files instead of generating SceneScript commands.
 * 
 * The following functions have been removed:
 * - createCommentCommand: Comments are no longer added to SceneScript
 * - validateAndFormatCommand: Command validation is no longer needed
 * 
 * All meta data collection is now handled by:
 * - createMaterialMetaData
 * - createSwingMetaData  
 * - createAssetMetaData
 */ 