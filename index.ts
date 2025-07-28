import express from 'express';
import { Project } from './fml_classes';
import { FMLParser, FMLParseResult } from './parser/fml';
import { WallConverter } from './converter/wall_converter';
import { OpeningConverter } from './converter/opening_converter';
import { ItemConverter } from './converter/item_converter';
import { LabelConverter } from './converter/label_converter';
import { createIdManager } from './utils/id_manager';
import { createWarningCollector } from './utils/warning_collector';
import { createMetaDataCollector } from './utils/meta_data_collector';
import { FILE_CONFIG, saveConversionFiles, getFileStats } from './utils/file_output';

const app = express();

// Use JSON parser middleware (increase limit if FML files are large)
app.use(express.json({ limit: '10mb' }));

/**
 * Convert FML to SceneScript
 * 
 * Request body:
 * - FML data (required)
 * - filename: string (optional) - base filename for output files
 * - config: object (optional) - configuration options
 *   - saveToFiles: boolean - whether to save files or return JSON (default: true)
 *   - outputDirectory: string - directory for output files (default: "output/")
 *   - overwriteExisting: boolean - whether to overwrite existing files (default: true)
 * 
 * Response:
 * - Console mode: { scene: string, meta: object }
 * - File mode: { success: boolean, message: string, files: object, summary: object, meta: object }
 */
app.post('/convert', (req, res) => {
  try {
    const idManager = createIdManager();
    const metaDataCollector = createMetaDataCollector();
    const fmlParser = new FMLParser();
    
    // Get configuration from request body
    const config = req.body.config || {};
    const saveToFiles = config.saveToFiles !== undefined ? config.saveToFiles : FILE_CONFIG.SAVE_TO_FILES;
    const outputDirectory = config.outputDirectory || FILE_CONFIG.OUTPUT_DIRECTORY;
    const overwriteExisting = config.overwriteExisting !== undefined ? config.overwriteExisting : FILE_CONFIG.OVERWRITE_EXISTING;
    const inputFilename = req.body.filename || 'conversion';
    
    // Parse and validate FML data
    const parseResult: FMLParseResult = fmlParser.parseFML(req.body, {
      strictMode: false,
      allowMissingWalls: false,
      allowMissingItems: false,
      validateCoordinates: true
    });

    // Initialize conversion data structures
    const sceneLines: string[] = [];
    let nextId = 1;
    const allWarnings: string[] = [...parseResult.warnings];

    // Create warning collector for tracking information loss
    const warningCollector = createWarningCollector();

    // Convert walls, openings, items, and labels for each floor and design
    const wallConverter = new WallConverter(warningCollector);
    const openingConverter = new OpeningConverter(warningCollector);
    const itemConverter = new ItemConverter(warningCollector);
    const labelConverter = new LabelConverter(warningCollector);
    
    parseResult.project.floors.forEach((floor, floorIndex) => {
      if (floor.designs) {
        floor.designs.forEach((design, designIndex) => {
          if (design.walls && design.walls.length > 0) {
            // Convert walls for this design
            const wallResult = wallConverter.convertWalls(design.walls, idManager, openingConverter, metaDataCollector);
            sceneLines.push(...wallResult.sceneLines);
            nextId = wallResult.nextId;
            // Warnings are now collected centrally by the warning collector      

            // Convert items for this design
            if (design.items && design.items.length > 0) {
              const itemResult = itemConverter.convertItems(design.items, idManager, metaDataCollector);
              sceneLines.push(...itemResult.sceneLines);
              allWarnings.push(...itemResult.warnings);
            }

            // Convert labels for this design
            if (design.labels && design.labels.length > 0) {
              const labelResult = labelConverter.convertLabels(design.labels, idManager, metaDataCollector);
              sceneLines.push(...labelResult.sceneLines);
              allWarnings.push(...labelResult.warnings);
            }
          }
        });
      }
    });
    
    const sceneText = sceneLines.filter(line => line.trim().length > 0).join('\n');
    
    const meta = {
      projectId: parseResult.project.id,
      timestamp: new Date().toISOString(),
      warnings: warningCollector.getWarningMessages(),
      warningSummary: warningCollector.getSummary(),
      validation: parseResult.validation,
      metaData: metaDataCollector.getMetaData()
    };

    // Handle file output vs console output
    if (saveToFiles) {
      // File output mode
      const fileResult = saveConversionFiles(inputFilename, sceneText, metaDataCollector.getMetaData(), {
        outputDirectory,
        overwriteExisting
      });
      
      if (fileResult.success) {
        const stats = getFileStats(sceneText, metaDataCollector.getMetaData());
        
        res.status(200).json({
          success: true,
          message: 'Files saved successfully',
          files: {
            sceneScript: fileResult.sceneFile,
            metaData: fileResult.metaFile
          },
          summary: {
            sceneLines: stats.sceneLines,
            metaDataEntries: stats.metaDataEntries,
            totalSize: stats.totalSize
          },
          meta: meta
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to save files',
          details: fileResult.error,
          meta: meta
        });
      }
    } else {
      // Console output mode (current behavior)
      res.status(200).json({
        scene: sceneText,
        meta: meta
      });
    }

  } catch (error) {
    console.error('Conversion error:', error);
    res.status(500).json({
      error: 'Internal server error during conversion',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', service: 'FML to SceneScript Converter' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FML to SceneScript Converter running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Convert endpoint: POST http://localhost:${PORT}/convert`);
});



