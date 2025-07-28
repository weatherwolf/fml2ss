import { Wall, Point, Endpoint3D } from '../fml_classes';
import { OpeningConverter } from './opening_converter';
import { cmToMeters, convertPoint2D, convertWallThickness, convertWallHeight, calculateDistance2DCm } from '../utils/unit_converter';
import { IdManager } from '../utils/id_manager';
import { createSetMaterialCommand, createCommentCommand } from '../utils/extension_commands';
import { WarningCollector } from '../utils/warning_collector';

export interface WallConversionResult {
  sceneLines: string[];
  nextId: number;
  warnings: string[];
}

export class WallConverter {
  private warningCollector: WarningCollector;

  constructor(warningCollector: WarningCollector) {
    this.warningCollector = warningCollector;
  }

  /**
   * Convert a 2D point from cm to meters
   */
  private convertPoint(point: Point): { x: number; y: number } {
    return convertPoint2D(point);
  }

  /**
   * Convert wall endpoints and elevation data
   */
  private convertWallEndpoints(wall: Wall): {
    ax: number; ay: number; az: number;
    bx: number; by: number; bz: number;
    height: number;
  } {
    // Convert 2D endpoints
    const a = this.convertPoint(wall.a);
    const b = this.convertPoint(wall.b);

    // Convert elevation data
    const az = cmToMeters(wall.az.z); // base elevation at endpoint A
    const bz = cmToMeters(wall.bz.z); // base elevation at endpoint B

    // Calculate wall height
    const heightA = convertWallHeight(wall.az.h); // total height at endpoint A
    const heightB = convertWallHeight(wall.bz.h); // total height at endpoint B

    // Use the maximum height if they differ (sloped wall)
    const height = Math.max(heightA, heightB);

    // Log warning if wall height is not uniform
    if (Math.abs(heightA - heightB) > 0.01) { // 1cm tolerance
      this.warningCollector.addInformationLoss('wall', 'height', { heightA, heightB }, undefined, `Non-uniform height: A=${heightA.toFixed(2)}m, B=${heightB.toFixed(2)}m, using max=${height.toFixed(2)}m`);
    }

    return {
      ax: a.x,
      ay: a.y,
      az: az,
      bx: b.x,
      by: b.y,
      bz: bz,
      height: height
    };
  }

  /**
   * Convert wall decorations to SceneScript set_material commands
   */
  private convertWallDecorations(wall: Wall, wallId: number): string[] {
    const materialLines: string[] = [];
    
    if (!wall.decor) {
      return materialLines;
    }

    // Process left side decoration
    if (wall.decor.left) {
      const leftMaterial = this.convertWallSideDecoration(wall.decor.left, wallId, 'left');
      if (leftMaterial) {
        materialLines.push(leftMaterial);
      }
    }

    // Process right side decoration
    if (wall.decor.right) {
      const rightMaterial = this.convertWallSideDecoration(wall.decor.right, wallId, 'right');
      if (rightMaterial) {
        materialLines.push(rightMaterial);
      }
    }

    return materialLines;
  }

  /**
   * Convert a single wall side decoration to SceneScript set_material command
   */
  private convertWallSideDecoration(sideDecor: any, wallId: number, side: 'left' | 'right'): string | null {
    if (!sideDecor) {
      return null;
    }

    // Check for color decoration
    if ('color' in sideDecor && sideDecor.color) {
      const result = createSetMaterialCommand(wallId, side, 'color', sideDecor.color);
      if (result.warnings.length > 0) {
        // Warnings are already collected by the extension command utilities
      }
      return result.command;
    }

    // Check for material asset decoration
    if ('refid' in sideDecor && sideDecor.refid) {
      const result = createSetMaterialCommand(wallId, side, 'asset', sideDecor.refid);
      if (result.warnings.length > 0) {
        // Warnings are already collected by the extension command utilities
      }
      return result.command;
    }

    // Check for texture decoration
    if ('texture' in sideDecor && sideDecor.texture) {
      const texture = sideDecor.texture;
      const additionalParams: Record<string, string | number> = {
        src: texture.src,
        fit: texture.fit
      };
      
      // Add texture coordinates if they exist and are not default
      if (texture.tlx !== undefined && texture.tly !== undefined && 
          texture.brx !== undefined && texture.bry !== undefined) {
        additionalParams.tlx = texture.tlx;
        additionalParams.tly = texture.tly;
        additionalParams.brx = texture.brx;
        additionalParams.bry = texture.bry;
      }
      
      const result = createSetMaterialCommand(wallId, side, 'texture', texture.src, additionalParams);
      if (result.warnings.length > 0) {
        // Warnings are already collected by the extension command utilities
      }
      return result.command;
    }

    return null;
  }

