# FML to SceneScript Converter Blueprint

## 🚨 CRITICAL REMINDER - READ BEFORE EVERY MILESTONE 🚨

**BEFORE starting ANY milestone implementation, you MUST:**
1. Read `research.txt` for detailed implementation guidance
2. Read `research_corrected.txt` for the correct SceneScript format
3. Cross-reference both documents to ensure format consistency
4. Use the corrected format (comma-separated key=value) from `research_corrected.txt`

**Key Format Corrections:**
- SceneScript uses `command, key=value, key=value, ...` format
- Wall IDs start from 0, Opening IDs: Doors (1000+), Windows (2000+)
- Parameter names: `a_x`, `position_x`, `wall0_id`, etc.

---

## Goal

Create a Node.js microservice that converts FML (Floorplanner Markup Language) JSON files to SceneScript format, ensuring round-trip fidelity and maintaining all essential geometric and semantic information.

## User Stories / Acceptance Tests

- As a developer, I want to convert FML floor plan files to SceneScript format so that I can use them in 3D rendering applications
- As a user, I can send an FML JSON payload to the /convert endpoint and receive both SceneScript commands and metadata
- As a developer, I need the conversion to preserve all IDs, materials, and properties for lossless round-trip conversion
- As a user, I want the service to handle large FML files efficiently with response times under 100ms

## High-Level Design

- **Architecture**: Node.js + TypeScript microservice using Express
- **Input**: FML JSON payload via POST /convert endpoint
- **Output**: JSON response containing SceneScript text and metadata
- **Key Components**: 
  - FML parser and validator
  - Conversion engine for walls, openings, items, labels, materials
  - Unit conversion (cm to meters)
  - ID preservation system
  - Warning collection and reporting
- **Design Principles**: Round-trip fidelity, performance (<100ms), concise code (~200 lines)

## Milestones

### Phase 1: Project Setup & Foundation
1. [x] Initialize Node.js project with TypeScript and Express
2. [x] Set up FML type definitions and interfaces
3. [x] Create basic Express server with /convert endpoint
4. [x] Implement JSON payload validation

### Phase 0: Enhanced Data Preservation & File Output
0.1. [x] Create Meta Data Collection System
   - Create `MetaDataCollector` class to gather "lost" information
   - Identify what data gets lost during conversion (colors, materials, textures, etc.)
   - Structure meta.json format: `{ "0": { "color": "xxx", "material": "steel" } }`
   - Add methods: `addMetaData(elementId, data)`, `getMetaData()`

0.2. [x] Modify Converters to Collect Meta Data
   - Update each converter (wall, opening, item, label) to:
     - Generate SceneScript commands (as before)
     - **ALSO** collect meta data for lost information
     - Return both SceneScript lines AND meta data
   - Update return types: `ConversionResult { sceneLines, metaData, warnings }`

0.3. [x] Create File Output System
   - Add file system utilities for:
     - Creating output directory
     - Generating file names from input
     - Writing .txt and .json files
     - Handling file naming conflicts
   - Example: `fml_file.fml` → `fml_file.txt` + `fml_file_meta.json`

0.4. [x] Remove Extension Commands from SceneScript
   - **CRITICAL**: Remove all `set_*` commands from SceneScript output
   - Move `set_asset`, `set_swing`, `set_material` data to meta.json
   - Ensure SceneScript contains ONLY core commands: `make_wall`, `make_door`, `make_window`, `make_bbox`
   - Update all converters to collect this data in meta.json instead of generating commands
   - Reference: Original SceneScript format in `ase_scene_language.txt` shows pure commands only

0.5. [ ] Remove Comment-Based Extra Information
   - Remove all comment lines containing extra information:
     - `# item X light: {...}` → Move to meta.json
     - `# item X mirrored: [...]` → Move to meta.json
     - `# item X materials: {...}` → Move to meta.json
   - Ensure SceneScript contains only structural commands and section headers
   - All extra data should be in meta.json, not in comments

