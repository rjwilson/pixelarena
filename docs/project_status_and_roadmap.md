# Project Status & Roadmap: 2D Turn-Based Combat Web App

## 1. Project Overview

**Goal**: Develop a functional prototype of a 2D turn-based tactical combat system as a web application. The game runs locally in a modern web browser, with gameplay inspired by Dungeons & Dragons (D&D) combat and a visual style guided by a provided pixel art image. A key focus is robust testing and automated verification.

**Core Technologies**: HTML, CSS, TypeScript, HTML5 Canvas API.
**Testing Framework**: Vitest.

## 2. Current State of Generated Artifacts

The project currently consists of the following core components:

* **`index.html`**: Main HTML file structuring the game page, including the canvas and UI panel placeholders. Styled with Tailwind CSS and custom CSS.
* **`style.css`**: Custom CSS for game-specific styling, including the "Press Start 2P" font and UI element aesthetics inspired by the reference image.
* **`tsconfig.json`**: TypeScript compiler configuration, outputting JavaScript to the `dist/` directory.
* **TypeScript Modules (`src/`)**:
    * **`types.ts`**: Defines all core data structures, interfaces (e.g., `Character`, `GameAction`, `GameState`), and enums.
    * **`config.ts`**: Contains game configurations like grid dimensions, tile sizes, character class/enemy templates (`CharacterConfig`), initial party/enemy setups, dice rolling utilities, and UI styling constants.
    * **`grid.ts`**: Manages the game grid creation, rendering of base tiles/lines, tile state (occupancy, walkability), coordinate conversions, and spatial queries (reachable/targetable tiles, characters in range).
    * **`character.ts`**: Handles character creation from configurations, rendering characters (simple shapes with health bars), managing character stats, applying damage/healing, and character movement logic (updating position and grid occupancy).
    * **`combat.ts`**: Implements the core combat resolution logic (`processAttack`), including d20 attack rolls vs. AC, damage calculation (based on action definitions, incorporating character stats and dice rolls), critical hit/miss handling, and invoking visual effect callbacks.
    * **`ai.ts`**: Provides decision-making logic for enemy characters (`getEnemyAIAction`). AI prioritizes offensive special abilities, then standard attacks, and will move to engage or get closer to targets (prioritizing lower HP players).
    * **`ui.ts`**: Manages DOM updates for UI elements outside the main canvas. This includes displaying character information (HP, stats), the action log, turn indicators, enabling/disabling action buttons, and showing game over messages.
    * **`main.ts`**: The central orchestrator. Initializes the game, manages the main game loop (`requestAnimationFrame`), handles turn progression (player and AI), processes player input (canvas clicks, UI button clicks), executes actions by calling relevant system functions, checks for win/loss conditions, and interfaces with all other modules. Includes test hooks for better integration testing.
* **Automated Tests (`src/tests/`)**:
    * Unit tests for `combat.ts`, `character.ts`, `grid.ts`, and `ai.ts`.
    * Integration tests (`integration.test.ts`) verifying interactions between `main.ts` and other modules, simulating player and AI turns, and checking win/loss conditions.

**Implemented Gameplay Mechanics**:

* **Turn-Based System**: Functional turn progression for a party of 2 player characters and 2 AI enemies.
* **Grid-Based Movement**: Characters move on the 2D grid based on their speed.
* **Simplified Action Economy**: Characters can generally perform one move and one standard action per turn (enforced by `canMove`/`canAct` flags).
* **Combat Resolution**: Attacks are resolved using d20 rolls against AC, with damage determined by dice rolls defined in character actions and modified by stats/defense. Critical hits and misses are implemented.
* **Basic Win/Loss Conditions**: Game ends when all player characters or all enemy characters are defeated, displaying a corresponding message.
* **Basic Enemy AI**: Enemies can select targets, choose between available actions (attack/special), and move to engage players.
* **Interactive UI**: Player can select actions via buttons, click on the canvas to move or target. UI panels display character info, action log, and turn status.

**Visual Style**:

* Characters are rendered as colored rectangles with symbols (programmatic placeholders).
* The UI layout (panels for player/enemy info, action log, action menu) is inspired by the provided reference image, using a pixel-art-friendly font ("Press Start 2P").

## 3. Testing and Verification

### 3.1. Automated Testing (Vitest)

