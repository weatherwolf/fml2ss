/**
 * Meta Data Collector for FML to SceneScript Conversion
 * 
 * Collects extra information that doesn't fit into core SceneScript commands
 * (make_wall, make_door, make_window, make_bbox)
 */

export interface MetaData {
  [elementId: string]: {
    type: 'wall' | 'door' | 'window' | 'item' | 'label';
    [key: string]: any;
  };
}

export class MetaDataCollector {
  private metaData: MetaData = {};

  /**
   * Add meta data for an element
   */
  public addMetaData(elementId: string, type: 'wall' | 'door' | 'window' | 'item' | 'label', data: any): void {
    this.metaData[elementId] = {
      type,
      ...data
    };
  }

  /**
   * Get all collected meta data
   */
  public getMetaData(): MetaData {
    return { ...this.metaData };
  }

  /**
   * Clear all meta data
   */
  public clear(): void {
    this.metaData = {};
  }

  /**
   * Get meta data for a specific element
   */
  public getElementMetaData(elementId: string): any {
    return this.metaData[elementId] || null;
  }

  /**
   * Check if element has meta data
   */
  public hasElementMetaData(elementId: string): boolean {
    return elementId in this.metaData;
  }

  /**
   * Get count of elements with meta data
   */
  public getMetaDataCount(): number {
    return Object.keys(this.metaData).length;
  }
}

/**
 * Create a new meta data collector instance
 */
export function createMetaDataCollector(): MetaDataCollector {
  return new MetaDataCollector();
} 