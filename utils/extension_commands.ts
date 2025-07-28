/**
 * Essential Extension Commands for FML to SceneScript Conversion
 * 
 * Provides standardized utilities for creating extension commands:
 * - set_material: Wall materials and decorations
 * - set_swing: Door swing direction and style
 * - set_asset: Asset references for doors, windows, and items
 */

export interface ExtensionCommandResult {
  command: string | null;
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
 * Create set_material command for wall materials
 */
export function createSetMaterialCommand(
  wallId: number,
  side: 'left' | 'right',
  type: 'color' | 'asset' | 'texture',
  value: string,
  additionalParams?: Record<string, string | number>
): ExtensionCommandResult {
  const warnings: string[] = [];

  // Validate wall ID
  if (!validateWallId(wallId)) {
    warnings.push(`Invalid wall ID: ${wallId}. Must be >= 0`);
    return { command: null, warnings };
  }

  // Validate side
  if (side !== 'left' && side !== 'right') {
    warnings.push(`Invalid side: ${side}. Must be 'left' or 'right'`);
    return { command: null, warnings };
  }

  // Validate type
  if (type !== 'color' && type !== 'asset' && type !== 'texture') {
    warnings.push(`Invalid material type: ${type}. Must be 'color', 'asset', or 'texture'`);
    return { command: null, warnings };
  }

  // Validate value
  if (!value || value.trim().length === 0) {
    warnings.push(`Invalid material value: ${value}. Cannot be empty`);
    return { command: null, warnings };
  }

  // Build command
  let command = `set_material, wall_id=${wallId}, side=${side}, type=${type}, value=${value}`;

  // Add additional parameters if provided
  if (additionalParams) {
    Object.entries(additionalParams).forEach(([key, val]) => {
      command += `, ${key}=${val}`;
    });
  }

  return { command, warnings };
}

/**
 * Create set_swing command for door swing direction
 */
export function createSetSwingCommand(
  doorId: number,
  style: 'left' | 'right',
  inward: boolean,
  maxOpenDeg?: number
): ExtensionCommandResult {
  const warnings: string[] = [];

  // Validate door ID
  if (!validateDoorId(doorId)) {
    warnings.push(`Invalid door ID: ${doorId}. Must be 1000-1999`);
    return { command: null, warnings };
  }

  // Validate style
  if (style !== 'left' && style !== 'right') {
    warnings.push(`Invalid swing style: ${style}. Must be 'left' or 'right'`);
    return { command: null, warnings };
  }

  // Build command
  let command = `set_swing, id=${doorId}, style=${style}, inward=${inward}`;

  // Add max open angle if provided
  if (maxOpenDeg !== undefined) {
    if (maxOpenDeg < 0 || maxOpenDeg > 180) {
      warnings.push(`Invalid max open angle: ${maxOpenDeg}. Must be 0-180 degrees`);
      return { command: null, warnings };
    }
    command += `, max_open_deg=${maxOpenDeg}`;
  }

  return { command, warnings };
}

/**
 * Create set_asset command for asset references
 */
export function createSetAssetCommand(
  elementId: number,
  assetRef: string,
  elementType: 'wall' | 'door' | 'window' | 'item'
): ExtensionCommandResult {
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
      return { command: null, warnings };
  }

  if (!isValidId) {
    warnings.push(`Invalid ${elementType} ID: ${elementId}`);
    return { command: null, warnings };
  }

  // Validate asset reference
  if (!validateAssetRef(assetRef)) {
    warnings.push(`Invalid asset reference: ${assetRef}. Cannot be empty`);
    return { command: null, warnings };
  }

  // Build command
  const command = `set_asset, id=${elementId}, refid=${assetRef}`;

  return { command, warnings };
}

/**
 * Create a comment command for unsupported properties
 */
export function createCommentCommand(
  elementType: string,
  elementId: number,
  property: string,
  value: any
): string {
  return `# ${elementType} ${elementId} ${property}: ${JSON.stringify(value)}`;
}

/**
 * Validate and format extension command with error handling
 */
export function validateAndFormatCommand(
  command: string,
  context: string
): ExtensionCommandResult {
  const warnings: string[] = [];

  // Basic validation
  if (!command || command.trim().length === 0) {
    warnings.push(`${context}: Empty command`);
    return { command: null, warnings };
  }

  // Check for basic SceneScript format (comma-separated key=value)
  if (!command.includes('=')) {
    warnings.push(`${context}: Invalid command format. Expected key=value pairs`);
    return { command: null, warnings };
  }

  // Check for required comma separation
  const parts = command.split(',');
  if (parts.length < 2) {
    warnings.push(`${context}: Invalid command format. Expected comma-separated parameters`);
    return { command: null, warnings };
  }

  return { command, warnings };
} 