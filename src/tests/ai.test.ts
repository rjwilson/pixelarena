// src/tests/ai.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getEnemyAIAction, AIActionDecision } from '../ai';
import { Character, GameState, GridPoint, CharacterType, ActionType, GameAction } from '../types';
import { createCharacter } from '../character';
import { createGrid, occupyTile } from '../grid';
import { PLAYER_WARRIOR_CONFIG, PLAYER_MAGE_CONFIG, ENEMY_MELEE_CONFIG, ENEMY_RANGED_CONFIG, rollDice as actualRollDice } from '../config';

// Mock rollDice from config, as createCharacter uses it for initiative
vi.mock('../config', async (importOriginal) => {
    const originalConfig = await importOriginal<typeof import('../config')>();
    return {
        ...originalConfig,
        rollDice: vi.fn(), // Mock rollDice
    };
});
const mockedRollDice = vi.mocked(actualRollDice);


describe('AI System - getEnemyAIAction', () => {
    let aiGrunt: Character;
    let aiArcher: Character;
    let playerWarrior: Character;
    let playerMage: Character;
    let gameState: GameState;

    const setupCharacters = (aiGruntPos: GridPoint, aiArcherPos: GridPoint, warriorPos: GridPoint, magePos: GridPoint) => {
        // Mock initiative roll
        mockedRollDice.mockReturnValue(10); // All roll 10 + bonus

        aiGrunt = createCharacter(ENEMY_MELEE_CONFIG, aiGruntPos);
        aiArcher = createCharacter(ENEMY_RANGED_CONFIG, aiArcherPos);
        playerWarrior = createCharacter(PLAYER_WARRIOR_CONFIG, warriorPos);
        playerMage = createCharacter(PLAYER_MAGE_CONFIG, magePos);

        // Ensure they are alive and can act/move for tests
        [aiGrunt, aiArcher, playerWarrior, playerMage].forEach(c => {
            c.isAlive = true;
            c.stats.currentHp = c.stats.maxHp;
            c.canAct = true;
            c.canMove = true;
        });

        gameState.characters = [aiGrunt, aiArcher, playerWarrior, playerMage];
        gameState.grid = createGrid();
        gameState.characters.forEach(c => occupyTile(gameState.grid, c.position, c.id));
    };

    beforeEach(() => {
        mockedRollDice.mockReset();
        gameState = {
            characters: [],
            grid: createGrid(),
            turnOrder: [],
            currentTurnIndex: 0,
            activeCharacterId: null,
            selectedCharacterId: null,
            selectedAction: null,
            isPlayerTurn: false, // Assuming AI's turn
            isCombatOver: false,
            winner: null,
            actionLog: [],
        };
    });

    it('Grunt should attack Player Warrior if in melee range and Warrior has lowest HP', () => {
        setupCharacters({ x: 1, y: 1 }, { x: 8, y: 8 }, { x: 2, y: 1 }, { x: 7, y: 7 });
        playerWarrior.stats.currentHp = 5; // Warrior is weaker
        playerMage.stats.currentHp = PLAYER_MAGE_CONFIG.stats.maxHp;

        const decision = getEnemyAIAction(aiGrunt, gameState);
        expect(decision?.type).toBe('attack');
        expect(decision?.targetId).toBe(playerWarrior.id);
        expect(decision?.actionToUse?.name).toBe(ENEMY_MELEE_CONFIG.actions[0].name); // Scimitar
    });

    it('Archer should attack lowest HP player in range, even if not the closest', () => {
        // Archer at (1,1). Warrior at (1,5) (range 4). Mage at (3,1) (range 2).
        setupCharacters({ x: 8, y: 8 }, { x: 1, y: 1 }, { x: 1, y: 5 }, { x: 3, y: 1 });
        playerWarrior.stats.currentHp = PLAYER_WARRIOR_CONFIG.stats.maxHp;
        playerMage.stats.currentHp = 5; // Mage is weaker but further for a melee, but archer is ranged

        const decision = getEnemyAIAction(aiArcher, gameState);
        expect(decision?.type).toBe('attack');
        expect(decision?.targetId).toBe(playerMage.id);
        expect(decision?.actionToUse?.name).toBe(ENEMY_RANGED_CONFIG.actions[0].name); // Shortbow
    });

    it('Grunt should move towards the closest player if no one is in attack range', () => {
        setupCharacters({ x: 1, y: 1 }, { x: 8, y: 8 }, { x: 5, y: 5 }, { x: 6, y: 6 });
        // Grunt at (1,1), speed 4. Warrior at (5,5) is closer.
        // Expected move: towards (5,5). e.g., to (1+4, 1) -> (5,1) or (1, 1+4) -> (1,5) or diagonal like (3,3)
        // The AI tries to find *any* reachable tile that reduces distance.

        const decision = getEnemyAIAction(aiGrunt, gameState);
        expect(decision?.type).toBe('move');
        expect(decision?.targetPosition).toBeDefined();
        if (decision?.targetPosition) {
            // Check if the move is valid (within speed) and closer to a target
            const distToWarriorBefore = Math.abs(aiGrunt.position.x - playerWarrior.position.x) + Math.abs(aiGrunt.position.y - playerWarrior.position.y);
            const distToWarriorAfter = Math.abs(decision.targetPosition.x - playerWarrior.position.x) + Math.abs(decision.targetPosition.y - playerWarrior.position.y);
            const moveDist = Math.abs(decision.targetPosition.x - aiGrunt.position.x) + Math.abs(decision.targetPosition.y - aiGrunt.position.y);

            expect(moveDist).toBeLessThanOrEqual(aiGrunt.stats.speed);
            expect(distToWarriorAfter).toBeLessThan(distToWarriorBefore);
        }
    });

    it('AI should choose to wait if it cannot act or move', () => {
        setupCharacters({ x: 1, y: 1 }, { x: 8, y: 8 }, { x: 5, y: 5 }, { x: 6, y: 6 });
        aiGrunt.canAct = false;
        aiGrunt.canMove = false;
        const decision = getEnemyAIAction(aiGrunt, gameState);
        expect(decision?.type).toBe('wait');
    });

    it('AI should prefer an action that allows attacking after moving, over just moving closer', () => {
        // Grunt at (1,1), speed 3. Warrior at (1,5) (4 tiles away). Grunt can't reach to attack.
        // Mage at (1,3) (2 tiles away). Grunt can reach and attack Mage.
        setupCharacters({ x: 1, y: 1 }, { x: 8, y: 8 }, { x: 1, y: 5 }, { x: 1, y: 3 });
        aiGrunt.stats.speed = 2; // Can reach (1,3) but not (1,5)

        const decision = getEnemyAIAction(aiGrunt, gameState);
        // AI should move to (1,3) to attack the Mage.
        // The current AI returns 'move' first, then main.ts calls AI again for action.
        // So, we expect a 'move' decision towards the Mage.
        expect(decision?.type).toBe('move');
        expect(decision?.targetPosition).toEqual({ x: 1, y: 3 }); // Moves to engage Mage
    });


    it('AI should wait if players are unreachable and no attack is possible', () => {
        // Grunt at (0,0), speed 1. Warrior at (9,9).
        setupCharacters({ x: 0, y: 0 }, { x: 8, y: 8 }, { x: 9, y: 9 }, { x: 8, y: 9 });
        aiGrunt.stats.speed = 1;
        // AI will move one step closer, e.g. to (1,0) or (0,1)
        let decision = getEnemyAIAction(aiGrunt, gameState);
        expect(decision?.type).toBe('move');

        // Simulate the move
        if (decision?.targetPosition) {
            aiGrunt.position = decision.targetPosition;
            aiGrunt.canMove = false; // Moved
        }
        // Now, if it still can't reach and can't act, it should wait if called again (or if canAct is false)
        aiGrunt.canAct = false; // Assume it can't act for this sub-test
        decision = getEnemyAIAction(aiGrunt, gameState);
        expect(decision?.type).toBe('wait'); // Because canMove and canAct are false
    });


    it('Archer should attack from max range if possible, targeting weakest', () => {
        // Archer at (0,0), range 7. Warrior at (6,0), Mage at (0,7).
        setupCharacters({ x: 8, y: 8 }, { x: 0, y: 0 }, { x: 6, y: 0 }, { x: 0, y: 7 });
        playerWarrior.stats.currentHp = PLAYER_WARRIOR_CONFIG.stats.maxHp;
        playerMage.stats.currentHp = 5; // Mage is weaker

        const decision = getEnemyAIAction(aiArcher, gameState);
        expect(decision?.type).toBe('attack');
        expect(decision?.targetId).toBe(playerMage.id); // Mage is weaker and in range
    });

    it('If AI character has a special ability, it should consider using it', () => {
        // Create a custom AI grunt with a special ability
        const specialGruntConfig = JSON.parse(JSON.stringify(ENEMY_MELEE_CONFIG)); // Deep copy
        specialGruntConfig.name = "Special Grunt";
        const specialAbility: GameAction = {
            name: "Power Smash",
            type: ActionType.SPECIAL_ABILITY,
            range: 1,
            damage: () => 10, // High damage
            description: "A powerful smash."
        };
        specialGruntConfig.actions.push(specialAbility);

        mockedRollDice.mockReturnValue(10);
        aiGrunt = createCharacter(specialGruntConfig, { x: 1, y: 1 });
        playerWarrior = createCharacter(PLAYER_WARRIOR_CONFIG, { x: 2, y: 1 }); // Warrior in range
        playerWarrior.stats.currentHp = PLAYER_WARRIOR_CONFIG.stats.maxHp;

        gameState.characters = [aiGrunt, playerWarrior];
        gameState.grid = createGrid();
        gameState.characters.forEach(c => occupyTile(gameState.grid, c.position, c.id));
        aiGrunt.canAct = true;
        aiGrunt.canMove = true;


        const decision = getEnemyAIAction(aiGrunt, gameState);
        // AI prioritizes special if available and targetable
        expect(decision?.type).toBe('special');
        expect(decision?.targetId).toBe(playerWarrior.id);
        expect(decision?.actionToUse?.name).toBe("Power Smash");
    });

    it('If AI cannot use special ability (e.g. out of range), it should fall back to attack', () => {
        const specialGruntConfig = JSON.parse(JSON.stringify(ENEMY_MELEE_CONFIG));
        specialGruntConfig.name = "Special Grunt";
        const specialAbility: GameAction = { name: "Limited Smash", type: ActionType.SPECIAL_ABILITY, range: 1, damage: () => 10, description: "..." };
        specialGruntConfig.actions.push(specialAbility); // Has special
        specialGruntConfig.actions.find(a => a.type === ActionType.ATTACK)!.range = 2; // Normal attack has range 2

        mockedRollDice.mockReturnValue(10);
        aiGrunt = createCharacter(specialGruntConfig, { x: 1, y: 1 });
        playerWarrior = createCharacter(PLAYER_WARRIOR_CONFIG, { x: 3, y: 1 }); // Warrior at range 2 (special is range 1)
        
        gameState.characters = [aiGrunt, playerWarrior];
        gameState.grid = createGrid();
        gameState.characters.forEach(c => occupyTile(gameState.grid, c.position, c.id));
        aiGrunt.canAct = true;
        aiGrunt.canMove = true;

        const decision = getEnemyAIAction(aiGrunt, gameState);
        expect(decision?.type).toBe('attack'); // Falls back to normal attack
        expect(decision?.targetId).toBe(playerWarrior.id);
        expect(decision?.actionToUse?.name).toBe(ENEMY_MELEE_CONFIG.actions[0].name); // Scimitar
    });


    it('AI should not try to move onto a tile occupied by another AI character', () => {
        // Grunt1 at (1,1), Grunt2 at (3,1). Player at (5,1).
        // Grunt1 wants to move towards player. (2,1) is a valid step.
        // If Grunt2 was at (2,1), Grunt1 should pick another path or wait.
        const grunt1Pos = { x: 1, y: 1 };
        const grunt2Pos = { x: 2, y: 1 }; // Blocking direct path for grunt1
        const playerPos = { x: 4, y: 1 };

        mockedRollDice.mockReturnValue(10);
        const grunt1 = createCharacter(ENEMY_MELEE_CONFIG, grunt1Pos);
        const grunt2 = createCharacter(ENEMY_MELEE_CONFIG, grunt2Pos); // Blocker
        const player = createCharacter(PLAYER_WARRIOR_CONFIG, playerPos);
        grunt1.stats.speed = 2; // Can reach (3,1) normally

        gameState.characters = [grunt1, grunt2, player];
        gameState.grid = createGrid();
        gameState.characters.forEach(c => occupyTile(gameState.grid, c.position, c.id));

        const decision = getEnemyAIAction(grunt1, gameState);
        expect(decision?.type).toBe('move');
        // Expected: move to (1,0) or (1,2) or (2,0) (if speed allows) or (0,1) to get around grunt2, or (3,1) if it can jump.
        // The current getReachableTiles does not allow moving onto occupied tiles by other characters.
        // So, (2,1) is not an option.
        // It should move to a tile like (1,0), (1,2), or potentially (0,1) if that's closer.
        // If it moves to (1,2), new pos is (1,2). dist to (4,1) is |1-4|+|2-1| = 3+1=4
        // If it moves to (0,1), new pos is (0,1). dist to (4,1) is |0-4|+|1-1| = 4+0=4
        // The AI pathfinding for move will pick one of these.
        expect(decision?.targetPosition).not.toEqual(grunt2Pos); // Should not try to move onto grunt2
        if(decision?.targetPosition) {
            expect(decision.targetPosition.x === grunt1Pos.x || decision.targetPosition.y === grunt1Pos.y || 
                   (Math.abs(decision.targetPosition.x - grunt1Pos.x) <= grunt1.stats.speed && Math.abs(decision.targetPosition.y - grunt1Pos.y) <= grunt1.stats.speed)
            ).toBe(true); // Basic check it's a valid move within speed
        }
    });

});

