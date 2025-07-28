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

## State: IN_PROGRESS

## Technical Specifications

### FML to SceneScript Mapping
- **Walls**: `make_wall` / `make_curved_wall` commands
- **Doors**: `make_door` with `set_swing` and `set_asset`
- **Windows**: `make_window` with `set_asset`
- **Items**: `make_bbox` with `set_asset`
- **Labels**: Comments starting with `# LABEL`
- **Materials**: `set_material` commands for wall decorations

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