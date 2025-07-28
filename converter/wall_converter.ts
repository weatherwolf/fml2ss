import { Wall, Point, Endpoint3D } from '../fml_classes';
import { OpeningConverter } from './opening_converter';
import { cmToMeters, convertPoint2D, convertWallThickness, convertWallHeight, calculateDistance2DCm } from '../utils/unit_converter';
import { IdManager } from '../utils/id_manager';
import { createMaterialMetaData } from '../utils/extension_commands';
import { MetaDataCollector } from '../utils/meta_data_collector';
import { BaseConverter } from './base_converter';

export interface WallConversionResult {
  sceneLines: string[];
  metaData: any;
  nextId: number;
  warnings: string[];
}

export class WallConverter extends BaseConverter {

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
   * Collect wall decoration meta data (no longer generates commands)
   */
  private collectWallDecorationMetaData(wall: Wall, wallId: number, metaDataCollector: MetaDataCollector): void {
    if (!wall.decor) {
      return;
    }

    // Process left side decoration
    if (wall.decor.left) {
      this.collectWallSideDecorationMetaData(wall.decor.left, wallId, 'left', metaDataCollector);
    }

    // Process right side decoration
    if (wall.decor.right) {
      this.collectWallSideDecorationMetaData(wall.decor.right, wallId, 'right', metaDataCollector);
    }
  }

  /**
   * Collect wall side decoration meta data (no longer generates commands)
   */
  private collectWallSideDecorationMetaData(sideDecor: any, wallId: number, side: 'left' | 'right', metaDataCollector: MetaDataCollector): void {
    if (!sideDecor) {
      return;
    }

    // Check for color decoration
    if ('color' in sideDecor && sideDecor.color) {
      const result = createMaterialMetaData(wallId, side, 'color', sideDecor.color);
      if (result.metaData) {
        // Add to wall meta data
        const wallMetaData = metaDataCollector.getElementMetaData(wallId.toString()) || {};
        if (!wallMetaData.decorations) {
          wallMetaData.decorations = {};
        }
        wallMetaData.decorations[side] = result.metaData;
        metaDataCollector.addMetaData(wallId.toString(), 'wall', wallMetaData);
      }
    }

    // Check for material asset decoration
    if ('refid' in sideDecor && sideDecor.refid) {
      const result = createMaterialMetaData(wallId, side, 'asset', sideDecor.refid);
      if (result.metaData) {
        // Add to wall meta data
        const wallMetaData = metaDataCollector.getElementMetaData(wallId.toString()) || {};
        if (!wallMetaData.decorations) {
          wallMetaData.decorations = {};
        }
        wallMetaData.decorations[side] = result.metaData;
        metaDataCollector.addMetaData(wallId.toString(), 'wall', wallMetaData);
      }
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
      
      const result = createMaterialMetaData(wallId, side, 'texture', texture.src, additionalParams);
      if (result.metaData) {
        // Add to wall meta data
        const wallMetaData = metaDataCollector.getElementMetaData(wallId.toString()) || {};
        if (!wallMetaData.decorations) {
          wallMetaData.decorations = {};
        }
        wallMetaData.decorations[side] = result.metaData;
        metaDataCollector.addMetaData(wallId.toString(), 'wall', wallMetaData);
      }
    }
  }

  /**
   * Convert a single wall to SceneScript command(s)
   */
  private convertWall(wall: Wall, wallId: number, openingConverter: OpeningConverter, idManager: IdManager, metaDataCollector: MetaDataCollector): string {
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
    
    // Collect wall decoration meta data (no longer generates commands)
    this.collectWallDecorationMetaData(wall, wallId, metaDataCollector);
    
    const openingResult = openingConverter.convertOpenings(wall, wallId, {
    ax: coords.ax,
    ay: coords.ay,
    az: coords.az,
    bx: coords.bx,
    by: coords.by,
    bz: coords.bz
    }, idManager, metaDataCollector);
    
    // Only add openings if there are any
    if (openingResult.sceneLines.length > 0) {
      output += `${openingResult.sceneLines.join('\n')}`;
    }

    return output;
  }

  /**
   * Convert all walls in a design
   */
  public convertWalls(walls: Wall[], idManager: IdManager, openingConverter: OpeningConverter, metaDataCollector: MetaDataCollector): WallConversionResult {
    const sceneLines: string[] = [];

    walls.forEach((wall, wallIndex) => {
      try {
        // Generate new wall ID (walls don't have IDs in FML)
        const wallId = idManager.getNextWallId();
        const wallCommand = this.convertWall(wall, wallId, openingConverter, idManager, metaDataCollector);
        if (wallCommand.length > 0) {
          sceneLines.push(wallCommand);
        }
        
        // Collect wall meta data (decorations, materials, etc.)
        this.collectWallMetaData(wall, wallId, metaDataCollector);
      } catch (error) {
        this.handleConversionError('wall', wallIndex, error);
      }
    });

    // Return the current ID ranges for other converters
    return this.createConversionResult<WallConversionResult>(sceneLines, metaDataCollector, {
      nextId: idManager.getRanges().items.current // Pass the next item ID
    });
  }

  /**
   * Collect wall meta data (decorations, materials, etc.)
   */
  private collectWallMetaData(wall: Wall, wallId: number, metaDataCollector: MetaDataCollector): void {
    const metaData: any = {};
    
    // Collect wall decorations
    if (wall.decor) {
      metaData.decorations = {};
      if (wall.decor.left) {
        metaData.decorations.left = wall.decor.left;
      }
      if (wall.decor.right) {
        metaData.decorations.right = wall.decor.right;
      }
    }
    
    // Collect wall thickness
    metaData.thickness = wall.thickness;
    
    // Collect height variations if walls have different heights
    if (wall.az.h !== wall.bz.h) {
      metaData.height_variation = {
        start: wall.az.h,
        end: wall.bz.h
      };
    }
    
    // Only add meta data if there's actual data to preserve
    this.addMetaDataIfNotEmpty(metaData, wallId.toString(), 'wall', metaDataCollector);
  }

} 