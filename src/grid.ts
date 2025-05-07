// src/grid.ts
import { GRID_ROWS, GRID_COLS, TILE_SIZE, MOVABLE_TILE_COLOR, ATTACKABLE_TILE_COLOR, SELECTED_TILE_COLOR, HOVER_TILE_COLOR } from './config';
import { GridTile, GridPoint, Character, GameState } from './types';

/**
 * Initializes the game grid.
 * Each tile is initially walkable and unoccupied.
 * @returns A 2D array of GridTile objects.
 */
export function createGrid(): GridTile[][] {
    const grid: GridTile[][] = [];
    for (let y = 0; y < GRID_ROWS; y++) {
        const row: GridTile[] = [];
        for (let x = 0; x < GRID_COLS; x++) {
            row.push({
                x,
                y,
                isOccupied: false,
                occupyingCharacterId: undefined,
                isWalkable: true, // By default, all tiles are walkable
                // terrain: TerrainType.GRASS, // Example if we add terrain
            });
        }
        grid.push(row);
    }
    return grid;
}

/**
 * Renders the grid lines on the canvas.
 * @param ctx The canvas rendering context.
 */
function drawGridLines(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)'; // Light lines for the grid
    ctx.lineWidth = 1;

    for (let y = 0; y <= GRID_ROWS; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * TILE_SIZE);
        ctx.lineTo(GRID_COLS * TILE_SIZE, y * TILE_SIZE);
        ctx.stroke();
    }

    for (let x = 0; x <= GRID_COLS; x++) {
        ctx.beginPath();
        ctx.moveTo(x * TILE_SIZE, 0);
        ctx.lineTo(x * TILE_SIZE, GRID_ROWS * TILE_SIZE);
        ctx.stroke();
    }
}

/**
 * Renders the base grid tiles (e.g., background colors, basic terrain).
 * @param ctx The canvas rendering context.
 * @param grid The game grid.
 */
function drawBaseTiles(ctx: CanvasRenderingContext2D, grid: GridTile[][]): void {
    for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
            // For now, a simple alternating checkerboard pattern for visual distinction
            if ((x + y) % 2 === 0) {
                ctx.fillStyle = "#3E4C59"; // Darker green/gray
            } else {
                ctx.fillStyle = "#4A5568"; // Lighter green/gray (like canvas bg)
            }
            ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            // TODO: Add terrain drawing if implemented
        }
    }
}


/**
 * Renders the entire game grid, including tiles and lines.
 * @param ctx The canvas rendering context.
 * @param gameState The current state of the game.
 */
export function renderGrid(ctx: CanvasRenderingContext2D, gameState: GameState): void {
    // Clear previous frame for the grid area
    // ctx.clearRect(0, 0, GRID_COLS * TILE_SIZE, GRID_ROWS * TILE_SIZE); // Done in main render loop

    drawBaseTiles(ctx, gameState.grid);
    drawGridLines(ctx);

    // TODO: Add rendering for highlighted tiles (movement, attack range) here
}

/**
 * Converts pixel coordinates (e.g., from a mouse click) to grid coordinates.
 * @param pixelX The x-coordinate in pixels.
 * @param pixelY The y-coordinate in pixels.
 * @returns A GridPoint representing the tile coordinates, or null if outside grid.
 */
export function pixelToGridCoords(pixelX: number, pixelY: number): GridPoint | null {
    const gridX = Math.floor(pixelX / TILE_SIZE);
    const gridY = Math.floor(pixelY / TILE_SIZE);

    if (gridX >= 0 && gridX < GRID_COLS && gridY >= 0 && gridY < GRID_ROWS) {
        return { x: gridX, y: gridY };
    }
    return null; // Click was outside the grid
}

/**
 * Gets a tile at specific grid coordinates.
 * @param grid The game grid.
 * @param x The x-coordinate.
 * @param y The y-coordinate.
 * @returns The GridTile object or undefined if out of bounds.
 */
export function getTile(grid: GridTile[][], x: number, y: number): GridTile | undefined {
    if (grid[y] && grid[y][x]) {
        return grid[y][x];
    }
    return undefined;
}

/**
 * Checks if a given grid coordinate is within the bounds of the grid.
 * @param p The GridPoint to check.
 * @returns True if the point is within bounds, false otherwise.
 */
export function isWithinGrid(p: GridPoint): boolean {
    return p.x >= 0 && p.x < GRID_COLS && p.y >= 0 && p.y < GRID_ROWS;
}

/**
 * Updates the grid to mark a tile as occupied by a character.
 * @param grid The game grid.
 * @param position The position to occupy.
 * @param characterId The ID of the character occupying the tile.
 */
export function occupyTile(grid: GridTile[][], position: GridPoint, characterId: string): void {
    const tile = getTile(grid, position.x, position.y);
    if (tile) {
        tile.isOccupied = true;
        tile.occupyingCharacterId = characterId;
    }
}

