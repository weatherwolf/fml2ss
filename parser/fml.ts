import { Project, Floor, Floorplan, Wall, Item, Label, Area, Surface, Line, Dimension, Window, Door } from '../fml_classes';

export interface FMLParseResult {
  project: Project;
  warnings: string[];
  errors: string[];
  validation: {
    floors: number;
    totalDesigns: number;
    totalWalls: number;
    totalItems: number;
    totalLabels: number;
    totalAreas: number;
    totalSurfaces: number;
    totalLines: number;
    totalDimensions: number;
  };
}

export function getWalls(project: Project): Wall[] {
  return project.floors.flatMap(floor => floor.designs.flatMap(design => design.walls));
};

export function getWindows(project: Project): Window[] {
  return project.floors.flatMap(floor => floor.designs.flatMap(design => design.walls.flatMap(wall => wall.openings.filter(opening => 'type' in opening && opening.type === 'window')) as Window[]));
};

export function getDoors(project: Project): Door[] {
  return project.floors.flatMap(floor => floor.designs.flatMap(design => design.walls.flatMap(wall => wall.openings.filter(opening => 'type' in opening && opening.type === 'door')) as Door[]));
};

export function getItems(project: Project): Item[] {
  return project.floors.flatMap(floor => floor.designs.flatMap(design => design.items));
};

export function getLabels(project: Project): Label[] {
  return project.floors.flatMap(floor => floor.designs.flatMap(design => design.labels));
};

export interface FMLValidationOptions {
  strictMode?: boolean;
  allowMissingWalls?: boolean;
  allowMissingItems?: boolean;
  validateCoordinates?: boolean;
}

export class FMLParser {
  private warnings: string[] = [];
  private errors: string[] = [];