  /**
   * Convert a single wall to SceneScript command(s)
   */
  private convertWall(wall: Wall, wallId: number, openingConverter: OpeningConverter, idManager: IdManager): string {
    const coords = this.convertWallEndpoints(wall);
    const thickness = convertWallThickness(wall.thickness);
    let output = '';

    // Check if this is a curved wall (has control point)
    if (wall.c) {
      // Curved wall
      const c = this.convertPoint(wall.c);
      // Use the same z-coordinate as the wall base for control point
      const cz = coords.az;

      output = `make_curved_wall, id=${wallId}, a_x=${coords.ax.toFixed(6)}, a_y=${coords.ay.toFixed(6)}, a_z=${coords.az.toFixed(6)}, b_x=${coords.bx.toFixed(6)}, b_y=${coords.by.toFixed(6)}, b_z=${coords.bz.toFixed(6)}, c_x=${c.x.toFixed(6)}, c_y=${c.y.toFixed(6)}, c_z=${cz.toFixed(6)}, thickness=${thickness.toFixed(6)}, height=${coords.height.toFixed(6)}`;
    } else {
      // Straight wall
      output = `make_wall, id=${wallId}, a_x=${coords.ax.toFixed(6)}, a_y=${coords.ay.toFixed(6)}, a_z=${coords.az.toFixed(6)}, b_x=${coords.bx.toFixed(6)}, b_y=${coords.by.toFixed(6)}, b_z=${coords.bz.toFixed(6)}, height=${coords.height.toFixed(6)}, thickness=${thickness.toFixed(6)}`;
    }
    
    // Convert wall decorations/materials
    const materialLines = this.convertWallDecorations(wall, wallId);
    if (materialLines.length > 0) {
      output += `\n${materialLines.join('\n')}`;
    }
    
    const openingResult = openingConverter.convertOpenings(wall, wallId, {
    ax: coords.ax,
    ay: coords.ay,
    az: coords.az,
    bx: coords.bx,
    by: coords.by,
    bz: coords.bz
    }, idManager);
    output += `\n${openingResult.sceneLines.join('\n')}`;

    return output;
  }

  /**
   * Convert all walls in a design
   */
  public convertWalls(walls: Wall[], idManager: IdManager, openingConverter: OpeningConverter): WallConversionResult {
    const sceneLines: string[] = [];

    // Add section header
    sceneLines.push('# ---- Walls + Openings ----');

    walls.forEach((wall, wallIndex) => {
      try {
        // Generate new wall ID (walls don't have IDs in FML)
        const wallId = idManager.getNextWallId();
        const wallCommand = this.convertWall(wall, wallId, openingConverter, idManager);
        sceneLines.push(wallCommand);
      } catch (error) {
        this.warningCollector.addValidationError('wall', 'conversion', null, wallIndex + 1, `Failed to convert wall: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    // Return the current ID ranges for other converters
    const ranges = idManager.getRanges();
    return {
      sceneLines,
      nextId: ranges.items.current, // Pass the next item ID
      warnings: this.warningCollector.getWarningMessages()
    };
  }

  /**
   * Get conversion statistics
   */
  public getStats(walls: Wall[]): {
    totalWalls: number;
    straightWalls: number;
    curvedWalls: number;
    totalLength: number; // in meters
  } {
    let straightWalls = 0;
    let curvedWalls = 0;
    let totalLength = 0;

    walls.forEach(wall => {
      if (wall.c) {
        curvedWalls++;
      } else {
        straightWalls++;
      }

      // Calculate wall length (straight line distance)
      totalLength += calculateDistance2DCm(wall.a, wall.b);
    });

    return {
      totalWalls: walls.length,
      straightWalls,
      curvedWalls,
      totalLength
    };
  }
} 