/**
 * Updates the grid to mark a tile as unoccupied.
 * @param grid The game grid.
 * @param position The position to free.
 */
export function freeTile(grid: GridTile[][], position: GridPoint): void {
    const tile = getTile(grid, position.x, position.y);
    if (tile) {
        tile.isOccupied = false;
        tile.occupyingCharacterId = undefined;
    }
}

/**
 * Finds characters within a certain range of a given point.
 * @param center The center point of the range.
 * @param range The range in grid units.
 * @param characters The list of all characters.
 * @param includeCenter Whether to include a character at the center point.
 * @returns An array of characters within the specified range.
 */
export function findCharactersInRange(
    center: GridPoint,
    range: number,
    characters: Character[],
    includeCenter: boolean = false
): Character[] {
    const charactersInRange: Character[] = [];
    for (const char of characters) {
        if (!char.isAlive) continue;

        const distance = Math.abs(char.position.x - center.x) + Math.abs(char.position.y - center.y); // Manhattan distance
        
        if (distance === 0 && !includeCenter) continue;

        if (distance <= range) {
            charactersInRange.push(char);
        }
    }
    return charactersInRange;
}


/**
 * Highlights tiles on the canvas based on their purpose (movable, attackable, etc.).
 * @param ctx Canvas rendering context.
 * @param tilesToHighlight Array of GridPoints to highlight.
 * @param color The color to use for highlighting.
 */
export function highlightTiles(ctx: CanvasRenderingContext2D, tilesToHighlight: GridPoint[], color: string): void {
    ctx.fillStyle = color;
    tilesToHighlight.forEach(tilePos => {
        ctx.fillRect(
            tilePos.x * TILE_SIZE,
            tilePos.y * TILE_SIZE,
            TILE_SIZE,
            TILE_SIZE
        );
    });
}

/**
 * Calculates reachable tiles for movement from a starting point.
 * This is a simple implementation that doesn't consider obstacles other than grid boundaries.
 * A more advanced version would use pathfinding like A* or BFS.
 * @param startPos The starting position.
 * @param range The movement range.
 * @param grid The game grid.
 * @param characters All characters (to check for occupied tiles).
 * @returns An array of GridPoints representing reachable tiles.
 */
export function getReachableTiles(startPos: GridPoint, range: number, grid: GridTile[][], characters: Character[]): GridPoint[] {
    const reachable: GridPoint[] = [];
    const queue: { point: GridPoint; dist: number }[] = [{ point: startPos, dist: 0 }];
    const visited: Set<string> = new Set([`${startPos.x},${startPos.y}`]);

    while (queue.length > 0) {
        const current = queue.shift()!;
        
        // Add to reachable if it's not the start position itself (unless range is 0)
        if (current.dist > 0) {
             reachable.push(current.point);
        }

        if (current.dist < range) {
            const neighbors = [
                { x: current.point.x + 1, y: current.point.y },
                { x: current.point.x - 1, y: current.point.y },
                { x: current.point.x, y: current.point.y + 1 },
                { x: current.point.x, y: current.point.y - 1 },
            ];

            for (const neighbor of neighbors) {
                const visitedKey = `${neighbor.x},${neighbor.y}`;
                if (isWithinGrid(neighbor) && !visited.has(visitedKey)) {
                    const tile = getTile(grid, neighbor.x, neighbor.y);
                    // Tile must be walkable and not occupied by another character
                    if (tile && tile.isWalkable && (!tile.isOccupied || (tile.occupyingCharacterId && characters.find(c => c.id === tile.occupyingCharacterId && c.position.x === startPos.x && c.position.y === startPos.y )))) {
                        visited.add(visitedKey);
                        queue.push({ point: neighbor, dist: current.dist + 1 });
                    }
                }
            }
        }
    }
    return reachable;
}

/**
 * Gets all tiles within a certain radius that can be targeted for an action (e.g., attack).
 * This doesn't necessarily mean they are occupied, just that they are in range.
 * @param startPos The starting position of the action user.
 * @param range The action's range.
 * @param grid The game grid.
 * @returns An array of GridPoints representing targetable tiles.
 */
export function getTargetableTiles(startPos: GridPoint, range: number, grid: GridTile[][]): GridPoint[] {
    const targetable: GridPoint[] = [];
    for (let y = 0; y < GRID_ROWS; y++) {
        for (let x = 0; x < GRID_COLS; x++) {
            const distance = Math.abs(x - startPos.x) + Math.abs(y - startPos.y); // Manhattan distance
            if (distance > 0 && distance <= range) { // distance > 0 so character cannot target self unless intended
                targetable.push({ x, y });
            }
        }
    }
    return targetable;
}


