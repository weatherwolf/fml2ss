import * as fs from 'fs';
import * as path from 'path';
import { FMLParser, FMLParseResult, getDoors, getItems, getWalls, getWindows, getLabels } from './parser/fml';
import { WallConverter } from './converter/wall_converter';
import { OpeningConverter } from './converter/opening_converter';
import { ItemConverter } from './converter/item_converter';
import { LabelConverter } from './converter/label_converter';
import { createIdManager } from './utils/id_manager';

// Test function
async function testFMLParser(fmlFilePath: string) {
  try {
    const idManager = createIdManager();

    console.log(`🔍 Testing FML parser with file: ${fmlFilePath}`);
    
    // Check if file exists
    if (!fs.existsSync(fmlFilePath)) {
      console.error(`❌ File not found: ${fmlFilePath}`);
      return;
    }

    // Read the FML file
    console.log('📖 Reading FML file...');
    const fmlContent = fs.readFileSync(fmlFilePath, 'utf8');
    console.log(`📄 File size: ${fmlContent.length} characters`);

    // Parse the FML content
    console.log('🔧 Parsing FML content...');
    const parseStartTime = performance.now();
    const parser = new FMLParser();
    const parseResult: FMLParseResult = parser.parseFMLFromString(fmlContent, {
      strictMode: false,
      allowMissingWalls: false,
      allowMissingItems: false,
      validateCoordinates: true
    });
    const parseEndTime = performance.now();
    const parseTime = parseEndTime - parseStartTime;

    // Display results
    console.log('\n✅ Parsing successful!');
    console.log('\n📊 Validation Statistics:');
    console.log(`   Floors: ${parseResult.validation.floors}`);
    console.log(`   Total Designs: ${parseResult.validation.totalDesigns}`);
    console.log(`   Total Walls: ${parseResult.validation.totalWalls}`);
    console.log(`   Total Items: ${parseResult.validation.totalItems}`);
    console.log(`   Total Labels: ${parseResult.validation.totalLabels}`);
    console.log(`   Total Areas: ${parseResult.validation.totalAreas}`);
    console.log(`   Total Surfaces: ${parseResult.validation.totalSurfaces}`);
    console.log(`   Total Lines: ${parseResult.validation.totalLines}`);
    console.log(`   Total Dimensions: ${parseResult.validation.totalDimensions}`);

    const project = parseResult.project;
    
    // Time the conversion process
    const conversionStartTime = performance.now();
    
    const walls = getWalls(project);
    const wallConverter = new WallConverter();
    const openingConverter = new OpeningConverter();
    const wallResult = wallConverter.convertWalls(walls, idManager, openingConverter);
    console.log(wallResult.sceneLines);

    const items = getItems(project);
    const itemConverter = new ItemConverter();
    const itemResult = itemConverter.convertItems(items, idManager);
    console.log(itemResult.sceneLines);

    const labels = getLabels(project);
    const labelConverter = new LabelConverter();
    const labelResult = labelConverter.convertLabels(labels, idManager);
    console.log(labelResult.sceneLines);
    
    const conversionEndTime = performance.now();
    const conversionTime = conversionEndTime - conversionStartTime;

    // Display timing results
    console.log('\n⏱️  Performance Statistics:');
    console.log(`   Parsing time: ${parseTime.toFixed(2)}ms`);
    console.log(`   Conversion time: ${conversionTime.toFixed(2)}ms`);
    console.log(`   Total processing time: ${(parseTime + conversionTime).toFixed(2)}ms`);

    if (parseResult.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      parseResult.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    } else {
      console.log('\n✅ No warnings');
    }

    if (parseResult.errors.length > 0) {
      console.log('\n❌ Errors:');
      parseResult.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    } else {
      console.log('\n✅ No errors');
    }

    // Test the conversion endpoint
    console.log('\n🌐 Testing conversion endpoint...');
    const testConversion = await testConversionEndpoint(parseResult.project);
    
    if (testConversion.success) {
      console.log('✅ Conversion endpoint test successful');
      console.log(`📝 Generated ${testConversion.sceneLines.length} SceneScript lines`);
    } else {
      console.log('❌ Conversion endpoint test failed:', testConversion.error);
    }

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : error);
  }
}

// Test the conversion endpoint
async function testConversionEndpoint(project: any) {
  try {
    const response = await fetch('http://localhost:3000/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(project)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText}` };
    }

    const result = await response.json() as any;
    const sceneLines = result.scene.split('\n');
    
    return { 
      success: true, 
      sceneLines,
      meta: result.meta 
    };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// Main execution
async function main() {
  // Get FML file path from command line argument or use default
  const fmlFilePath = process.argv[2] || './FML_exports/Project 9.json.fml';
  
  console.log('🚀 FML Parser Test');
  console.log('==================');
  
  await testFMLParser(fmlFilePath);
  
  console.log('\n🏁 Test completed');
}

// Run the test
main().catch(console.error); 