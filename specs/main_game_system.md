# Specification: Main Game Orchestration & Turn Management System

## 1. Intent

The Main Game Orchestration & Turn Management System (`main.ts`) serves as the central nervous system of the game. Its primary intent is to:

* Initialize and set up all game components and data structures.
* Manage the overall game state, including the list of characters, the game grid, and turn progression.
* Control the main game loop, orchestrating rendering updates and game logic execution.
* Handle player input (mouse clicks on the canvas and UI buttons) and translate these into game actions.
* Manage the sequence of turns, ensuring characters act in the correct order based on initiative.
* Orchestrate AI turns by invoking the AI System.
* Determine and announce win/loss conditions.
* Interface with the UI System to display game information and feedback to the player.

This module ties all other systems together to create a playable game experience.

## 2. Module Responsibility

The `main.ts` module is responsible for:

* **Game Initialization (`initializeGame`)**:
    * Setting up the HTML5 canvas and its rendering context.
    * Creating the initial `GameState` object.
    * Instantiating player and enemy characters (using `character.ts` and configurations from `config.ts`) and placing them on the grid (using `grid.ts`).
    * Calculating the initial turn order based on character initiative.
    * Setting up UI elements and event listeners (delegating to `ui.ts` for UI setup, and managing its own canvas/input listeners).
    * Starting the main game loop.
* **Game State Management**:
    * Holding the central `GameState` object which includes all characters, the grid, turn order, current turn index, active character, selected character/action by the player, and combat status.
    * Modifying this state based on game events and actions.
* **Main Game Loop (`gameLoop`)**:
    * Continuously clearing and re-rendering the game canvas at a regular interval (using `requestAnimationFrame`).
    * Calling rendering functions for the grid (`renderGrid`) and characters (`renderCharacter`).
    * Rendering visual effects (e.g., damage numbers, "Miss" text).
* **Turn Management**:
    * `startTurn`: Initiating a turn for the currently active character. This includes resetting their action flags (`canMove`, `canAct`) and determining if it's a player or AI turn.
    * `endTurn`: Concluding the current character's turn, advancing to the next character in the `turnOrder`, and checking for win/loss conditions.
    * `processEnemyActionPhase`: Orchestrating an AI character's turn by repeatedly calling `getEnemyAIAction` (from `ai.ts`) if the AI can perform multiple sub-actions (e.g., move then act).
* **Player Input Handling**:
    * `handleCanvasClick`: Interpreting mouse clicks on the game canvas to select characters, choose movement destinations, or target actions.
    * `handleCanvasMouseMove`: Tracking mouse movements for hover effects on grid tiles.
    * `handleActionButtonClick`: Responding to clicks on UI buttons (Move, Attack, Special Ability, End Turn) to set the player's intended action or end their turn.
* **Action Execution**:
    * `performAttack`, `performSpecialAbility`: These functions are called when a character (player or AI) commits to an offensive action. They:
        * Validate if the character can perform the action.
        * Call `processAttack` (from `combat.ts`) to resolve the action.
        * Update the character's `canAct` status.
        * Trigger UI updates and check win/loss conditions.
    * Orchestrating character movement by calling `moveCharacter` (from `character.ts`) and updating the `canMove` status.
* **Win/Loss Condition Checking (`checkWinLossConditions`)**:
    * Evaluating if all player characters or all enemy characters have been defeated.
    * Updating the `isCombatOver` and `winner` flags in the `GameState`.
    * Triggering the display of a win/loss message via the UI System.
* **Interfacing with UI (`ui.ts`)**:
    * Calling UI functions to update character displays, the action log, turn indicators, and action button states.
    * Managing the display of game messages (e.g., win/loss modal).
* **Visual Effect Management**:
    * Maintaining a list of active `VisualEffect` objects.
    * Providing an `addVisualEffect` function (called by `combat.ts`) to queue new effects.
    * Updating and rendering these effects in the `gameLoop`.

## 3. Key Concepts & Design Considerations

* **Central Orchestrator**: `main.ts` acts as the conductor, coordinating the activities of all other game systems.
* **Game State as Single Source of Truth**: The `gameState` object within `main.ts` is intended to be the definitive record of the current state of the game. Other modules operate on or read from this state.
* **Event-Driven (Player Input)**: Player actions are primarily driven by events (clicks). The module translates these events into game logic.
* **Turn-Based Flow**: The core logic revolves around a strict sequence of turns, with characters acting one after another.
* **Action Economy Enforcement**: `main.ts` is responsible for ensuring that characters adhere to the "one move, one standard action" rule by checking and updating `canMove` and `canAct` flags on characters.
* **Decoupling of Logic and Rendering**: While `main.ts` calls rendering functions, the actual drawing logic resides in `grid.ts` and `character.ts`. Similarly, combat resolution is delegated to `combat.ts`.
* **AI Turn Simulation**: AI turns are managed with `setTimeout` to introduce slight delays for readability and to allow for a multi-step AI turn (e.g., move, then re-evaluate for an attack).
* **Testability Hooks**: For integration testing, `main.ts` exports its `gameState` (or a getter for it) and key handler functions, allowing tests to simulate game flow and verify state changes.

## 4. Relation to Other Modules

* **`grid.ts`**: `main.ts` initializes the grid, uses its spatial query functions for player actions, and calls its render function.
* **`character.ts`**: `main.ts` creates characters, calls their render function, and invokes their state modification functions (move, apply damage indirectly via combat, reset turn actions).
* **`combat.ts`**: `main.ts` calls `processAttack` to resolve combat when an attack action is performed.
* **`ai.ts`**: `main.ts` calls `getEnemyAIAction` to get an AI character's decision and then executes that decision.
* **`ui.ts`**: `main.ts` calls functions in `ui.ts` to update all visual information presented to the player outside of the main game canvas.
* **`config.ts`**: `main.ts` uses character and grid configurations from `config.ts` during game initialization.
* **`types.ts`**: `main.ts` heavily uses the interfaces and enums defined in `types.ts` to structure its `GameState` and manage game entities.

## 5. Future Considerations / Potential Enhancements

* **More Sophisticated Game Loop**: Potentially separating update logic from rendering logic for fixed timesteps or more advanced loop management.
* **State Management Pattern**: For larger games, a more formal state management pattern (like Redux, Zustand, or an Entity-Component-System architecture) might be considered instead of a single monolithic `GameState` object managed directly by `main.ts`.
* **Event System**: Implementing a global event bus could help decouple modules further, allowing systems to react to game events without direct calls from `main.ts`.
* **Saving/Loading Game State**: Adding functionality to serialize and deserialize the `GameState` to allow players to save and resume games.
* **Scenario Management**: Loading different combat scenarios with varying character setups, grid layouts, and objectives.
* **Input Abstraction**: Creating a more abstract input layer rather than directly handling raw mouse events in `main.ts`, which could facilitate adding keyboard controls or gamepad support.
* **Animation System Integration**: If more complex animations are added, `main.ts` would need to coordinate with an animation system during the render loop.

