# [Feature/Page/System] Update Blueprint

## Goal

Describe the main objective for this blueprint.  
(Example: Update the main page to improve user experience and design.)

## User Stories / Acceptance Tests

- As a user, I want to ...
- As a user, I can ...
- As a developer, I need to ...

## High-Level Design

- Summarize the architecture, main changes, or design principles.
- List key components, technologies, or flows.

## Milestones, example

### Phase 1: Planning
1. [ ] Define requirements and design

### Phase 2: Implementation
2. [ ] Implement core feature(s)
3. [ ] Update UI/UX or backend logic
4. [ ] Test functionality and responsiveness

### Phase 3: Testing & Review
5. [ ] User testing and feedback
6. [ ] Final review and polish

### Phase 4: Documentation & Deployment
7. [ ] Update documentation
8. [ ] Deploy changes

## Git Workflow Between Milestones


## Implementation Rules

- **One milestone per prompt**: Only implement one milestone at a time
- **Automatic git commands**: After each milestone, assistant provides git commands automatically
- **Wait for confirmation**: After each milestone, wait for user to run git commands before proceeding
- **Clear milestone boundaries**: Mark each milestone as completed before moving to the next

## File Editing Guidelines

- **Use targeted `search_replace`** for small changes instead of rewriting entire files
- **Avoid `edit_file` for minor updates** - it's inefficient and time-consuming
- **Use `search_replace`** for milestone status updates, adding new steps, or small modifications
- **Only use `edit_file`** when creating new files or making extensive structural changes
- **This applies to all blueprint files** - prioritize efficiency and speed

## Commit Message Format

Use this format for all commits in this implementation:
```
git commit -m "feat: <description> ([Feature] update MILESTONE X)"
```

## 🚨 Current Issues & Fixes

### Issue 1: 
- **Problem**: 
- **Fixes Applied**:
  - [ ]

## State: IN_PROGRESS 