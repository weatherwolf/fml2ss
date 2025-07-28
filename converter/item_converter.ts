import { Item } from '../fml_classes';
import { cmToMeters, convertPoint3D, convertItemDimensions, calculateHalfExtents, degreesToRadians } from '../utils/unit_converter';
import { IdManager } from '../utils/id_manager';
import { createSetAssetCommand, createCommentCommand } from '../utils/extension_commands';
import { WarningCollector } from '../utils/warning_collector';

export interface ItemConversionResult {
  sceneLines: string[];
  nextItemId: number;
  warnings: string[];
}

export class ItemConverter {
  private warningCollector: WarningCollector;

  constructor(warningCollector: WarningCollector) {
    this.warningCollector = warningCollector;
  }



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

    // Generate set_asset command
    const assetResult = createSetAssetCommand(itemId, item.refid, 'item');
    if (assetResult.warnings.length > 0) {
      // Warnings are already collected by the extension command utilities
    }
    if (assetResult.command) {
      lines.push(assetResult.command);
    }

    // Handle unsupported properties as comments
    if (item.mirrored) {
      lines.push(createCommentCommand('item', itemId, 'mirrored', item.mirrored));
      this.warningCollector.addInformationLoss('item', 'mirrored', item.mirrored, itemId, 'Mirroring not explicitly represented in SceneScript');
    }

    if (item.light) {
      lines.push(createCommentCommand('item', itemId, 'light', item.light));
    }

    if (item.materials) {
      lines.push(createCommentCommand('item', itemId, 'materials', item.materials));
      this.warningCollector.addInformationLoss('item', 'materials', item.materials, itemId, 'Custom materials variants not preserved in SceneScript');
    }

    return lines;
  }

  /**
   * Convert all items in a design
   */
  public convertItems(
    items: Item[],
    idManager: IdManager
  ): ItemConversionResult {
    const sceneLines: string[] = [];

    // Check if there are items to convert
    if (!items || items.length === 0) {
      return {
        sceneLines,
        nextItemId: idManager.getRanges().items.current,
        warnings: this.warningCollector.getWarningMessages()
      };
    }

    // Add section header
    sceneLines.push('# ---- Items ----');

    // Process each item
    items.forEach((item, index) => {
      try {
        // Generate new item ID (items don't have IDs in FML)
        const itemId = idManager.getNextItemId();
        const itemLines = this.convertItem(item, itemId);
        sceneLines.push(...itemLines);
      } catch (error) {
        this.warningCollector.addValidationError('item', 'conversion', null, index + 1, `Failed to convert item: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    return {
      sceneLines,
      nextItemId: idManager.getRanges().items.current,
      warnings: this.warningCollector.getWarningMessages()
    };
  }

  /**
   * Get conversion statistics
   */
  public getStats(items: Item[]): {
    totalItems: number;
    itemsWithLights: number;
    itemsWithMaterials: number;
    itemsWithMirroring: number;
    totalVolume: number; // in cubic meters
  } {
    let itemsWithLights = 0;
    let itemsWithMaterials = 0;
    let itemsWithMirroring = 0;
    let totalVolume = 0;

    items.forEach(item => {
      if (item.light) itemsWithLights++;
      if (item.materials) itemsWithMaterials++;
      if (item.mirrored) itemsWithMirroring++;

      // Calculate volume in cubic meters
      const dimensions = convertItemDimensions(item);
      const volume = dimensions.width * dimensions.height * dimensions.z_height;
      totalVolume += volume;
    });

    return {
      totalItems: items.length,
      itemsWithLights,
      itemsWithMaterials,
      itemsWithMirroring,
      totalVolume
    };
  }
} 