import { WarningCollector } from '../utils/warning_collector';
import { MetaDataCollector } from '../utils/meta_data_collector';

/**
 * Base converter class that provides common functionality for all converters
 * Reduces code duplication and provides consistent patterns across converters
 */
export abstract class BaseConverter {
  protected warningCollector: WarningCollector;

  constructor(warningCollector: WarningCollector) {
    this.warningCollector = warningCollector;
  }

  /**
   * Handle conversion errors consistently across all converters
   */
  protected handleConversionError(elementType: string, index: number, error: any): void {
    this.warningCollector.addValidationError(
      elementType, 
      'conversion', 
      null, 
      index + 1, 
      `Failed to convert ${elementType}: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  /**
   * Add meta data to collector only if it contains data
   */
  protected addMetaDataIfNotEmpty(
    metaData: any, 
    elementId: string, 
    elementType: 'wall' | 'door' | 'window' | 'item' | 'label', 
    metaDataCollector: MetaDataCollector
  ): void {
    if (Object.keys(metaData).length > 0) {
      metaDataCollector.addMetaData(elementId, elementType, metaData);
    }
  }

  /**
   * Create a standard conversion result object
   */
  protected createConversionResult<T>(
    sceneLines: string[],
    metaDataCollector: MetaDataCollector,
    additionalProps: Partial<T> = {}
  ): T {
    return {
      sceneLines,
      metaData: metaDataCollector.getMetaData(),
      warnings: this.warningCollector.getWarningMessages(),
      ...additionalProps
    } as T;
  }

  /**
   * Process elements with consistent error handling
   */
  protected processElements<T, R>(
    elements: T[],
    processor: (element: T, index: number) => R[],
    elementType: string
  ): R[] {
    const results: R[] = [];

    elements.forEach((element, index) => {
      try {
        const elementResults = processor(element, index);
        results.push(...elementResults);
      } catch (error) {
        this.handleConversionError(elementType, index, error);
      }
    });

    return results;
  }

  /**
   * Check if array is empty and return early result
   */
  protected createEmptyResult<T extends { sceneLines: string[]; metaData: any; warnings: string[] }>(
    metaDataCollector: MetaDataCollector,
    additionalProps: Partial<T> = {}
  ): T {
    return this.createConversionResult([], metaDataCollector, additionalProps);
  }
} 