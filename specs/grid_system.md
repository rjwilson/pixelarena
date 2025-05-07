# Specification: Grid System

## 1. Intent

The Grid System is the foundational spatial framework for the turn-based combat game. Its primary intent is to:

* Define the playable area and its discrete units (tiles).
* Manage character positioning and movement constraints.
* Provide a basis for determining range, line of sight (future), and area of effects for actions and abilities.
* Facilitate user interaction by translating screen coordinates (e.g., mouse clicks) to game world coordinates.

The system aims for clarity and simplicity in this prototype phase, using a 2D Cartesian coordinate system.

## 2. Module Responsibility

The Grid System module (`grid.ts`) is responsible for:

* **Grid Creation & Initialization**: Generating the 2D array of `GridTile` objects that represents the game map, based on configured dimensions (rows, columns). Each tile is initialized with default properties (e.g., coordinates, walkability, occupancy status).
* **Tile State Management**: Tracking the state of individual tiles, specifically:
    * `isOccupied`: Whether a character is currently on the tile.
    * `occupyingCharacterId`: The ID of the character on the tile, if any.
    * `isWalkable`: Whether a character can normally move onto or through this tile (currently all tiles are walkable by default).
* **Coordinate Conversion**: Providing utility functions to convert between pixel-based screen coordinates (e.g., from mouse events) and grid-based tile coordinates (`pixelToGridCoords`).
* **Spatial Queries & Calculations**:
    * Determining reachable tiles for character movement based on starting position, movement speed, and tile walkability/occupancy (`getReachableTiles`). This currently uses a Breadth-First Search (BFS) approach.
    * Determining targetable tiles within a given range for actions/abilities (`getTargetableTiles`), typically using Manhattan distance.
    * Finding characters within a specified range of a point (`findCharactersInRange`).
* **Grid Rendering (Base)**: Drawing the basic visual representation of the grid (tile backgrounds, grid lines) onto the HTML5 canvas. Highlighting specific tiles (e.g., for movement, attack range) is also managed here, though the decision of *which* tiles to highlight comes from other modules (like `main.ts` based on player selection).

## 3. Key Concepts & Design Considerations

* **Tile-Based Structure**: The game world is discretized into uniform tiles. This simplifies many aspects of tactical combat, such as movement, range calculation, and area-of-effect targeting.
* **Manhattan Distance**: For simplicity in range calculations (e.g., `getTargetableTiles`, `findCharactersInRange`), Manhattan distance (`abs(dx) + abs(dy)`) is used. This is common in grid-based games and is computationally inexpensive.
* **Simplified Walkability**: Currently, all tiles are initialized as `isWalkable`. The `getReachableTiles` function primarily considers grid boundaries and occupancy by *other* characters as movement constraints. Future enhancements could introduce different terrain types with varying movement costs or impassable obstacles.
* **Occupancy**: A tile can be occupied by at most one character. This is a standard simplification for tactical RPGs.
* **Separation of Concerns**:
    * The grid module itself does not know about game turns or specific character actions. It provides spatial information and utilities.
    * The rendering of characters *on* the grid is handled by the Character System and orchestrated by the Main Game module, though the grid provides their `x,y` coordinates.
    * The decision logic for *what* to do with grid information (e.g., initiating a move, resolving an attack) resides in higher-level modules.
* **Pathfinding**: `getReachableTiles` implements a basic BFS for finding valid movement destinations. For more complex maps with obstacles or varied terrain costs, a more advanced pathfinding algorithm like A* would be necessary.
* **Static Grid**: The grid dimensions and properties (like walkability of base tiles) are currently static, defined at game initialization. Dynamic environments or destructible terrain are outside the current scope.

## 4. Relation to Other Modules

* **`main.ts` (Main Game Orchestration)**:
    * Calls `createGrid` during game setup.
    * Uses `pixelToGridCoords` to interpret player input on the canvas.
    * Calls `renderGrid` in the main game loop.
    * Uses `getReachableTiles` and `getTargetableTiles` to determine valid player actions and highlight appropriate tiles on the canvas.
    * Updates tile occupancy when characters move.
* **`character.ts` (Character System)**:
    * Characters have a `position` (GridPoint) managed by the grid.
    * `moveCharacter` function updates a character's position and calls `occupyTile` and `freeTile` on the grid.
* **`ai.ts` (AI System)**:
    * Uses `getReachableTiles` to plan movement.
    * Uses `findCharactersInRange` and `getTargetableTiles` to identify potential targets for actions.
* **`config.ts`**: Provides constants for grid dimensions (`GRID_ROWS`, `GRID_COLS`) and tile rendering size (`TILE_SIZE`).

## 5. Future Considerations / Potential Enhancements

* **Varied Terrain**: Introduce different tile types (e.g., difficult terrain, obstacles, cover) that affect movement cost, walkability, or provide defensive bonuses.
* **Line of Sight (LOS)**: Implement LOS calculations for ranged attacks and abilities.
* **Z-Axis/Height**: For more complex 3D-like tactics, a concept of height or multiple layers could be added.
* **Dynamic Grid Elements**: Interactive elements on the grid (e.g., traps, destructible objects).
* **Advanced Pathfinding**: Integration of A* for more optimal pathfinding on complex maps.

