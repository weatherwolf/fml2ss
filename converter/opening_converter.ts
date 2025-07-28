import { Wall, Door, Window, GenericOpening } from '../fml_classes';
import { cmToMeters, convertOpeningDimensions } from '../utils/unit_converter';
import { IdManager } from '../utils/id_manager';
import { createSwingMetaData, createAssetMetaData } from '../utils/extension_commands';
import { MetaDataCollector } from '../utils/meta_data_collector';
import { BaseConverter } from './base_converter';

export interface OpeningConversionResult {
  sceneLines: string[];
  metaData: any;
  nextDoorId: number;
  nextWindowId: number;
  warnings: string[];
}

export interface WallCoordinates {
  ax: number; ay: number; az: number;
  bx: number; by: number; bz: number;
}

export class OpeningConverter extends BaseConverter {



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

    // Note: Swing and asset data are now collected in meta.json, not generated as commands
    // Note: Extra information (frame colors, door colors) is now collected in meta.json, not as comments

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

    // Note: Asset data is now collected in meta.json, not generated as commands
    // Note: Extra information (frame colors) is now collected in meta.json, not as comments

    return lines;
  }

  /**
   * Collect door meta data (swing, assets, colors, etc.)
   */
  private collectDoorMetaData(door: Door, doorId: number, metaDataCollector: MetaDataCollector): void {
    const metaData: any = {};
    
    // Collect swing information
    if (door.mirrored) {
      metaData.swing = {
        style: door.mirrored[0] === 0 ? 'left' : 'right',
        inward: door.mirrored[1] === 0
      };
    }
    
    // Collect asset reference
    if (door.refid) {
      metaData.asset = door.refid;
    }
    
    // Collect colors
    if (door.frameColor) {
      metaData.frame_color = door.frameColor;
    }
    if (door.doorColor) {
      metaData.door_color = door.doorColor;
    }
    
    // Only add meta data if there's actual data to preserve
    this.addMetaDataIfNotEmpty(metaData, doorId.toString(), 'door', metaDataCollector);
  }

  /**
   * Collect window meta data (assets, colors, etc.)
   */
  private collectWindowMetaData(window: Window, windowId: number, metaDataCollector: MetaDataCollector): void {
    const metaData: any = {};
    
    // Collect asset reference
    if (window.refid) {
      metaData.asset = window.refid;
    }
    
    // Collect colors
    if (window.frameColor) {
      metaData.frame_color = window.frameColor;
    }
    
    // Only add meta data if there's actual data to preserve
    this.addMetaDataIfNotEmpty(metaData, windowId.toString(), 'window', metaDataCollector);
  }

  /**
   * Convert all openings in a wall
   */
  public convertOpenings(
    wall: Wall,
    wallId: number,
    wallCoords: WallCoordinates,
    idManager: IdManager,
    metaDataCollector: MetaDataCollector
  ): OpeningConversionResult {
    const sceneLines: string[] = [];

    // Check if wall has openings
    if (!wall.openings || wall.openings.length === 0) {
      return this.createEmptyResult<OpeningConversionResult>(metaDataCollector, {
        nextDoorId: idManager.getRanges().doors.current,
        nextWindowId: idManager.getRanges().windows.current
      });
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
          this.collectDoorMetaData(door, doorId, metaDataCollector);
        } else if ('type' in opening && opening.type === 'window') {
          const window = opening as Window;
          const windowId = idManager.getNextWindowId();
          const windowLines = this.convertWindow(window, windowId, wallId, wallCoords);
          sceneLines.push(...windowLines);
          this.collectWindowMetaData(window, windowId, metaDataCollector);
        } else {
          // Unknown opening type
          this.warningCollector.addUnsupportedFeature('opening', 'type', ('type' in opening) ? (opening as any).type : 'undefined', index);
        }
      } catch (error) {
        this.handleConversionError('opening', index, error);
      }
    });

    return this.createConversionResult<OpeningConversionResult>(sceneLines, metaDataCollector, {
      nextDoorId: idManager.getRanges().doors.current,
      nextWindowId: idManager.getRanges().windows.current
    });
  }

} 