* **Framework**: Vitest is used for both unit and integration testing.
* **Setup**:
    * Install dev dependencies: `npm install --save-dev vitest @vitest/ui` (or yarn/pnpm equivalent).
    * `package.json` should have scripts:
        ```json
        "scripts": {
          "test": "vitest",
          "test:ui": "vitest --ui",
          "coverage": "vitest run --coverage"
        }
        ```
    * A `vitest.config.ts` can be used for further configuration (e.g., `globals: true`).
    * Test files are located in `src/tests/` and end with `.test.ts`.
* **Unit Tests**:
    * `src/tests/combat.test.ts`: Tests `processAttack` for hits, misses, critical hits/misses, damage calculation with defense, and specific action modifiers (e.g., Power Attack). Dice rolls are mocked for deterministic outcomes.
    * `src/tests/character.test.ts`: Tests `createCharacter`, `applyDamage`, `healCharacter`, `moveCharacter`, and `resetCharacterTurnActions`.
    * `src/tests/grid.test.ts`: Tests `createGrid`, coordinate conversions, tile state management (occupy/free), and spatial query functions (`getReachableTiles`, `getTargetableTiles`, `findCharactersInRange`).
    * `src/tests/ai.test.ts`: Tests `getEnemyAIAction` for various scenarios, including target prioritization, action selection (attack, special, move, wait), and avoiding friendly fire/occupied tiles.
* **Integration Tests**:
    * `src/tests/integration.test.ts`:
        * Verifies the interaction between `main.ts` and other modules.
        * Mocks `ui.ts` to spy on UI update calls.
        * Uses Vitest's fake timers (`vi.useFakeTimers()`, `vi.runAllTimers()`) to control `setTimeout` calls in `main.ts` for AI turn progression.
        * Simulates full player turns (selecting actions via handlers, clicking on a mocked canvas via handlers) and AI turns.
        * Checks for correct game state transitions (character HP, position, turn changes) and win/loss condition triggering.
        * Relies on test hooks exported from `main.ts` (e.g., `getGameState_TEST_HOOK()`) for accessing internal state.
* **How to Run Tests**:
    * In the terminal, from the project root:
        * `npm test` (or `yarn test` / `pnpm test`): Runs tests, usually in watch mode.
        * `npm run test:ui` (or equivalent): Runs tests with the Vitest UI in a browser.
        * `npm run coverage` (or equivalent): Runs tests once and generates a code coverage report.

### 3.2. Manual Validation/Verification Steps

1.  **Compile TypeScript**:
    * Open a terminal in the project root.
    * Run the command: `tsc`
    * This will compile all `.ts` files from the `src/` directory into JavaScript files in the `dist/` directory.
2.  **Run the Game**:
    * Open the `index.html` file in a modern web browser (e.g., Chrome, Firefox) directly from your local file system.
3.  **What to Check Manually**:
    * **Initialization**: Does the game load with the grid, player characters, and enemy characters correctly positioned? Are UI panels populated?
    * **Player Turn**:
        * Can you select your active character?
        * Do action buttons (Move, Attack, Special) enable/disable correctly based on character state (`canMove`, `canAct`)?
        * **Movement**: Does clicking "Move" highlight reachable tiles? Can you click a valid tile to move your character? Is the character's position updated on the canvas and `canMove` set to false?
        * **Attack/Special**: Does clicking "Attack" or "Special" highlight valid targets? Can you click a target to perform the action? Is damage dealt correctly (check console logs and target HP)? Are `canAct` flags updated?
        * Are visual effects (damage numbers, "Miss") displayed?
        * Does the action log update with descriptions of actions taken?
    * **Ending Turn**: Does the "End Turn" button correctly pass the turn to the next character?
    * **AI Turn**:
        * Does the AI take its turn after a short delay?
        * Does the AI move and/or attack player characters?
        * Does the AI behavior seem reasonable (e.g., attacking characters it can reach, moving towards players if out of range)?
        * Are AI actions logged?
    * **Combat Resolution**: Observe attack rolls vs. AC, damage dealt vs. defense, critical hits/misses (these are logged to the console and action log).
    * **Win/Loss Conditions**: Can you defeat all enemies? Does the victory message appear? Can the enemies defeat your party? Does the defeat message appear? Does the "Restart/Play Again" button on the message box work?
    * **Console Logs**: Check the browser's developer console for any errors or informative logs from the game.

