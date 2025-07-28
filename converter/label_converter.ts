import { Label } from '../fml_classes';
import { convertPoint2D } from '../utils/unit_converter';
import { IdManager } from '../utils/id_manager';
import { MetaDataCollector } from '../utils/meta_data_collector';
import { BaseConverter } from './base_converter';

export interface LabelConversionResult {
  sceneLines: string[];
  metaData: any;
  warnings: string[];
}

export class LabelConverter extends BaseConverter {



  /**
   * Convert a single label to SceneScript comment
   */
  private convertLabel(label: Label): string {
    // Convert position to meters
    const position = convertPoint2D(label);
    const positionX = position.x;
    const positionY = position.y;

    // Start with basic label information
    let comment = `# LABEL "${label.text}" at (${positionX.toFixed(2)}, ${positionY.toFixed(2)})`;

    // Add rotation if present and not zero
    if (label.rotation && label.rotation !== 0) {
      comment += ` rotation=${label.rotation}deg`;
    }

    // Add font information if different from defaults
    const hasCustomFont = label.fontFamily && label.fontFamily !== 'arial';
    const hasCustomSize = label.fontSize && label.fontSize !== 20;
    const hasCustomColor = label.fontColor && label.fontColor !== '#000000';
    const hasBackground = label.backgroundColor && label.backgroundColor !== '#f4f8f4';
    const hasCustomAlign = label.align && label.align !== 'left';
    const hasLetterSpacing = label.letterSpacing && label.letterSpacing !== 0;

    if (hasCustomFont || hasCustomSize || hasCustomColor || hasBackground || hasCustomAlign || hasLetterSpacing) {
      comment += ` | style:`;
      
      if (hasCustomFont) {
        comment += ` font=${label.fontFamily}`;
      }
      if (hasCustomSize) {
        comment += ` size=${label.fontSize}`;
      }
      if (hasCustomColor) {
        comment += ` color=${label.fontColor}`;
      }
      if (hasBackground) {
        comment += ` bg=${label.backgroundColor}`;
      }
      if (hasCustomAlign) {
        comment += ` align=${label.align}`;
      }
      if (hasLetterSpacing) {
        comment += ` spacing=${label.letterSpacing}`;
      }
    }

    return comment;
  }

  /**
   * Convert all labels in a design
   */
  public convertLabels(labels: Label[], idManager: IdManager, metaDataCollector: MetaDataCollector): LabelConversionResult {
    const sceneLines: string[] = [];

    // Check if there are labels to convert
    if (!labels || labels.length === 0) {
      return this.createEmptyResult<LabelConversionResult>(metaDataCollector);
    }

    // Process each label
    labels.forEach((label, index) => {
      try {
        const labelComment = this.convertLabel(label);
        sceneLines.push(labelComment);
      } catch (error) {
        this.handleConversionError('label', index, error);
      }
    });

    return this.createConversionResult<LabelConversionResult>(sceneLines, metaDataCollector);
  }

} 