import { Label } from '../fml_classes';
import { convertPoint2D } from '../utils/unit_converter';
import { IdManager } from '../utils/id_manager';
import { WarningCollector } from '../utils/warning_collector';

export interface LabelConversionResult {
  sceneLines: string[];
  warnings: string[];
}

export class LabelConverter {
  private warningCollector: WarningCollector;

  constructor(warningCollector: WarningCollector) {
    this.warningCollector = warningCollector;
  }



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
  public convertLabels(labels: Label[], idManager: IdManager): LabelConversionResult {
    const sceneLines: string[] = [];

    // Check if there are labels to convert
    if (!labels || labels.length === 0) {
      return {
        sceneLines,
        warnings: this.warningCollector.getWarningMessages()
      };
    }

    // Add section header
    sceneLines.push('# ---- Labels ----');

    // Process each label
    labels.forEach((label, index) => {
      try {
        const labelComment = this.convertLabel(label);
        sceneLines.push(labelComment);
      } catch (error) {
        this.warningCollector.addValidationError('label', 'conversion', null, index + 1, `Failed to convert label: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });

    return {
      sceneLines,
      warnings: this.warningCollector.getWarningMessages()
    };
  }

  /**
   * Get conversion statistics
   */
  public getStats(labels: Label[]): {
    totalLabels: number;
    labelsWithRotation: number;
    labelsWithCustomFont: number;
    labelsWithCustomColor: number;
    labelsWithBackground: number;
    averageTextLength: number;
  } {
    let labelsWithRotation = 0;
    let labelsWithCustomFont = 0;
    let labelsWithCustomColor = 0;
    let labelsWithBackground = 0;
    let totalTextLength = 0;

    labels.forEach(label => {
      if (label.rotation && label.rotation !== 0) {
        labelsWithRotation++;
      }
      if (label.fontFamily && label.fontFamily !== 'arial') {
        labelsWithCustomFont++;
      }
      if (label.fontColor && label.fontColor !== '#000000') {
        labelsWithCustomColor++;
      }
      if (label.backgroundColor && label.backgroundColor !== '#f4f8f4') {
        labelsWithBackground++;
      }
      totalTextLength += label.text ? label.text.length : 0;
    });

    return {
      totalLabels: labels.length,
      labelsWithRotation,
      labelsWithCustomFont,
      labelsWithCustomColor,
      labelsWithBackground,
      averageTextLength: labels.length > 0 ? totalTextLength / labels.length : 0
    };
  }
} 