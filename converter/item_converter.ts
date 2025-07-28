import { Item } from '../fml_classes';
import { cmToMeters, convertPoint3D, convertItemDimensions, calculateHalfExtents, degreesToRadians } from '../utils/unit_converter';
import { IdManager } from '../utils/id_manager';
import { createAssetMetaData } from '../utils/extension_commands';
import { MetaDataCollector } from '../utils/meta_data_collector';
import { BaseConverter } from './base_converter';

export interface ItemConversionResult {
  sceneLines: string[];
  metaData: any;
  nextItemId: number;
  warnings: string[];
}

export class ItemConverter extends BaseConverter {



  /**
   * Convert degrees to radians
   */
  private degreesToRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Calculate half-extents from full dimensions
   */
  private calculateHalfExtents(item: Item): { x: number; y: number; z: number } {
    const halfExtents = calculateHalfExtents(item.width, item.height, item.z_height);
    return { x: halfExtents.halfX, y: halfExtents.halfY, z: halfExtents.halfZ };
  }

  /**
   * Convert a single item to SceneScript commands
   */
  private convertItem(
    item: Item,
    itemId: number,
    classId: number = 0
  ): string[] {
    const lines: string[] = [];
    
    // Convert position and dimensions
    const position = convertPoint3D(item);
    const positionX = position.x;
    const positionY = position.y;
    const positionZ = position.z;
    const angleZ = degreesToRadians(item.rotation);
    const halfExtents = this.calculateHalfExtents(item);

    // Generate make_bbox command
    lines.push(`make_bbox, id=${itemId}, class_id=${classId}, position_x=${positionX.toFixed(6)}, position_y=${positionY.toFixed(6)}, position_z=${positionZ.toFixed(6)}, angle_z=${angleZ.toFixed(6)}, scale_x=${halfExtents.x.toFixed(6)}, scale_y=${halfExtents.y.toFixed(6)}, scale_z=${halfExtents.z.toFixed(6)}`);

    // Note: Asset data is now collected in meta.json, not generated as commands

    // Note: Extra information (mirroring, lights, materials) is now collected in meta.json, not as comments

    return lines;
  }

  /**
   * Collect item meta data (assets, mirroring, materials, lighting, etc.)
   */
  private collectItemMetaData(item: Item, itemId: number, metaDataCollector: MetaDataCollector): void {
    const metaData: any = {};
    
    // Collect asset reference
    if (item.refid) {
      metaData.asset = item.refid;
    }
    
    // Collect mirroring information
    if (item.mirrored) {
      metaData.mirrored = item.mirrored;
    }
    
    // Collect lighting information
    if (item.light) {
      metaData.lighting = item.light;
    }
    
    // Collect materials information
    if (item.materials) {
      metaData.materials = item.materials;
    }
    
    // Only add meta data if there's actual data to preserve
    this.addMetaDataIfNotEmpty(metaData, itemId.toString(), 'item', metaDataCollector);
  }

  /**
   * Convert all items in a design
   */
  public convertItems(
    items: Item[],
    idManager: IdManager,
    metaDataCollector: MetaDataCollector
  ): ItemConversionResult {
    const sceneLines: string[] = [];

    // Check if there are items to convert
    if (!items || items.length === 0) {
      return this.createEmptyResult<ItemConversionResult>(metaDataCollector, {
        nextItemId: idManager.getRanges().items.current
      });
    }
    // Process each item
    items.forEach((item, index) => {
      try {
        // Generate new item ID (items don't have IDs in FML)
        const itemId = idManager.getNextItemId();
        const itemLines = this.convertItem(item, itemId);
        sceneLines.push(...itemLines);
        this.collectItemMetaData(item, itemId, metaDataCollector);
      } catch (error) {
        this.handleConversionError('item', index, error);
      }
    });

    return this.createConversionResult<ItemConversionResult>(sceneLines, metaDataCollector, {
      nextItemId: idManager.getRanges().items.current
    });
  }

} 