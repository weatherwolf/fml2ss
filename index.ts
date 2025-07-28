import express from 'express';
import { Project } from './fml_classes';
import { FMLParser, FMLParseResult } from './parser/fml';
import { WallConverter } from './converter/wall_converter';
import { OpeningConverter } from './converter/opening_converter';
import { ItemConverter } from './converter/item_converter';
import { LabelConverter } from './converter/label_converter';
import { createIdManager } from './utils/id_manager';
import { createWarningCollector } from './utils/warning_collector';

const app = express();

// Use JSON parser middleware (increase limit if FML files are large)
app.use(express.json({ limit: '10mb' }));

app.post('/convert', (req, res) => {
  try {
    const idManager = createIdManager();

    const fmlParser = new FMLParser();
    
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

    // Add project header
    sceneLines.push('# FML to SceneScript conversion');
    sceneLines.push(`# Project: ${parseResult.project.name || 'Unnamed Project'}`);
    sceneLines.push(`# Floors: ${parseResult.validation.floors}`);
    sceneLines.push(`# Total Designs: ${parseResult.validation.totalDesigns}`);
    sceneLines.push(`# Total Walls: ${parseResult.validation.totalWalls}`);
    sceneLines.push(`# Total Items: ${parseResult.validation.totalItems}`);

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
            const wallResult = wallConverter.convertWalls(design.walls, idManager, openingConverter);
            sceneLines.push(...wallResult.sceneLines);
            nextId = wallResult.nextId;
            // Warnings are now collected centrally by the warning collector

            // Add wall statistics
            const wallStats = wallConverter.getStats(design.walls);
            sceneLines.push(`# Wall stats: ${wallStats.straightWalls} straight, ${wallStats.curvedWalls} curved, total length: ${wallStats.totalLength.toFixed(2)}m`);

            // Convert items for this design
            if (design.items && design.items.length > 0) {
              const itemResult = itemConverter.convertItems(design.items, idManager);
              sceneLines.push(...itemResult.sceneLines);
              allWarnings.push(...itemResult.warnings);

              const itemStats = itemConverter.getStats(design.items);
              sceneLines.push(`# Item stats: ${itemStats.totalItems} items, ${itemStats.itemsWithLights} with lights, ${itemStats.itemsWithMaterials} with materials, total volume: ${itemStats.totalVolume.toFixed(2)}m³`);
            }

            // Convert labels for this design
            if (design.labels && design.labels.length > 0) {
              const labelResult = labelConverter.convertLabels(design.labels, idManager);
              sceneLines.push(...labelResult.sceneLines);
              allWarnings.push(...labelResult.warnings);

              const labelStats = labelConverter.getStats(design.labels);
              sceneLines.push(`# Label stats: ${labelStats.totalLabels} labels, ${labelStats.labelsWithRotation} with rotation, ${labelStats.labelsWithCustomFont} with custom font, avg text length: ${labelStats.averageTextLength.toFixed(1)} chars`);
            }
          }
        });
      }
    });
    
    // Add warning summary as comments
    const warningSummary = warningCollector.getTextSummary();
    sceneLines.push(`# ${warningSummary}`);
    
    if (warningCollector.hasInformationLoss()) {
      sceneLines.push('# ⚠️  Information loss detected - some FML data may not round-trip perfectly');
    }
    
    if (warningCollector.hasHighSeverityWarnings()) {
      sceneLines.push('# 🚨 High severity warnings detected - conversion may have issues');
    }

    const sceneText = sceneLines.join('\n');
    
    const meta = {
      projectId: parseResult.project.id,
      timestamp: new Date().toISOString(),
      warnings: warningCollector.getWarningMessages(),
      warningSummary: warningCollector.getSummary(),
      validation: parseResult.validation
    };

    res.status(200).json({
      scene: sceneText,
      meta: meta
    });

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