0.6. [x] Update Extension Command Utilities
   - Modify `utils/extension_commands.ts` to:
     - Stop generating `set_*` commands
     - Return data for meta collection instead
     - Update `createSetAssetCommand()`, `createSetSwingCommand()`, `createSetMaterialCommand()`
   - Ensure these utilities support meta data collection mode

0.7. [x] Add Toggle Configuration
   - Add simple boolean flag: `SAVE_TO_FILES: boolean`
   - Modify main conversion logic to:
     - **Console Mode**: Return JSON response (current behavior)
     - **File Mode**: Save files and return success message
   - Add configuration options to API endpoint
   - **Implementation**: API now accepts `config` object with `saveToFiles`, `outputDirectory`, and `overwriteExisting` options
   - **Backward Compatibility**: Defaults to file mode if no config provided

0.8. [ ] Update API Response
   - Modify `/convert` endpoint to handle both modes
   - Add configuration options for file output
   - Ensure backward compatibility
   - Update response format to include meta data

0.9. [x] Fix Current TypeScript Errors
   - Update `test_parser.ts` to pass warning collectors to converters
   - Ensure all converters are properly instantiated
   - Fix import errors and constructor parameter issues

### Phase 2: Core Conversion Engine
5. [x] Implement wall conversion (straight and curved walls)
6. [x] Implement opening conversion (doors and windows with swing direction)
7. [x] Implement item conversion (furniture as bounding boxes)
8. [x] Implement label conversion (as comments for round-trip fidelity)

### Phase 3: Advanced Features & Materials
9. [x] Implement wall materials and decorations conversion
10. [x] Add unit conversion utilities (cm to meters)
11. [x] Implement ID preservation and generation system
12. [x] Add extension commands (SetMaterial, SetSwing, SetAsset)

### Phase 4: Error Handling & Optimization
13. [x] Implement warning collection and reporting *MVP
14. [ ] Add comprehensive error handling
15. [ ] Optimize performance for large files
16. [ ] Add input validation and edge case handling

### Phase 5: Testing & Documentation
17. [ ] Create test cases for various FML scenarios *MVP
18. [ ] Test round-trip conversion fidelity *MVP
19. [ ] Document API endpoints and response format
20. [ ] Performance testing and optimization

### Phase 6: Deployment & Finalization
21. [ ] Set up production deployment configuration
22. [ ] Add logging and monitoring
23. [ ] Final testing and bug fixes *MVP
24. [ ] Deploy to production environment

## Git Workflow Between Milestones

- Each milestone will be committed separately with descriptive commit messages
- Milestones will be marked as completed before proceeding to the next
- Git commands will be provided automatically after each milestone completion

## Implementation Rules

- **One milestone per prompt**: Only implement one milestone at a time
- **Automatic git commands**: After each milestone, assistant provides git commands automatically
- **Wait for confirmation**: After each milestone, wait for user to run git commands before proceeding
- **Clear milestone boundaries**: Mark each milestone as completed before moving to the next
- **Research document review**: Before starting ANY milestone, read both `research.txt` AND `research_corrected.txt` to refresh memory and ensure correct format usage
- **Format consistency**: Always use the corrected SceneScript format (comma-separated key=value) from `research_corrected.txt`
- **Documentation updates**: Create educational .txt files for complex conversions to help future developers
- **Blueprint maintenance**: Update milestone status and document any issues/fixes discovered during implementation
- **Test parser synchronization**: **ALWAYS** update `test_parser.ts` when modifying converter interfaces, constructors, or method signatures to maintain code quality and testing capability

## File Editing Guidelines

- **Use targeted `search_replace`** for small changes instead of rewriting entire files
- **Avoid `edit_file` for minor updates** - it's inefficient and time-consuming
- **Use `search_replace`** for milestone status updates, adding new steps, or small modifications
- **Only use `edit_file`** when creating new files or making extensive structural changes
- **This applies to all blueprint files** - prioritize efficiency and speed

## Research Document Review Process