  /**
   * Parse FML JSON data into a validated Project object
   */
  public parseFML(fmlData: any, options: FMLValidationOptions = {}): FMLParseResult {
    this.warnings = [];
    this.errors = [];

    try {
      // Basic structure validation
      if (!fmlData) {
        throw new Error('FML data is null or undefined');
      }

      const project = fmlData as Project;

      // Validate project structure
      this.validateProject(project, options);

      // If there are critical errors, throw them
      if (this.errors.length > 0) {
        throw new Error(`Validation failed: ${this.errors.join(', ')}`);
      }

      // Calculate validation statistics
      const validation = this.calculateValidationStats(project);

      return {
        project,
        warnings: this.warnings,
        errors: this.errors,
        validation
      };

    } catch (error) {
      throw new Error(`FML parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Load and parse FML from a JSON string
   */
  public parseFMLFromString(fmlString: string, options: FMLValidationOptions = {}): FMLParseResult {
    try {
      const fmlData = JSON.parse(fmlString);
      return this.parseFML(fmlData, options);
    } catch (error) {
      throw new Error(`Failed to parse FML JSON string: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
    }
  }

  /**
   * Validate the project structure
   */
  private validateProject(project: Project, options: FMLValidationOptions): void {
    // Validate project basics
    if (!project.id) {
      this.errors.push('Project ID is missing');
    }

    if (!project.floors || project.floors.length === 0) {
      this.errors.push('Project must have at least one floor');
      return;
    }

    // Validate each floor
    project.floors.forEach((floor, floorIndex) => {
      this.validateFloor(floor, floorIndex, options);
    });
  }

  /**
   * Validate a floor and its designs
   */
  private validateFloor(floor: Floor, floorIndex: number, options: FMLValidationOptions): void {
    const floorName = floor.name || `floor ${floorIndex + 1}`;

    if (!floor.designs || floor.designs.length === 0) {
      this.warnings.push(`Floor "${floorName}" has no designs`);
      return;
    }

    // Validate each design
    floor.designs.forEach((design, designIndex) => {
      this.validateDesign(design, designIndex, floorName, options);
    });
  }

  /**
   * Validate a design and its elements
   */
  private validateDesign(design: Floorplan, designIndex: number, floorName: string, options: FMLValidationOptions): void {
    const designName = design.name || `design ${designIndex + 1}`;
    const fullName = `${floorName} > ${designName}`;

    // Check for critical arrays
    if (!design.walls || design.walls.length === 0) {
      if (!options.allowMissingWalls) {
        this.warnings.push(`Design "${fullName}" has no walls`);
      }
    } else {
      this.validateWalls(design.walls, fullName, options);
    }

    if (!design.items || design.items.length === 0) {
      if (!options.allowMissingItems) {
        this.warnings.push(`Design "${fullName}" has no items`);
      }
    } else {
      this.validateItems(design.items, fullName, options);
    }

    // Check for optional arrays and log if present
    if (design.areas && design.areas.length > 0) {
      this.warnings.push(`Design "${fullName}" has ${design.areas.length} area(s) - areas not yet supported in SceneScript`);
    }

    if (design.surfaces && design.surfaces.length > 0) {
      this.warnings.push(`Design "${fullName}" has ${design.surfaces.length} surface(s) - surfaces not yet supported in SceneScript`);
    }

    if (design.lines && design.lines.length > 0) {
      this.warnings.push(`Design "${fullName}" has ${design.lines.length} line(s) - lines not yet supported in SceneScript`);
    }

    if (design.dimensions && design.dimensions.length > 0) {
      this.warnings.push(`Design "${fullName}" has ${design.dimensions.length} dimension(s) - dimensions not yet supported in SceneScript`);
    }

    if (design.labels && design.labels.length > 0) {
      this.validateLabels(design.labels, fullName, options);
    }
  }

  /**
   * Validate walls
   */
  private validateWalls(walls: Wall[], designName: string, options: FMLValidationOptions): void {
    walls.forEach((wall, wallIndex) => {
      const wallName = `wall ${wallIndex + 1}`;

      // Validate endpoints
      if (!wall.a || !wall.b) {
        this.errors.push(`${designName} > ${wallName}: missing endpoints (a or b)`);
        return;
      }

      // Validate endpoint coordinates
      if (options.validateCoordinates) {
        if (typeof wall.a.x !== 'number' || typeof wall.a.y !== 'number') {
          this.errors.push(`${designName} > ${wallName}: invalid endpoint A coordinates`);
        }
        if (typeof wall.b.x !== 'number' || typeof wall.b.y !== 'number') {
          this.errors.push(`${designName} > ${wallName}: invalid endpoint B coordinates`);
        }
      }

      // Validate elevation data
      if (!wall.az || !wall.bz) {
        this.errors.push(`${designName} > ${wallName}: missing elevation data (az or bz)`);
        return;
      }

      if (typeof wall.az.z !== 'number' || typeof wall.az.h !== 'number') {
        this.errors.push(`${designName} > ${wallName}: invalid endpoint A elevation data`);
      }

      if (typeof wall.bz.z !== 'number' || typeof wall.bz.h !== 'number') {
        this.errors.push(`${designName} > ${wallName}: invalid endpoint B elevation data`);
      }

      // Validate wall properties
      if (typeof wall.thickness !== 'number' || wall.thickness <= 0) {
        this.warnings.push(`${designName} > ${wallName}: invalid thickness (${wall.thickness})`);
      }

      if (typeof wall.balance !== 'number' || wall.balance < 0 || wall.balance > 1) {
        this.warnings.push(`${designName} > ${wallName}: invalid balance value (${wall.balance})`);
      }

      // Validate openings if present
      if (wall.openings && wall.openings.length > 0) {
        this.validateOpenings(wall.openings, `${designName} > ${wallName}`, options);
      }
    });
  }

  /**
   * Validate openings (doors and windows)
   */
  private validateOpenings(openings: any[], wallName: string, options: FMLValidationOptions): void {
    openings.forEach((opening, openingIndex) => {
      const openingName = `opening ${openingIndex + 1}`;

      // Validate required properties
      if (!opening.refid) {
        this.errors.push(`${wallName} > ${openingName}: missing refid`);
      }

      if (typeof opening.width !== 'number' || opening.width <= 0) {
        this.errors.push(`${wallName} > ${openingName}: invalid width (${opening.width})`);
      }

      if (typeof opening.z !== 'number') {
        this.errors.push(`${wallName} > ${openingName}: invalid elevation (${opening.z})`);
      }

      if (typeof opening.z_height !== 'number' || opening.z_height <= 0) {
        this.errors.push(`${wallName} > ${openingName}: invalid height (${opening.z_height})`);
      }

      if (typeof opening.t !== 'number' || opening.t < 0 || opening.t > 1) {
        this.errors.push(`${wallName} > ${openingName}: invalid position t (${opening.t})`);
      }
    });
  }

  /**
   * Validate items
   */
  private validateItems(items: Item[], designName: string, options: FMLValidationOptions): void {
    items.forEach((item, itemIndex) => {
      const itemName = `item ${itemIndex + 1}`;

      // Validate position
      if (typeof item.x !== 'number' || typeof item.y !== 'number') {
        this.errors.push(`${designName} > ${itemName}: invalid position`);
      }

      if (typeof item.z !== 'number') {
        this.errors.push(`${designName} > ${itemName}: invalid z-coordinate`);
      }

      // Validate dimensions
      if (typeof item.width !== 'number' || item.width <= 0) {
        this.errors.push(`${designName} > ${itemName}: invalid width (${item.width})`);
      }

      if (typeof item.height !== 'number' || item.height <= 0) {
        this.errors.push(`${designName} > ${itemName}: invalid height (${item.height})`);
      }

      if (typeof item.z_height !== 'number' || item.z_height <= 0) {
        this.errors.push(`${designName} > ${itemName}: invalid z-height (${item.z_height})`);
      }

      // Validate rotation
      if (typeof item.rotation !== 'number') {
        this.errors.push(`${designName} > ${itemName}: invalid rotation`);
      }

      // Validate refid
      if (!item.refid) {
        this.errors.push(`${designName} > ${itemName}: missing refid`);
      }
    });
  }

  /**
   * Validate labels
   */
  private validateLabels(labels: Label[], designName: string, options: FMLValidationOptions): void {
    labels.forEach((label, labelIndex) => {
      const labelName = `label ${labelIndex + 1}`;

      // Validate position
      if (typeof label.x !== 'number' || typeof label.y !== 'number') {
        this.errors.push(`${designName} > ${labelName}: invalid position`);
      }

      // Validate text
      if (!label.text || typeof label.text !== 'string') {
        this.errors.push(`${designName} > ${labelName}: missing or invalid text`);
      }

      // Validate font properties
      if (typeof label.fontSize !== 'number' || label.fontSize <= 0) {
        this.warnings.push(`${designName} > ${labelName}: invalid font size (${label.fontSize})`);
      }
    });
  }

  /**
   * Calculate validation statistics
   */
  private calculateValidationStats(project: Project) {
    let totalDesigns = 0;
    let totalWalls = 0;
    let totalItems = 0;
    let totalLabels = 0;
    let totalAreas = 0;
    let totalSurfaces = 0;
    let totalLines = 0;
    let totalDimensions = 0;

    project.floors.forEach(floor => {
      if (floor.designs) {
        totalDesigns += floor.designs.length;
        
        floor.designs.forEach(design => {
          totalWalls += design.walls?.length || 0;
          totalItems += design.items?.length || 0;
          totalLabels += design.labels?.length || 0;
          totalAreas += design.areas?.length || 0;
          totalSurfaces += design.surfaces?.length || 0;
          totalLines += design.lines?.length || 0;
          totalDimensions += design.dimensions?.length || 0;
        });
      }
    });

    return {
      floors: project.floors.length,
      totalDesigns,
      totalWalls,
      totalItems,
      totalLabels,
      totalAreas,
      totalSurfaces,
      totalLines,
      totalDimensions
    };
  }

  /**
   * Get all warnings
   */
  public getWarnings(): string[] {
    return [...this.warnings];
  }

  /**
   * Get all errors
   */
  public getErrors(): string[] {
    return [...this.errors];
  }

  /**
   * Clear all warnings and errors
   */
  public clearValidation(): void {
    this.warnings = [];
    this.errors = [];
  }
}
