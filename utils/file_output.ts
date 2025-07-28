import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuration for file output system
 */
export const FILE_CONFIG = {
  SAVE_TO_FILES: true,  // Toggle between console and file output
  OUTPUT_DIRECTORY: "output/",
  OVERWRITE_EXISTING: true
};

/**
 * Creates the output directory if it doesn't exist
 */
export function createOutputDirectory(dir: string = FILE_CONFIG.OUTPUT_DIRECTORY): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Generates output filenames from input FML file path
 * Example: "project.fml" → "output/project.txt" + "output/project_meta.json"
 */
export function generateOutputFilenames(inputPath: string, outputDir?: string): { sceneFile: string; metaFile: string } {
  // Extract base name without extension
  const baseName = path.basename(inputPath, path.extname(inputPath));
  
  // Use provided output directory or default
  const dir = outputDir || FILE_CONFIG.OUTPUT_DIRECTORY;
  
  // Generate output filenames
  const sceneFile = path.join(dir, `${baseName}.txt`);
  const metaFile = path.join(dir, `${baseName}_meta.json`);
  
  return { sceneFile, metaFile };
}

/**
 * Handles file naming conflicts by adding timestamp if needed
 */
export function handleFileConflicts(filename: string, overwriteExisting?: boolean): string {
  const overwrite = overwriteExisting !== undefined ? overwriteExisting : FILE_CONFIG.OVERWRITE_EXISTING;
  if (!overwrite && fs.existsSync(filename)) {
    const dir = path.dirname(filename);
    const ext = path.extname(filename);
    const base = path.basename(filename, ext);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return path.join(dir, `${base}_${timestamp}${ext}`);
  }
  return filename;
}

/**
 * Writes SceneScript content to a .txt file
 */
export function writeSceneScriptFile(filename: string, content: string, config?: { overwriteExisting?: boolean }): void {
  const finalFilename = handleFileConflicts(filename, config?.overwriteExisting);
  
  try {
    fs.writeFileSync(finalFilename, content, 'utf8');
    console.log(`✅ SceneScript saved to: ${finalFilename}`);
  } catch (error) {
    throw new Error(`Failed to write SceneScript file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Writes meta data to a .json file
 */
export function writeMetaDataFile(filename: string, metaData: any, config?: { overwriteExisting?: boolean }): void {
  const finalFilename = handleFileConflicts(filename, config?.overwriteExisting);
  
  try {
    const jsonContent = JSON.stringify(metaData, null, 2);
    fs.writeFileSync(finalFilename, jsonContent, 'utf8');
    console.log(`✅ Meta data saved to: ${finalFilename}`);
  } catch (error) {
    throw new Error(`Failed to write meta data file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Saves both SceneScript and meta data files
 */
export function saveConversionFiles(
  inputPath: string,
  sceneContent: string,
  metaData: any,
  config?: {
    outputDirectory?: string;
    overwriteExisting?: boolean;
  }
): { sceneFile: string; metaFile: string; success: boolean; error?: string } {
  try {
    // Use provided config or fall back to defaults
    const outputDir = config?.outputDirectory || FILE_CONFIG.OUTPUT_DIRECTORY;
    const overwrite = config?.overwriteExisting !== undefined ? config.overwriteExisting : FILE_CONFIG.OVERWRITE_EXISTING;
    
    // Create output directory
    createOutputDirectory(outputDir);
    
    // Generate filenames with custom output directory
    const { sceneFile, metaFile } = generateOutputFilenames(inputPath, outputDir);
    
    // Write files with custom overwrite setting
    writeSceneScriptFile(sceneFile, sceneContent, { overwriteExisting: overwrite });
    writeMetaDataFile(metaFile, metaData, { overwriteExisting: overwrite });
    
    return {
      sceneFile,
      metaFile,
      success: true
    };
  } catch (error) {
    return {
      sceneFile: '',
      metaFile: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Gets file statistics for response
 */
export function getFileStats(sceneContent: string, metaData: any): {
  sceneLines: number;
  metaDataEntries: number;
  totalSize: number;
} {
  const sceneLines = sceneContent.split('\n').filter(line => line.trim().length > 0).length;
  const metaDataEntries = Object.keys(metaData).length;
  const totalSize = Buffer.byteLength(sceneContent, 'utf8') + Buffer.byteLength(JSON.stringify(metaData), 'utf8');
  
  return {
    sceneLines,
    metaDataEntries,
    totalSize
  };
} 