// src/tests/character.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    createCharacter,
    applyDamage,
    healCharacter,
    resetCharacterTurnActions,
    moveCharacter
} from '../character'; // Adjust path as needed
import { Character, GridPoint, CharacterType, GameAction, ActionType } from '../types';
import { PLAYER_WARRIOR_CONFIG, ENEMY_MELEE_CONFIG, rollDice as actualRollDice, GRID_COLS, GRID_ROWS } from '../config';
import { createGrid, GridTile, freeTile, occupyTile, getTile } from '../grid'; // For moveCharacter tests

// Mock rollDice from config, as createCharacter uses it for initiative
vi.mock('../config', async (importOriginal) => {
    const originalConfig = await importOriginal<typeof import('../config')>();
    return {
        ...originalConfig,
        rollDice: vi.fn(),
    };
});

const mockedRollDice = vi.mocked(actualRollDice);

describe('Character System', () => {
    let warrior: Character;
    let testGrid: GridTile[][];

    beforeEach(() => {
        mockedRollDice.mockReset();
        // Mock initiative roll for predictable character creation
        mockedRollDice.mockReturnValue(10); // Example: all characters roll 10 for initiative + bonus

        warrior = createCharacter(PLAYER_WARRIOR_CONFIG, { x: 2, y: 2 });

        // Reset warrior's stats to default for each test, as they might be modified
        warrior.stats.currentHp = PLAYER_WARRIOR_CONFIG.stats.maxHp;
        warrior.isAlive = true;
        warrior.canMove = true;
        warrior.canAct = true;

        testGrid = createGrid();
        // Place the warrior on the test grid for movement tests
        occupyTile(testGrid, warrior.position, warrior.id);
    });

    describe('createCharacter', () => {
        it('should create a character with correct initial stats and properties', () => {
            expect(warrior.name).toBe(PLAYER_WARRIOR_CONFIG.name);
            expect(warrior.type).toBe(CharacterType.PLAYER);
            expect(warrior.stats.maxHp).toBe(PLAYER_WARRIOR_CONFIG.stats.maxHp);
            expect(warrior.stats.currentHp).toBe(PLAYER_WARRIOR_CONFIG.stats.maxHp);
            expect(warrior.stats.ac).toBe(PLAYER_WARRIOR_CONFIG.stats.ac);
            expect(warrior.stats.speed).toBe(PLAYER_WARRIOR_CONFIG.stats.speed);
            expect(warrior.isAlive).toBe(true);
            expect(warrior.canMove).toBe(true);
            expect(warrior.canAct).toBe(true);
            expect(warrior.position).toEqual({ x: 2, y: 2 });
            // Initiative = 10 (mocked d20) + initiativeBonus (from config)
            expect(warrior.stats.initiative).toBe(10 + PLAYER_WARRIOR_CONFIG.stats.initiativeBonus);
            expect(warrior.actions.length).toBeGreaterThan(0);
            expect(warrior.actions.some(a => a.name === "Slash")).toBe(true);
            expect(warrior.actions.some(a => a.name === "Power Attack")).toBe(true);
        });

        it('should assign a unique ID to each character', () => {
            const mage = createCharacter(PLAYER_WARRIOR_CONFIG, { x: 3, y: 3 }); // Use same config for simplicity, name will differ
            expect(warrior.id).not.toBe(mage.id);
        });
    });

    describe('applyDamage', () => {
        it('should reduce currentHp by damage amount minus defense', () => {
            const damageAmount = 10;
            const defense = warrior.stats.defense; // Warrior's defense from config
            const expectedDamageTaken = Math.max(0, damageAmount - defense);

            const actualDamageTaken = applyDamage(warrior, damageAmount);

            expect(actualDamageTaken).toBe(expectedDamageTaken);
            expect(warrior.stats.currentHp).toBe(warrior.stats.maxHp - expectedDamageTaken);
            expect(warrior.isAlive).toBe(true);
        });

        it('should not let currentHp go below 0', () => {
            const massiveDamage = warrior.stats.maxHp + warrior.stats.defense + 20;
            applyDamage(warrior, massiveDamage);
            expect(warrior.stats.currentHp).toBe(0);
        });

        it('should set isAlive to false and targetable to false if currentHp reaches 0', () => {
            applyDamage(warrior, warrior.stats.maxHp + warrior.stats.defense); // Enough damage to defeat
            expect(warrior.stats.currentHp).toBe(0);
            expect(warrior.isAlive).toBe(false);
            expect(warrior.targetable).toBe(false);
        });

        it('should deal 0 damage if defense is greater than or equal to damage amount', () => {
            warrior.stats.defense = 15;
            const damageAmount = 10;
            const actualDamageTaken = applyDamage(warrior, damageAmount);

            expect(actualDamageTaken).toBe(0);
            expect(warrior.stats.currentHp).toBe(warrior.stats.maxHp);
        });
    });

    describe('healCharacter', () => {
        it('should increase currentHp by heal amount', () => {
            warrior.stats.currentHp = 10;
            const healAmount = 5;
            healCharacter(warrior, healAmount);
            expect(warrior.stats.currentHp).toBe(10 + healAmount);
        });

        it('should not let currentHp exceed maxHp', () => {
            warrior.stats.currentHp = warrior.stats.maxHp - 5;
            const healAmount = 10; // More than needed to reach max
            healCharacter(warrior, healAmount);
            expect(warrior.stats.currentHp).toBe(warrior.stats.maxHp);
        });

        it('should not revive a dead character (isAlive remains false)', () => {
            warrior.stats.currentHp = 0;
            warrior.isAlive = false;
            healCharacter(warrior, 10);
            expect(warrior.stats.currentHp).toBe(10); // HP can be restored
            expect(warrior.isAlive).toBe(false); // But isAlive status is not changed by healCharacter directly
        });
    });

    describe('resetCharacterTurnActions', () => {
        it('should set canMove and canAct to true for an alive character', () => {
            warrior.canMove = false;
            warrior.canAct = false;
            resetCharacterTurnActions(warrior);
            expect(warrior.canMove).toBe(true);
            expect(warrior.canAct).toBe(true);
        });

        it('should not change canMove and canAct for a dead character', () => {
            warrior.isAlive = false;
            warrior.canMove = false;
            warrior.canAct = false;
            resetCharacterTurnActions(warrior);
            expect(warrior.canMove).toBe(false);
            expect(warrior.canAct).toBe(false);
        });
    });

    describe('moveCharacter', () => {
        const initialPos: GridPoint = { x: 2, y: 2 }; // Warrior's starting pos

        beforeEach(() => {
            // Ensure warrior is at initialPos and grid reflects this
            warrior.position = { ...initialPos };
            // Clear grid and re-occupy
            testGrid = createGrid();
            occupyTile(testGrid, warrior.position, warrior.id);
            warrior.canMove = true; // Reset canMove for each move test
        });

        it('should update character position to newPosition', () => {
            const newPos: GridPoint = { x: 3, y: 3 };
            moveCharacter(warrior, newPos, testGrid);
            expect(warrior.position).toEqual(newPos);
        });

        it('should set canMove to false after moving', () => {
            moveCharacter(warrior, { x: 3, y: 3 }, testGrid);
            expect(warrior.canMove).toBe(false);
        });

        it('should update grid occupancy: old tile becomes unoccupied', () => {
            const oldTile = getTile(testGrid, initialPos.x, initialPos.y);
            expect(oldTile?.isOccupied).toBe(true);
            expect(oldTile?.occupyingCharacterId).toBe(warrior.id);

            moveCharacter(warrior, { x: 3, y: 3 }, testGrid);

            const updatedOldTile = getTile(testGrid, initialPos.x, initialPos.y);
            expect(updatedOldTile?.isOccupied).toBe(false);
            expect(updatedOldTile?.occupyingCharacterId).toBeUndefined();
        });

        it('should update grid occupancy: new tile becomes occupied by the character', () => {
            const newPos: GridPoint = { x: 4, y: 4 };
            const newTile = getTile(testGrid, newPos.x, newPos.y);
            expect(newTile?.isOccupied).toBe(false);

            moveCharacter(warrior, newPos, testGrid);

            const updatedNewTile = getTile(testGrid, newPos.x, newPos.y);
            expect(updatedNewTile?.isOccupied).toBe(true);
            expect(updatedNewTile?.occupyingCharacterId).toBe(warrior.id);
        });

        it('should handle moving to the same tile (no change in occupancy, canMove becomes false)', () => {
            const currentPos = { ...warrior.position };
            moveCharacter(warrior, currentPos, testGrid);

            expect(warrior.position).toEqual(currentPos);
            expect(warrior.canMove).toBe(false);
            const tile = getTile(testGrid, currentPos.x, currentPos.y);
            expect(tile?.isOccupied).toBe(true);
            expect(tile?.occupyingCharacterId).toBe(warrior.id);
        });
    });
});


