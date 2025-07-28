import { Wall, Door, Window, GenericOpening } from '../fml_classes';
import { cmToMeters, convertOpeningDimensions } from '../utils/unit_converter';
import { IdManager } from '../utils/id_manager';
import { createSetSwingCommand, createSetAssetCommand, createCommentCommand } from '../utils/extension_commands';
import { WarningCollector } from '../utils/warning_collector';

export interface OpeningConversionResult {
  sceneLines: string[];
  nextDoorId: number;
  nextWindowId: number;
  warnings: string[];
}

export interface WallCoordinates {
  ax: number; ay: number; az: number;
  bx: number; by: number; bz: number;
}

export class OpeningConverter {
  private warningCollector: WarningCollector;

  constructor(warningCollector: WarningCollector) {
    this.warningCollector = warningCollector;
  }



  /**
   * Calculate opening position along a wall using linear interpolation
   */
  private calculateOpeningPosition(
    opening: GenericOpening,
    wallCoords: WallCoordinates
  ): { x: number; y: number; z: number } {
    // Linear interpolation between wall endpoints A and B
    const t = opening.t; // relative position (0-1)
    const x = wallCoords.ax + (wallCoords.bx - wallCoords.ax) * t;
    const y = wallCoords.ay + (wallCoords.by - wallCoords.ay) * t;
    const z = cmToMeters(opening.z); // base elevation

    return { x, y, z };
  }

  /**
   * Determine door swing direction from FML mirrored flags
   */
  private calculateDoorSwing(opening: Door): { style: string; inward: boolean } {
    // FML mirrored flags: [vFlip, hFlip]
    // vFlip (mirrored[0]): 0 = left hinge, 1 = right hinge
    // hFlip (mirrored[1]): 0 = inward, 1 = outward
    const mirrored = opening.mirrored || [0, 0];
    
    const hingeLeft = mirrored[0] === 0;
    const inward = mirrored[1] === 0;
    const style = hingeLeft ? 'left' : 'right';

    return { style, inward };
  }

  /**
   * Convert a single door to SceneScript commands
   */
  private convertDoor(
    door: Door,
    doorId: number,
    wallId: number,
    wallCoords: WallCoordinates
  ): string[] {
    const lines: string[] = [];
    
    // Calculate position
    const position = this.calculateOpeningPosition(door, wallCoords);
    const dimensions = convertOpeningDimensions(door.width, door.z_height);
    const width = dimensions.width;
    const height = dimensions.height;

    // Generate make_door command
    lines.push(`make_door, id=${doorId}, wall0_id=${wallId}, wall1_id=-1, position_x=${position.x.toFixed(6)}, position_y=${position.y.toFixed(6)}, position_z=${position.z.toFixed(6)}, width=${width.toFixed(6)}, height=${height.toFixed(6)}`);

    // Generate set_swing command
    const swing = this.calculateDoorSwing(door);
    const swingResult = createSetSwingCommand(doorId, swing.style as 'left' | 'right', swing.inward);
    if (swingResult.warnings.length > 0) {
      // Warnings are already collected by the extension command utilities
    }
    if (swingResult.command) {
      lines.push(swingResult.command);
    }

    // Generate set_asset command
    const assetResult = createSetAssetCommand(doorId, door.refid, 'door');
    if (assetResult.warnings.length > 0) {
      // Warnings are already collected by the extension command utilities
    }
    if (assetResult.command) {
      lines.push(assetResult.command);
    }

    // Handle unsupported properties as comments
    if (door.frameColor) {
      lines.push(createCommentCommand('door', doorId, 'frameColor', door.frameColor));
    }
    if (door.doorColor) {
      lines.push(createCommentCommand('door', doorId, 'doorColor', door.doorColor));
    }

    return lines;
  }

  /**
   * Convert a single window to SceneScript commands
   */
  private convertWindow(
    window: Window,
    windowId: number,
    wallId: number,
    wallCoords: WallCoordinates
  ): string[] {
    const lines: string[] = [];
    
    // Calculate position
    const position = this.calculateOpeningPosition(window, wallCoords);
    const dimensions = convertOpeningDimensions(window.width, window.z_height);
    const width = dimensions.width;
    const height = dimensions.height;

    // Generate make_window command
    lines.push(`make_window, id=${windowId}, wall0_id=${wallId}, wall1_id=-1, position_x=${position.x.toFixed(6)}, position_y=${position.y.toFixed(6)}, position_z=${position.z.toFixed(6)}, width=${width.toFixed(6)}, height=${height.toFixed(6)}`);

    // Generate set_asset command
    const assetResult = createSetAssetCommand(windowId, window.refid, 'window');
    if (assetResult.warnings.length > 0) {
      // Warnings are already collected by the extension command utilities
    }
    if (assetResult.command) {
      lines.push(assetResult.command);
    }

    // Handle unsupported properties as comments
    if (window.frameColor) {
      lines.push(createCommentCommand('window', windowId, 'frameColor', window.frameColor));
    }

    return lines;
  }

  /**
   * Convert all openings in a wall
   */
  public convertOpenings(
    wall: Wall,
    wallId: number,
    wallCoords: WallCoordinates,
    idManager: IdManager
  ): OpeningConversionResult {
    const sceneLines: string[] = [];

    // Check if wall has openings
    if (!wall.openings || wall.openings.length === 0) {
      return {
        sceneLines,
        nextDoorId: idManager.getRanges().doors.current,
        nextWindowId: idManager.getRanges().windows.current,
        warnings: this.warningCollector.getWarningMessages()
      };
    }

    // Process each opening
    wall.openings.forEach((opening, index) => {
      try {
        // Type guard to check if opening is a Door
        if ('type' in opening && opening.type === 'door') {
          const door = opening as Door;
          const doorId = idManager.getNextDoorId();
          const doorLines = this.convertDoor(door, doorId, wallId, wallCoords);
          sceneLines.push(...doorLines);
        } else if ('type' in opening && opening.type === 'window') {
          const window = opening as Window;
          const windowId = idManager.getNextWindowId();
          const windowLines = this.convertWindow(window, windowId, wallId, wallCoords);
          sceneLines.push(...windowLines);
        } else {
          // Unknown opening type
          this.warningCollector.addUnsupportedFeature('opening', 'type', ('type' in opening) ? (opening as any).type : 'undefined', index);
        }
      } catch (error) {
        this.warningCollector.addValidationError('opening', 'conversion', null, index + 1, `Failed to convert opening: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    return {
      sceneLines,
      nextDoorId: idManager.getRanges().doors.current,
      nextWindowId: idManager.getRanges().windows.current,
      warnings: this.warningCollector.getWarningMessages()
    };
  }

  /**
   * Get conversion statistics
   */
  public getStats(openings: GenericOpening[]): {
    totalOpenings: number;
    doors: number;
    windows: number;
    unknownTypes: number;
  } {
    let doors = 0;
    let windows = 0;
    let unknownTypes = 0;

    openings.forEach(opening => {
      if ('type' in opening && opening.type === 'door') {
        doors++;
      } else if ('type' in opening && opening.type === 'window') {
        windows++;
      } else {
        unknownTypes++;
      }
    });

    return {
      totalOpenings: openings.length,
      doors,
      windows,
      unknownTypes
    };
  }
} 