### Before Starting ANY Milestone:
1. **Read `research.txt`** - Get the original detailed implementation guidance
2. **Read `research_corrected.txt`** - Apply the corrected SceneScript format
3. **Cross-reference both** - Ensure you're using the right format while following the detailed steps
4. **Note any conflicts** - If there are differences, prioritize `research_corrected.txt` for format

### Key Format Corrections to Remember:
- **SceneScript Format**: `command, key=value, key=value, ...` (NOT space-separated)
- **Wall IDs**: Start from 0, not 1
- **Opening IDs**: Doors (1000+), Windows (2000+)
- **Parameter Names**: Use specific names like `a_x`, `position_x`, `wall0_id`
- **Wall References**: `wall0_id=X, wall1_id=-1` for single wall openings

### Documentation Standards:
- **Create educational .txt files** for complex conversions (like `fml2scene_walls.txt`)
- **Include visual examples** and step-by-step explanations
- **Show before/after comparisons** to clarify the transformation
- **Document any format corrections** discovered during implementation

## Commit Message Format

Use this format for all commits in this implementation:
```
git commit -m "feat: <description> (FML converter MILESTONE X)"
```

## 🚨 Current Issues & Fixes

### Issue 1: Type Definitions Import
- **Problem**: FML type definitions need to be properly exported and imported
- **Fixes Applied**:
  - [x] Added export statements to all interfaces in fml_classes.ts
  - [x] Updated import statement to use namespace import

### Issue 2: Directory Structure with Spaces
- **Problem**: FML exports directory name contains spaces causing import issues
- **Fixes Applied**:
  - [x] Added sys.path manipulation to handle directory names with spaces
  - [x] Updated import paths to work in both local and production environments

### Issue 3: Test Parser Synchronization
- **Problem**: `test_parser.ts` was not updated when converter interfaces changed
- **Fixes Applied**:
  - [x] Updated `test_parser.ts` to import `createWarningCollector` and `createMetaDataCollector`
  - [x] Modified converter instantiations to pass required `WarningCollector` parameter
  - [x] Updated method calls to include `MetaDataCollector` parameter
  - [x] Added proper error handling and parameter passing throughout test file

### Issue 4: Extension Commands in SceneScript Output
- **Problem**: Current output contains `set_*` commands and comment-based extra information
- **Required Fixes**:
  - [ ] Remove all `set_asset`, `set_swing`, `set_material` commands from SceneScript
  - [ ] Move all extra data to meta.json instead of comments
  - [ ] Ensure SceneScript matches original format in `ase_scene_language.txt`
  - [x] Update extension command utilities to support meta collection mode

## State: IN_PROGRESS

## 🆕 New Phase 0: Enhanced Data Preservation & File Output

**Objective**: Implement complete data preservation with file output capabilities
- **Data Separation**: Pure SceneScript + structured meta data
- **File Output**: Save to files with proper naming convention
- **Toggle Feature**: Console mode vs File mode
- **Round-trip Fidelity**: No information loss during conversion

**Benefits**:
- Complete information preservation
- Clean separation of concerns
- Flexible output options
- Enhanced round-trip fidelity

## Technical Specifications

### FML to SceneScript Mapping
- **Walls**: `make_wall` / `make_curved_wall` commands
- **Doors**: `make_door` (swing and asset data in meta.json)
- **Windows**: `make_window` (asset data in meta.json)
- **Items**: `make_bbox` (asset, light, mirroring data in meta.json)
- **Labels**: Comments starting with `# LABEL`
- **Materials**: All material data moved to meta.json

### Unit Conversions
- FML coordinates: centimeters
- SceneScript coordinates: meters
- Conversion factor: `cmToMeters = (cm) => cm / 100.0`

### Response Format
```json
{
  "scene": "SceneScript commands as text",
  "meta": {
    "projectId": 123,
    "timestamp": "2024-01-01T00:00:00.000Z",
    "warnings": ["Warning messages"]
  }
}
``` 