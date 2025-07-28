/**
 * ID Management System for FML to SceneScript Conversion
 * 
 * Handles ID preservation and generation for different element types:
 * - Walls: 0+ (preserve FML IDs or generate from 0)
 * - Doors: 1000+ (generate from 1000)
 * - Windows: 2000+ (generate from 2000)
 * - Items: 3000+ (preserve FML IDs or generate from 3000)
 * - Labels: 4000+ (generate from 4000)
 */

export interface IdRanges {
  walls: { start: number; current: number };
  doors: { start: number; current: number };
  windows: { start: number; current: number };
  items: { start: number; current: number };
  labels: { start: number; current: number };
}

export interface IdManager {
  preserveOrGenerateId: (originalId: number | undefined, type: 'wall' | 'item') => number;
  getNextWallId: () => number;
  getNextDoorId: () => number;
  getNextWindowId: () => number;
  getNextItemId: () => number;
  getNextLabelId: () => number;
  getRanges: () => IdRanges;
  reset: () => void;
}

export class SceneScriptIdManager implements IdManager {
  private ranges: IdRanges = {
    walls: { start: 0, current: 0 },
    doors: { start: 1000, current: 1000 },
    windows: { start: 2000, current: 2000 },
    items: { start: 3000, current: 3000 },
    labels: { start: 4000, current: 4000 }
  };

  private usedIds: Set<number> = new Set();

  /**
   * Preserve original FML ID or generate a new one
   * @param originalId - The ID from FML (may be undefined)
   * @param type - The element type ('wall' or 'item')
   * @returns The ID to use in SceneScript
   */
  public preserveOrGenerateId(originalId: number | undefined, type: 'wall' | 'item'): number {
    if (originalId !== undefined && originalId >= 0) {
      // Preserve the original FML ID
      this.usedIds.add(originalId);
      return originalId;
    }

    // Generate a new ID based on type
    switch (type) {
      case 'wall':
        return this.getNextWallId();
      case 'item':
        return this.getNextItemId();
      default:
        throw new Error(`Unknown type for ID generation: ${type}`);
    }
  }

  /**
   * Get next available wall ID
   * @returns Next wall ID
   */
  public getNextWallId(): number {
    const id = this.ranges.walls.current;
    this.ranges.walls.current++;
    this.usedIds.add(id);
    return id;
  }

  /**
   * Get next available door ID
   * @returns Next door ID
   */
  public getNextDoorId(): number {
    const id = this.ranges.doors.current;
    this.ranges.doors.current++;
    this.usedIds.add(id);
    return id;
  }

  /**
   * Get next available window ID
   * @returns Next window ID
   */
  public getNextWindowId(): number {
    const id = this.ranges.windows.current;
    this.ranges.windows.current++;
    this.usedIds.add(id);
    return id;
  }

  /**
   * Get next available item ID
   * @returns Next item ID
   */
  public getNextItemId(): number {
    const id = this.ranges.items.current;
    this.ranges.items.current++;
    this.usedIds.add(id);
    return id;
  }

  /**
   * Get next available label ID
   * @returns Next label ID
   */
  public getNextLabelId(): number {
    const id = this.ranges.labels.current;
    this.ranges.labels.current++;
    this.usedIds.add(id);
    return id;
  }

  /**
   * Get current ID ranges for debugging
   * @returns Current ID ranges
   */
  public getRanges(): IdRanges {
    return { ...this.ranges };
  }

  /**
   * Check if an ID is already used
   * @param id - The ID to check
   * @returns True if ID is already used
   */
  public isIdUsed(id: number): boolean {
    return this.usedIds.has(id);
  }

  /**
   * Validate that an ID is within the correct range for its type
   * @param id - The ID to validate
   * @param type - The element type
   * @returns True if ID is valid for the type
   */
  public validateIdRange(id: number, type: 'wall' | 'door' | 'window' | 'item' | 'label'): boolean {
    switch (type) {
      case 'wall':
        return id >= 0;
      case 'door':
        return id >= 1000 && id < 2000;
      case 'window':
        return id >= 2000 && id < 3000;
      case 'item':
        return id >= 3000 && id < 4000;
      case 'label':
        return id >= 4000;
      default:
        return false;
    }
  }

  /**
   * Reset all ID counters (useful for testing)
   */
  public reset(): void {
    this.ranges = {
      walls: { start: 0, current: 0 },
      doors: { start: 1000, current: 1000 },
      windows: { start: 2000, current: 2000 },
      items: { start: 3000, current: 3000 },
      labels: { start: 4000, current: 4000 }
    };
    this.usedIds.clear();
  }

  /**
   * Get statistics about ID usage
   * @returns ID usage statistics
   */
  public getStats(): {
    totalUsedIds: number;
    wallsUsed: number;
    doorsUsed: number;
    windowsUsed: number;
    itemsUsed: number;
    labelsUsed: number;
  } {
    const stats = {
      totalUsedIds: this.usedIds.size,
      wallsUsed: 0,
      doorsUsed: 0,
      windowsUsed: 0,
      itemsUsed: 0,
      labelsUsed: 0
    };

    this.usedIds.forEach(id => {
      if (id >= 0 && id < 1000) stats.wallsUsed++;
      else if (id >= 1000 && id < 2000) stats.doorsUsed++;
      else if (id >= 2000 && id < 3000) stats.windowsUsed++;
      else if (id >= 3000 && id < 4000) stats.itemsUsed++;
      else if (id >= 4000) stats.labelsUsed++;
    });

    return stats;
  }
}

/**
 * Create a new ID manager instance
 * @returns New ID manager
 */
export function createIdManager(): IdManager {
  return new SceneScriptIdManager();
} 