# System Patterns: Pixel Combat Arena (Prototype)

**System Architecture**:
- Modular design with distinct systems: Grid, Character, Combat, AI, UI, and Main Game Orchestration.
- Central `main.ts` module orchestrates the game flow and manages the primary `GameState`.
- Systems interact by calling functions on each other and reading/writing to the shared `GameState`.
- HTML5 Canvas API for rendering the game grid and characters.
- DOM manipulation for UI elements outside the canvas.

**Key Technical Decisions**:
- **TypeScript**: Used for strong typing and code organization.
- **Vitest**: Chosen for automated unit and integration testing.
- **Configuration-Driven**: Character and game settings defined in `config.ts`.
- **Manhattan Distance**: Used for range calculations on the grid for simplicity.
- **Simplified AI**: Rule-based, reactive AI without complex pathfinding or long-term planning in the prototype.
- **Visual Effects**: Managed by `main.ts` with a list of active effects rendered in the game loop.
- **Test Hooks**: Exporting internal state/functions from `main.ts` for integration testing.

**Design Patterns in Use**:
- **Module Pattern**: Code organized into distinct files/modules with specific responsibilities.
- **Observer Pattern (Implicit)**: UI elements "observe" changes in `GameState` via explicit update function calls from `main.ts`.
- **Command Pattern (Implicit)**: Player input is translated into specific game actions (commands) executed by `main.ts`.

**Component Relationships**:
- `main.ts` depends on all other core modules (`grid.ts`, `character.ts`, `combat.ts`, `ai.ts`, `ui.ts`, `config.ts`, `types.ts`).
- `combat.ts` depends on `character.ts` (for applying damage) and `config.ts` (for dice rolls).
- `ai.ts` depends on `grid.ts` (for spatial queries) and `types.ts`.
- `character.ts` depends on `grid.ts` (for tile occupancy) and `config.ts` (for creation data and dice rolls).
- `grid.ts` depends on `config.ts` (for dimensions and rendering).
- `ui.ts` depends on `types.ts` and receives data/callbacks from `main.ts`.
- `config.ts` and `types.ts` are foundational and depended upon by most other modules.
