// src/tests/combat.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { processAttack, AttackResult } from '../combat'; // Adjust path as needed
import { Character, GameAction, CharacterType, ActionType, GridPoint, CharacterStats, VisualEffect } from '../types';
import { PLAYER_WARRIOR_CONFIG, ENEMY_MELEE_CONFIG, rollDice as actualRollDice } from '../config'; // Import actual rollDice
import { createCharacter } from '../character'; // To create test characters

// Mock the rollDice function from config to control dice outcomes for tests
// We need to be careful here. If combat.ts imports rollDice directly, this mock works.
// If combat.ts gets rollDice passed in or from another source, the mock strategy changes.
// Assuming combat.ts imports it from config.ts:
vi.mock('../config', async (importOriginal) => {
    const originalConfig = await importOriginal<typeof import('../config')>();
    return {
        ...originalConfig, // Spread original config to keep other exports
        rollDice: vi.fn(), // Mock rollDice
    };
});

// Mock addVisualEffect, as we are testing combat logic, not rendering
const mockAddVisualEffect = vi.fn();

describe('Combat System - processAttack', () => {
    let attacker: Character;
    let target: Character;
    let basicAttackAction: GameAction;
    let powerAttackAction: GameAction;

    // Get the mocked rollDice to control its return values in tests
    const mockedRollDice = vi.mocked(actualRollDice, { partial: false }); // Use the imported actualRollDice for type safety with vi.mocked

    beforeEach(() => {
        // Reset mocks before each test
        mockedRollDice.mockReset();
        mockAddVisualEffect.mockClear();

        // Setup attacker (Warrior)
        const warriorConfig = { ...PLAYER_WARRIOR_CONFIG };
        // Override initiative for predictability if needed, though not relevant for processAttack
        attacker = createCharacter(warriorConfig, { x: 0, y: 0 });
        attacker.stats.attackPower = 5; // From config, but explicit for clarity
        attacker.stats.ac = 16;
        attacker.stats.currentHp = warriorConfig.stats.maxHp;
        attacker.isAlive = true;

        // Setup target (Goblin Grunt)
        const goblinConfig = { ...ENEMY_MELEE_CONFIG };
        target = createCharacter(goblinConfig, { x: 1, y: 0 });
        target.stats.ac = 13; // From config
        target.stats.defense = 2; // From config
        target.stats.currentHp = goblinConfig.stats.maxHp;
        target.isAlive = true;

        // Define actions based on attacker's created actions
        basicAttackAction = attacker.actions.find(a => a.name === "Slash")!;
        powerAttackAction = attacker.actions.find(a => a.name === "Power Attack")!;

        // Ensure actions have damage functions that use our mocked rollDice
        // The createCharacter function already sets up damage functions that internally call rollDice.
        // So, when mockedRollDice is controlled, their damage output is controlled.
    });

    it('should register a HIT when total attack roll meets target AC', () => {
        // Attacker (Warrior) AC 16, AP 7. Target (Goblin) AC 13, Def 2.
        // Slash action: damage() => rollDice(6) + attacker.stats.attackPower (which is 7 for Warrior)
        // Let's say d20 rolls 10. Warrior base attack bonus = 0 for simplicity here.
        // Total attack roll = 10. Target AC = 13. 10 < 13, so this should be a MISS without bonuses.
        // Let's make d20 roll 15. Total attack roll = 15. 15 >= 13, so HIT.
        mockedRollDice
            .mockReturnValueOnce(15) // d20 for attack roll
            .mockReturnValueOnce(3);  // d6 for Slash damage

        const result = processAttack(attacker, target, basicAttackAction, mockAddVisualEffect);

        expect(result.hit).toBe(true);
        expect(result.miss).toBe(false);
        expect(result.crit).toBe(false);
        // Damage = (d6 roll: 3) + Warrior AP: 7 = 10.  Damage taken = 10 - Goblin Def: 2 = 8
        expect(result.damageDealt).toBe(8);
        expect(target.stats.currentHp).toBe(target.stats.maxHp - 8);
        expect(mockAddVisualEffect).toHaveBeenCalledWith(expect.objectContaining({
            type: 'damage_number', text: '8'
        }));
    });

    it('should register a MISS when total attack roll is less than target AC', () => {
        mockedRollDice.mockReturnValueOnce(5); // d20 for attack roll (5 < 13 AC)

        const result = processAttack(attacker, target, basicAttackAction, mockAddVisualEffect);

        expect(result.hit).toBe(false);
        expect(result.miss).toBe(true);
        expect(result.damageDealt).toBe(0);
        expect(target.stats.currentHp).toBe(target.stats.maxHp);
        expect(mockAddVisualEffect).toHaveBeenCalledWith(expect.objectContaining({
            type: 'miss_text', text: 'Miss'
        }));
    });

    it('should register a CRITICAL HIT on a natural 20 roll', () => {
        // Slash: rollDice(6) + 7 AP. Crit: (rollDice(6) + 7 AP) + rollDice(6)
        mockedRollDice
            .mockReturnValueOnce(20) // d20 for attack roll (Critical Hit)
            .mockReturnValueOnce(4)  // First d6 for Slash damage
            .mockReturnValueOnce(5);  // Second d6 for critical damage part

        const result = processAttack(attacker, target, basicAttackAction, mockAddVisualEffect);

        expect(result.hit).toBe(true);
        expect(result.crit).toBe(true);
        // Base damage part: (d6: 4) + AP 7 = 11
        // Crit damage part: (d6: 5)
        // Total damage before defense: 11 + 5 = 16
        // Damage taken = 16 - Goblin Def: 2 = 14
        expect(result.damageDealt).toBe(14);
        expect(target.stats.currentHp).toBe(target.stats.maxHp - 14);
        expect(mockAddVisualEffect).toHaveBeenCalledWith(expect.objectContaining({
            type: 'damage_number', text: '14', color: PLAYER_WARRIOR_CONFIG.sprite.color === "blue" ? "orange" : "orange" // Using the config color for crit
        }));
    });

    it('should register a CRITICAL MISS on a natural 1 roll', () => {
        mockedRollDice.mockReturnValueOnce(1); // d20 for attack roll (Critical Miss)
        // No damage dice should be rolled or matter

        const result = processAttack(attacker, target, basicAttackAction, mockAddVisualEffect);

        expect(result.miss).toBe(true);
        expect(result.crit).toBe(false); // It's a miss, not a crit hit
        expect(result.hit).toBe(false);
        expect(result.damageDealt).toBe(0);
        expect(mockAddVisualEffect).toHaveBeenCalledWith(expect.objectContaining({
            type: 'miss_text', text: 'CRIT MISS!'
        }));
    });

    it('Power Attack should apply +5 to hit and deal its specific damage', () => {
        // Power Attack: +5 to hit. Damage: rollDice(8) + AP + 5.
        // Target AC 13.
        // Let d20 roll be 7. Total to hit: 7 (d20) + 5 (PA bonus) = 12. This should MISS.
        mockedRollDice
            .mockReturnValueOnce(7)  // d20 roll
            .mockReturnValueOnce(5); // d8 for PA damage (won't be used if miss)

        let result = processAttack(attacker, target, powerAttackAction, mockAddVisualEffect);
        expect(result.hit).toBe(false);
        expect(result.miss).toBe(true);
        expect(result.damageDealt).toBe(0);

        // Let d20 roll be 8. Total to hit: 8 (d20) + 5 (PA bonus) = 13. This should HIT.
        // PA Damage = (d8 roll) + Warrior AP (7) + 5 (PA specific)
        // Let d8 roll be 6. Damage = 6 + 7 + 5 = 18.
        // Damage Taken = 18 - Goblin Def (2) = 16.
        mockedRollDice.mockReset(); // Reset for new scenario
        mockAddVisualEffect.mockClear();
        mockedRollDice
            .mockReturnValueOnce(8)  // d20 roll
            .mockReturnValueOnce(6); // d8 for PA damage

        result = processAttack(attacker, target, powerAttackAction, mockAddVisualEffect);
        expect(result.hit).toBe(true);
        expect(result.miss).toBe(false);
        expect(result.crit).toBe(false);
        expect(result.damageDealt).toBe(16);
        expect(target.stats.currentHp).toBe(target.stats.maxHp - 16); // Assuming target was full HP before this specific test
        expect(mockAddVisualEffect).toHaveBeenCalledWith(expect.objectContaining({
            type: 'damage_number', text: '16'
        }));
        expect(result.logMessage).toContain("(Power Attack: +5 to hit!)");
    });

    it('Power Attack critical hit should roll extra PA damage dice', () => {
        // Power Attack: +5 to hit. Damage: rollDice(8) + AP + 5.
        // Crit: (rollDice(8) + AP + 5) + rollDice(8)
        mockedRollDice
            .mockReturnValueOnce(20) // d20 for attack roll (Critical Hit for PA)
            .mockReturnValueOnce(7)  // First d8 for PA damage
            .mockReturnValueOnce(5);  // Second d8 for PA critical damage part

        const result = processAttack(attacker, target, powerAttackAction, mockAddVisualEffect);

        expect(result.hit).toBe(true);
        expect(result.crit).toBe(true);
        // Base damage part: (d8: 7) + AP 7 + PA_bonus 5 = 19
        // Crit damage part: (d8: 5)
        // Total damage before defense: 19 + 5 = 24
        // Damage taken = 24 - Goblin Def: 2 = 22
        expect(result.damageDealt).toBe(22);
        expect(target.stats.currentHp).toBe(target.stats.maxHp - 22);
         expect(mockAddVisualEffect).toHaveBeenCalledWith(expect.objectContaining({
            type: 'damage_number', text: '22', color: PLAYER_WARRIOR_CONFIG.sprite.color === "blue" ? "orange": "orange"
        }));
    });


    it('attack should not deal damage if target defense is higher than damage', () => {
        target.stats.defense = 20; // High defense
        mockedRollDice
            .mockReturnValueOnce(15) // d20 for attack roll (HIT: 15 >= 13 AC)
            .mockReturnValueOnce(3);  // d6 for Slash damage (Damage = 3 + 7 AP = 10)

        const result = processAttack(attacker, target, basicAttackAction, mockAddVisualEffect);

        expect(result.hit).toBe(true);
        expect(result.damageDealt).toBe(0); // 10 damage - 20 defense = -10, so 0 damage
        expect(target.stats.currentHp).toBe(target.stats.maxHp);
        expect(mockAddVisualEffect).toHaveBeenCalledWith(expect.objectContaining({
            type: 'damage_number', text: '0' // Still shows '0' damage dealt
        }));
    });

    it('should correctly log the attack process', () => {
        mockedRollDice.mockReturnValueOnce(12).mockReturnValueOnce(4); // d20=12 (hit), d6=4
        const result = processAttack(attacker, target, basicAttackAction, mockAddVisualEffect);
        expect(result.logMessage).toContain(`${attacker.name} uses ${basicAttackAction.name} against ${target.name}`);
        expect(result.logMessage).toContain(`Rolls d20: 12 + Bonus: 0 = Total: 12`); // Assuming base attack bonus is 0 for warrior for this test
        expect(result.logMessage).toContain(`vs AC ${target.stats.ac}... HIT!`);
        // Damage = 4 (d6) + 7 (AP) = 11. Taken = 11 - 2 (Def) = 9.
        expect(result.logMessage).toContain(`${target.name} takes 9 damage.`);
    });

});