## 4. Remaining Work Units / Future Enhancements

### 4.1. Core Gameplay Refinements & Immediate Next Steps

* **Full Special Ability Implementation**:
    * **Warrior - Power Attack**: Currently implemented as +5 to hit and modified damage. Ensure its "uses Action & Move" cost is strictly enforced if not already.
    * **Mage - Firebolt**: Currently implemented as a ranged damaging attack.
    * Define and implement effects for any other planned special abilities (e.g., healing, buffs, debuffs, area of effect). This will likely involve expanding the `GameAction` interface and `performSpecialAbility` logic.
* **Refined Player Targeting UI**:
    * Clear visual distinction for tiles in range of a selected ability vs. tiles that can actually be targeted (e.g., containing a valid enemy/ally).
    * Consider previews for Area of Effect (AoE) abilities if they are added.
* **UI Polish for Action States**: Ensure action buttons and character indicators clearly reflect selection, cooldowns (if any), or unavailability.

### 4.2. Visual Polish (Aligning with Reference Image)

* **Pixel Art Sprites**: Replace current programmatic placeholder sprites (colored rectangles) with actual pixel art for characters. This could be:
    * Programmatically drawn pixel art directly on the canvas.
    * Loading external sprite sheets (e.g., PNGs) and rendering frames.
* **Environment Tiles**: Enhance the visual appearance of grid tiles beyond simple checkerboard/colors to match the reference image's environment (e.g., grass, dirt, trees, rocks).
* **UI Aesthetics**: Further refine CSS for UI panels, buttons, fonts, and health bars to more closely match the pixel art style of the reference image.
* **Expanded Visual Effects**: Add more distinct visual effects/animations on the canvas for different types of attacks, spells, healing, and status effects.

### 4.3. AI Enhancements

* **Role-Based Behaviors**: If different enemy types have distinct roles (e.g., tank, ranged DPS, support), implement AI logic tailored to those roles.
* **Terrain Awareness (Basic)**: If/when terrain features are added, AI should consider them (e.g., avoiding hazardous terrain, using cover if implemented).
* **Improved Target Prioritization**: More nuanced target selection (e.g., focusing fire, protecting key AI units, considering threat levels).

### 4.4. Advanced Features (Potential Future Scope)

* **Status Effects**: Implement conditions like poison, stun, burn, slow, haste, etc., with clear visual indicators and mechanical effects.
* **Saving/Loading Game State**: Allow players to save their progress and resume later.
* **Scenario/Campaign Management**: Ability to define and load different combat encounters, potentially as part of a larger campaign.
* **Character Progression**: Experience points, leveling up, improving stats, learning new abilities.
* **Inventory/Equipment**: System for characters to find and equip items that modify stats or grant abilities.
* **More Complex Action Types**: Actions that require charging, channelled abilities, reactions, or bonus actions from D&D.
* **Sound Effects & Music**: Adding audio feedback for actions, UI interactions, and background music.

### 4.5. Further Testing

* **Expand Test Coverage**: Write new unit and integration tests for any new features or abilities added.
* **Edge Case Testing**: Add more tests for unusual scenarios or edge cases in existing logic.
* **End-to-End (E2E) Testing**: If the project grows significantly, consider implementing E2E tests using browser automation tools (e.g., Playwright, Cypress) to test the full user experience from UI interaction to game logic resolution.

## 5. Asset Instructions Recap

* **Current Method**: Character and environment visuals are primarily programmatic placeholders (colored shapes, basic grid lines).
* **Future Integration of External Sprites (e.g., PNGs)**:
    1.  **Asset Preparation**: Create or acquire pixel art sprite sheets for characters (idle, move, attack animations) and environment tiles.
    2.  **Loading**: In `character.ts` or a dedicated asset loader, use `Image` objects to load sprite sheets.
    3.  **Rendering**: Modify `renderCharacter` (and potentially `renderGrid`) to draw portions (frames) of these loaded images onto the canvas using `ctx.drawImage()` with source (sx, sy, sWidth, sHeight) and destination (dx, dy, dWidth, dHeight) parameters.
    4.  **Animation**: Implement logic to cycle through frames in sprite sheets for character animations.
    5.  **Configuration**: Update `CharacterConfig` to include sprite sheet paths and animation frame data instead of simple color/symbol definitions.

