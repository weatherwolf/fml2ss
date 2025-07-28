/**
 * Warning Collection System for FML to SceneScript Conversion
 * 
 * Focuses on tracking information loss for round-trip fidelity
 * Essential for MVP to ensure no critical data is lost during conversion
 */

export interface WarningInfo {
  type: 'information_loss' | 'unsupported_feature' | 'validation_error';
  element: string; // 'wall', 'door', 'window', 'item', 'label'
  elementId?: number;
  property: string;
  originalValue: any;
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export interface WarningCollection {
  warnings: WarningInfo[];
  summary: {
    totalWarnings: number;
    informationLossCount: number;
    unsupportedFeatureCount: number;
    validationErrorCount: number;
    byElement: Record<string, number>;
    bySeverity: Record<string, number>;
  };
}

export class WarningCollector {
  private warnings: WarningInfo[] = [];

  /**
   * Add a warning about information loss
   */
  public addInformationLoss(
    element: string,
    property: string,
    originalValue: any,
    elementId?: number,
    additionalContext?: string
  ): void {
    const message = `Information loss: ${property} value "${JSON.stringify(originalValue)}" not preserved in SceneScript${additionalContext ? ` (${additionalContext})` : ''}`;
    
    this.warnings.push({
      type: 'information_loss',
      element,
      elementId,
      property,
      originalValue,
      message,
      severity: 'medium'
    });
  }

  /**
   * Add a warning about unsupported features
   */
  public addUnsupportedFeature(
    element: string,
    feature: string,
    originalValue: any,
    elementId?: number
  ): void {
    this.warnings.push({
      type: 'unsupported_feature',
      element,
      elementId,
      property: feature,
      originalValue,
      message: `Unsupported feature: ${feature} not supported in SceneScript`,
      severity: 'low'
    });
  }

  /**
   * Add a warning about validation errors
   */
  public addValidationError(
    element: string,
    property: string,
    originalValue: any,
    elementId?: number,
    errorDetails?: string
  ): void {
    const message = `Validation error: ${property} value "${JSON.stringify(originalValue)}" is invalid${errorDetails ? ` (${errorDetails})` : ''}`;
    
    this.warnings.push({
      type: 'validation_error',
      element,
      elementId,
      property,
      originalValue,
      message,
      severity: 'high'
    });
  }

  /**
   * Add a warning about missing required data
   */
  public addMissingData(
    element: string,
    property: string,
    elementId?: number
  ): void {
    this.warnings.push({
      type: 'validation_error',
      element,
      elementId,
      property,
      originalValue: null,
      message: `Missing required data: ${property} not found`,
      severity: 'high'
    });
  }

  /**
   * Add a warning about ID conflicts or issues
   */
  public addIdWarning(
    element: string,
    originalId: any,
    generatedId: number,
    reason: string
  ): void {
    this.warnings.push({
      type: 'information_loss',
      element,
      elementId: generatedId,
      property: 'id',
      originalValue: originalId,
      message: `ID conflict: Original ID "${originalId}" replaced with generated ID ${generatedId} (${reason})`,
      severity: 'medium'
    });
  }

  /**
   * Add a warning about unit conversion issues
   */
  public addUnitConversionWarning(
    element: string,
    property: string,
    originalValue: number,
    convertedValue: number,
    elementId?: number
  ): void {
    this.warnings.push({
      type: 'information_loss',
      element,
      elementId,
      property,
      originalValue,
      message: `Unit conversion: ${property} ${originalValue}cm → ${convertedValue}m`,
      severity: 'low'
    });
  }

  /**
   * Add a warning about material/texture preservation issues
   */
  public addMaterialWarning(
    element: string,
    materialType: string,
    originalValue: any,
    elementId?: number,
    reason?: string
  ): void {
    const message = `Material preservation: ${materialType} "${JSON.stringify(originalValue)}" may not round-trip perfectly${reason ? ` (${reason})` : ''}`;
    
    this.warnings.push({
      type: 'information_loss',
      element,
      elementId,
      property: materialType,
      originalValue,
      message,
      severity: 'medium'
    });
  }

  /**
   * Get all warnings
   */
  public getWarnings(): WarningInfo[] {
    return [...this.warnings];
  }

  /**
   * Get warnings by type
   */
  public getWarningsByType(type: WarningInfo['type']): WarningInfo[] {
    return this.warnings.filter(w => w.type === type);
  }

  /**
   * Get warnings by element
   */
  public getWarningsByElement(element: string): WarningInfo[] {
    return this.warnings.filter(w => w.element === element);
  }

  /**
   * Get warnings by severity
   */
  public getWarningsBySeverity(severity: WarningInfo['severity']): WarningInfo[] {
    return this.warnings.filter(w => w.severity === severity);
  }

  /**
   * Get summary statistics
   */
  public getSummary(): WarningCollection['summary'] {
    const byElement: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byType: Record<string, number> = {
      information_loss: 0,
      unsupported_feature: 0,
      validation_error: 0
    };

    this.warnings.forEach(warning => {
      // Count by element
      byElement[warning.element] = (byElement[warning.element] || 0) + 1;
      
      // Count by severity
      bySeverity[warning.severity] = (bySeverity[warning.severity] || 0) + 1;
      
      // Count by type
      byType[warning.type]++;
    });

    return {
      totalWarnings: this.warnings.length,
      informationLossCount: byType.information_loss,
      unsupportedFeatureCount: byType.unsupported_feature,
      validationErrorCount: byType.validation_error,
      byElement,
      bySeverity
    };
  }

  /**
   * Check if there are any high-severity warnings
   */
  public hasHighSeverityWarnings(): boolean {
    return this.warnings.some(w => w.severity === 'high');
  }

  /**
   * Check if there are any information loss warnings
   */
  public hasInformationLoss(): boolean {
    return this.warnings.some(w => w.type === 'information_loss');
  }

  /**
   * Get a simple text summary for logging
   */
  public getTextSummary(): string {
    const summary = this.getSummary();
    
    if (summary.totalWarnings === 0) {
      return "✅ No warnings - perfect round-trip fidelity";
    }

    const parts = [
      `⚠️  ${summary.totalWarnings} total warnings:`,
      `   • ${summary.informationLossCount} information loss`,
      `   • ${summary.unsupportedFeatureCount} unsupported features`,
      `   • ${summary.validationErrorCount} validation errors`
    ];

    if (summary.bySeverity.high) {
      parts.push(`   • ${summary.bySeverity.high} high severity issues`);
    }

    return parts.join('\n');
  }

  /**
   * Clear all warnings
   */
  public clear(): void {
    this.warnings = [];
  }

  /**
   * Get warnings as simple strings for API response
   */
  public getWarningMessages(): string[] {
    return this.warnings.map(w => w.message);
  }

  /**
   * Export full warning collection for detailed analysis
   */
  public export(): WarningCollection {
    return {
      warnings: this.getWarnings(),
      summary: this.getSummary()
    };
  }
}

/**
 * Create a new warning collector instance
 */
export function createWarningCollector(): WarningCollector {
  return new WarningCollector();
} 