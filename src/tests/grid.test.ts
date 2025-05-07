// src/tests/grid.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
    createGrid,
    pixelToGridCoords,
    getTile,
    isWithinGrid,
    occupyTile,
    freeTile,
    findCharactersInRange,
    getReachableTiles,
    getTargetableTiles
} from '../grid'; // Adjust path as needed
import { GridTile, GridPoint, Character, CharacterType } from '../types';
import { GRID_ROWS, GRID_COLS, TILE_SIZE } from '../config'; // For checking dimensions and tile size

// Minimal mock character for testing purposes
const createMockCharacter = (id: string, position: GridPoint, isAlive: boolean = true): Character => ({
    id,
    name: `MockChar-${id}`,
    type: CharacterType.PLAYER, // Type doesn't matter much for these grid tests
    stats: { maxHp: 10, currentHp: 10, attackPower: 1, defense: 1, ac: 10, speed: 4, initiative: 10 },
    position,
    sprite: { color: 'red' },
    isAlive,
    canMove: true,
    canAct: true,
    targetable: isAlive,
    actions: [],
});

describe('Grid System', () => {
    let grid: GridTile[][];

    beforeEach(() => {
        grid = createGrid();
    });

    describe('createGrid', () => {
        it('should create a grid with correct dimensions', () => {
            expect(grid.length).toBe(GRID_ROWS);
            expect(grid[0].length).toBe(GRID_COLS);
        });

        it('should initialize tiles as walkable and unoccupied', () => {
            for (let y = 0; y < GRID_ROWS; y++) {
                for (let x = 0; x < GRID_COLS; x++) {
                    const tile = grid[y][x];
                    expect(tile.x).toBe(x);
                    expect(tile.y).toBe(y);
                    expect(tile.isOccupied).toBe(false);
                    expect(tile.occupyingCharacterId).toBeUndefined();
                    expect(tile.isWalkable).toBe(true);
                }
            }
        });
    });

    describe('pixelToGridCoords', () => {
        it('should convert pixel coordinates to grid coordinates correctly', () => {
            // TILE_SIZE is 48
            expect(pixelToGridCoords(0, 0)).toEqual({ x: 0, y: 0 });
            expect(pixelToGridCoords(TILE_SIZE - 1, TILE_SIZE - 1)).toEqual({ x: 0, y: 0 });
            expect(pixelToGridCoords(TILE_SIZE, TILE_SIZE)).toEqual({ x: 1, y: 1 });
            expect(pixelToGridCoords(50, 50)).toEqual({ x: 1, y: 1 }); // 50/48 = 1.04... floor to 1
            expect(pixelToGridCoords(TILE_SIZE * (GRID_COLS -1) + 10, TILE_SIZE * (GRID_ROWS-1) + 10 )).toEqual({ x: GRID_COLS-1, y: GRID_ROWS-1});
        });

        it('should return null for out-of-bounds pixel coordinates', () => {
            expect(pixelToGridCoords(-10, 10)).toBeNull();
            expect(pixelToGridCoords(10, -10)).toBeNull();
            expect(pixelToGridCoords(GRID_COLS * TILE_SIZE + 1, 10)).toBeNull();
            expect(pixelToGridCoords(10, GRID_ROWS * TILE_SIZE + 1)).toBeNull();
        });
    });

    describe('getTile', () => {
        it('should return the correct tile for valid coordinates', () => {
            const tile = getTile(grid, 1, 1);
            expect(tile).toBeDefined();
            expect(tile?.x).toBe(1);
            expect(tile?.y).toBe(1);
        });

        it('should return undefined for out-of-bounds coordinates', () => {
            expect(getTile(grid, -1, 0)).toBeUndefined();
            expect(getTile(grid, 0, -1)).toBeUndefined();
            expect(getTile(grid, GRID_COLS, 0)).toBeUndefined();
            expect(getTile(grid, 0, GRID_ROWS)).toBeUndefined();
        });
    });

    describe('isWithinGrid', () => {
        it('should return true for points within grid boundaries', () => {
            expect(isWithinGrid({ x: 0, y: 0 })).toBe(true);
            expect(isWithinGrid({ x: GRID_COLS - 1, y: GRID_ROWS - 1 })).toBe(true);
            expect(isWithinGrid({ x: 5, y: 5 })).toBe(true); // Assuming 10x10 grid
        });

        it('should return false for points outside grid boundaries', () => {
            expect(isWithinGrid({ x: -1, y: 0 })).toBe(false);
            expect(isWithinGrid({ x: 0, y: -1 })).toBe(false);
            expect(isWithinGrid({ x: GRID_COLS, y: 0 })).toBe(false);
            expect(isWithinGrid({ x: 0, y: GRID_ROWS })).toBe(false);
        });
    });

    describe('occupyTile and freeTile', () => {
        const testPos: GridPoint = { x: 3, y: 3 };
        const charId = 'char123';

        it('occupyTile should mark a tile as occupied with characterId', () => {
            occupyTile(grid, testPos, charId);
            const tile = getTile(grid, testPos.x, testPos.y);
            expect(tile?.isOccupied).toBe(true);
            expect(tile?.occupyingCharacterId).toBe(charId);
        });

        it('freeTile should mark an occupied tile as unoccupied', () => {
            occupyTile(grid, testPos, charId); // First occupy
            freeTile(grid, testPos);
            const tile = getTile(grid, testPos.x, testPos.y);
            expect(tile?.isOccupied).toBe(false);
            expect(tile?.occupyingCharacterId).toBeUndefined();
        });
    });

    describe('findCharactersInRange', () => {
        const center: GridPoint = { x: 5, y: 5 };
        const char1 = createMockCharacter('char1', { x: 5, y: 5 }); // At center
        const char2 = createMockCharacter('char2', { x: 6, y: 5 }); // Range 1
        const char3 = createMockCharacter('char3', { x: 3, y: 5 }); // Range 2
        const char4 = createMockCharacter('char4', { x: 7, y: 8 }); // Range 5 (2 hor, 3 ver)
        const char5Dead = createMockCharacter('char5', { x: 5, y: 6 }, false); // Range 1, but dead
        const characters: Character[] = [char1, char2, char3, char4, char5Dead];

        it('should find characters within the specified Manhattan distance', () => {
            const found = findCharactersInRange(center, 1, characters);
            expect(found).toContain(char2);
            expect(found).not.toContain(char1); // Not including center by default
            expect(found).not.toContain(char3);
            expect(found).not.toContain(char5Dead); // Dead characters should be ignored
            expect(found.length).toBe(1);
        });

        it('should include the center character if includeCenter is true', () => {
            const found = findCharactersInRange(center, 1, characters, true);
            expect(found).toContain(char1);
            expect(found).toContain(char2);
            expect(found.length).toBe(2);
        });

        it('should find characters at various ranges', () => {
            const foundRange2 = findCharactersInRange(center, 2, characters);
            expect(foundRange2).toContain(char2); // x:6,y:5 (dist 1)
            expect(foundRange2).toContain(char3); // x:3,y:5 (dist 2)
            expect(foundRange2.length).toBe(2);

            const foundRange5 = findCharactersInRange(center, 5, characters);
            expect(foundRange5).toContain(char2);
            expect(foundRange5).toContain(char3);
            expect(foundRange5).toContain(char4); // x:7,y:8, center:5,5. dx=2, dy=3. dist=5
            expect(foundRange5.length).toBe(3);
        });

        it('should return an empty array if no characters are in range', () => {
            const found = findCharactersInRange({ x: 0, y: 0 }, 1, characters);
            expect(found.length).toBe(0);
        });

        it('should not include dead characters', () => {
            const found = findCharactersInRange(center, 1, characters, true); // include center, range 1
            expect(found).not.toContain(char5Dead);
            const aliveCountInRange1PlusCenter = characters.filter(c => c.isAlive && (Math.abs(c.position.x - center.x) + Math.abs(c.position.y - center.y) <= 1)).length;
            expect(found.length).toBe(aliveCountInRange1PlusCenter); // char1, char2
        });
    });

    describe('getReachableTiles', () => {
        const startPos: GridPoint = { x: 1, y: 1 };
        let emptyCharList: Character[] = [];
        let charAtStart: Character[];

        beforeEach(() => {
            grid = createGrid(); // Fresh grid for each pathfinding test
            emptyCharList = [];
            const mockChar = createMockCharacter('mover', startPos);
            charAtStart = [mockChar];
            occupyTile(grid, startPos, mockChar.id); // Occupy start for realistic scenario
        });

        it('should find all tiles within range in open space', () => {
            // Range 1 from (1,1) -> (0,1), (2,1), (1,0), (1,2)
            const reachable = getReachableTiles(startPos, 1, grid, charAtStart);
            expect(reachable.length).toBe(4);
            expect(reachable).toEqual(expect.arrayContaining([
                { x: 0, y: 1 }, { x: 2, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 2 }
            ]));
        });

        it('should respect movement range', () => {
            // Range 2 from (1,1)
            // dist 1: (0,1), (2,1), (1,0), (1,2) - 4 tiles
            // dist 2: (0,0), (0,2), (2,0), (2,2), (1,-1)X, (1,3), (-1,1)X, (3,1)
            // (1,1) -> (1,3), (3,1), (0,0), (0,2), (2,0), (2,2)
            // Plus the 4 at dist 1. Total = 4 (dist 1) + 8 (dist 2, corners and straights) = 12
            const reachable = getReachableTiles(startPos, 2, grid, charAtStart);
            // Corrected assertion: Expect 10 reachable tiles for range 2 (excluding start)
            expect(reachable.length).toBe(10); // (0,1),(2,1),(1,0),(1,2) | (0,0),(0,2),(2,0),(2,2),(1,3),(3,1)
                                            // (0,0) (1,0) (2,0)
                                            // (0,1)       (2,1)
                                            // (0,2) (1,2) (2,2)
                                            // (1,3) (3,1)
            // Corrected: BFS explores layer by layer.
            // Dist 1: (0,1), (2,1), (1,0), (1,2) - 4 tiles
            // From these, Dist 2:
            // From (0,1): (0,0), (0,2) ((-1,1)X, (1,1)S)
            // From (2,1): (2,0), (2,2) (((1,1)S, (3,1))
            // From (1,0): (0,0), (2,0) (((1,-1)X, (1,1)S)
            // From (1,2): (0,2), (2,2) (((1,1)S, (1,3))
            // Unique at dist 2: (0,0), (0,2), (2,0), (2,2), (1,3), (3,1) (if within grid)
            // Assuming GRID_COLS/ROWS are >= 4 for (3,1) and (1,3) to be valid
            // (0,0), (0,2), (2,0), (2,2) are 4. (1,3), (3,1) are 2 more if grid is large enough.
            // Total = 4 (dist 1) + 4 (cardinal dist 2) + 4 (diag dist 2) = 12.
            // My manual calculation was off. The BFS explores correctly.
            // For range 2:
            // (0,1), (2,1), (1,0), (1,2) - 4 tiles
            // (0,0), (2,0), (0,2), (2,2) - 4 tiles (diagonals from start, or straight from dist 1)
            // (1,3), (3,1) - 2 tiles (straight from dist 1, if grid large enough)
            // (-1,0)X, (0,-1)X etc.
            // Total for range 2 from (1,1) on a large enough grid is 4 (dist 1) + 6 (dist 2) = 10 tiles (Manhattan distance).
            // The test grid is 10x10. (3,1) and (1,3) are valid.
            expect(reachable.length).toBe(10);
        });

        it('should be constrained by grid boundaries', () => {
            const cornerStart: GridPoint = { x: 0, y: 0 };
            occupyTile(grid, cornerStart, 'cornerChar');
            const reachable = getReachableTiles(cornerStart, 1, grid, [createMockCharacter('c', cornerStart)]);
            // From (0,0), range 1 -> (1,0), (0,1)
            expect(reachable.length).toBe(2);
            expect(reachable).toEqual(expect.arrayContaining([{ x: 1, y: 0 }, { x: 0, y: 1 }]));
        });

        it('should not find path through unwalkable tiles (if implemented, currently all walkable)', () => {
            // This test would require making a tile unwalkable
            const tileToBlock = getTile(grid, startPos.x + 1, startPos.y);
            if (tileToBlock) tileToBlock.isWalkable = false;

            const reachable = getReachableTiles(startPos, 2, grid, charAtStart);
            // Expected: (1,2) should be blocked if range is 2 and (1,1) -> (1,2) is the only path.
            // This needs more careful setup if we want to test specific path blocking.
            // For now, this test is more of a placeholder for future terrain.
            // With (2,1) blocked from (1,1), range 1 gives: (0,1), (1,0), (1,2)
            expect(getReachableTiles(startPos, 1, grid, charAtStart)).not.toContainEqual({ x: startPos.x + 1, y: startPos.y });
            if (tileToBlock) tileToBlock.isWalkable = true; // reset
        });

        it('should not allow moving onto tiles occupied by OTHER characters', () => {
            const otherCharPos: GridPoint = { x: 2, y: 1 }; // Next to startPos (1,1)
            const otherChar = createMockCharacter('other', otherCharPos);
            occupyTile(grid, otherCharPos, otherChar.id);
            const characters = [createMockCharacter('mover', startPos), otherChar];

            const reachable = getReachableTiles(startPos, 1, grid, characters);
            // From (1,1), range 1: (0,1), (1,0), (1,2). (2,1) is blocked.
            expect(reachable.length).toBe(3);
            expect(reachable).not.toContainEqual(otherCharPos);
            expect(reachable).toEqual(expect.arrayContaining([
                { x: 0, y: 1 }, { x: 1, y: 0 }, { x: 1, y: 2 }
            ]));
        });

         it('should return empty array if range is 0', () => {
            const reachable = getReachableTiles(startPos, 0, grid, charAtStart);
            expect(reachable.length).toBe(0);
        });
    });

    describe('getTargetableTiles', () => {
        const startPos: GridPoint = { x: 5, y: 5 };

        it('should get all tiles within range, excluding startPos', () => {
            const range = 1;
            // Expected: (4,5), (6,5), (5,4), (5,6)
            const targetable = getTargetableTiles(startPos, range, grid);
            expect(targetable.length).toBe(4);
            expect(targetable).toEqual(expect.arrayContaining([
                { x: 4, y: 5 }, { x: 6, y: 5 }, { x: 5, y: 4 }, { x: 5, y: 6 }
            ]));
            expect(targetable).not.toContainEqual(startPos);
        });

        it('should handle range 0 (empty array)', () => {
            const targetable = getTargetableTiles(startPos, 0, grid);
            expect(targetable.length).toBe(0);
        });

        it('should respect grid boundaries', () => {
            const cornerStart: GridPoint = { x: 0, y: 0 };
            const targetable = getTargetableTiles(cornerStart, 1, grid);
            // Expected: (1,0), (0,1)
            expect(targetable.length).toBe(2);
            expect(targetable).toEqual(expect.arrayContaining([{ x: 1, y: 0 }, { x: 0, y: 1 }]));
        });

        it('should return correct number of tiles for a larger range', () => {
            const range = 2; // Manhattan distance
            // dist 1: 4 tiles
            // dist 2 (cardinal from dist 1, or diagonal from start): 8 tiles
            // Total = 4 + 8 = 12
            const targetable = getTargetableTiles(startPos, range, grid);
            expect(targetable.length).toBe(12);
        });
    });
});
