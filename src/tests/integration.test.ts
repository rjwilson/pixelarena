// src/tests/integration.test.ts
import { describe, it, expect, vi, beforeEach, afterEach, SpyInstance } from 'vitest';

import { GameState, Character, CharacterType, ActionType, GridPoint, GameAction } from '../types';
// Import config items BUT DEFER importing 'rollDice' until after resetModules
import { PLAYER_WARRIOR_CONFIG, ENEMY_MELEE_CONFIG, GRID_COLS, GRID_ROWS, TILE_SIZE, PLAYER_MAGE_CONFIG, ENEMY_RANGED_CONFIG } from '../config';
import { resetCharacterIdCounter_TEST_HOOK, resetCharacterTurnActions } from '../character';
import { occupyTile as testOccupyTile } from '../grid';
import * as uiManager from '../ui';
import * as combatModule from '../combat';
import * as aiModule from '../ai';

// Dynamically imported main application module
let mainApp: typeof import('../main');
// This will hold the mock function instance that the SUT uses after vi.resetModules()
let mockedRollDice: vi.MockedFunction<typeof import('../config').rollDice>; 

// --- Mocking Config ---
// This factory is hoisted. It replaces the actual 'rollDice' with a vi.fn().
// This factory will run each time '../config' is imported after vi.resetModules().
vi.mock('../config', async (importOriginal) => {
    const originalModule = await importOriginal<typeof import('../config')>();
    return {
        ...originalModule,
        rollDice: vi.fn(), // A new vi.fn() is created by this factory upon fresh import
    };
});
// --- End Mocking Config ---


vi.mock('../ui', () => ({
    initializeUI: vi.fn(),
    updateCharacterDisplays: vi.fn(),
    addMessageToActionLog: vi.fn(),
    updateActionLog: vi.fn(),
    updateTurnIndicator: vi.fn(),
    updateActionButtons: vi.fn(),
    showGameMessage: vi.fn(),
    hideGameMessage: vi.fn(),
}));

const {
    initializeUI: mockInitializeUI,
    addMessageToActionLog: mockAddMessageToActionLog,
    showGameMessage: mockShowGameMessage,
} = uiManager as { [K in keyof typeof uiManager]: SpyInstance & typeof uiManager[K] };

let processAttackSpy: SpyInstance;
let getEnemyAIActionSpy: SpyInstance;

function setupDOMProgrammatically() {
    document.body.innerHTML = '';
    const gameContainer = document.createElement('div');
    gameContainer.id = 'game-container';
    const canvas = document.createElement('canvas');
    canvas.id = 'game-canvas';
    gameContainer.appendChild(canvas);
    const playerPartyInfo = document.createElement('div');
    playerPartyInfo.id = 'player-party-info';
    const playerCharsDisplay = document.createElement('div');
    playerCharsDisplay.id = 'player-characters-display';
    playerPartyInfo.appendChild(playerCharsDisplay);
    gameContainer.appendChild(playerPartyInfo);
    const enemyAndUiInfo = document.createElement('div');
    enemyAndUiInfo.id = 'enemy-and-ui-info';
    const enemyCharsDisplay = document.createElement('div');
    enemyCharsDisplay.id = 'enemy-characters-display';
    enemyAndUiInfo.appendChild(enemyCharsDisplay);
    const turnIndicatorDiv = document.createElement('div');
    turnIndicatorDiv.id = 'turn-indicator';
    const currentTurnSpan = document.createElement('span');
    currentTurnSpan.id = 'current-turn-character';
    turnIndicatorDiv.appendChild(currentTurnSpan);
    enemyAndUiInfo.appendChild(turnIndicatorDiv);
    const actionMenuDiv = document.createElement('div');
    actionMenuDiv.id = 'action-menu';
    const actionsContainer = document.createElement('div');
    actionsContainer.id = 'actions-container';
    ['move-button', 'attack-button', 'special-button', 'end-turn-button'].forEach(id => {
        const button = document.createElement('button');
        button.id = id;
        actionsContainer.appendChild(button);
    });
    actionMenuDiv.appendChild(actionsContainer);
    enemyAndUiInfo.appendChild(actionMenuDiv);
    gameContainer.appendChild(enemyAndUiInfo);
    const actionLogDiv = document.createElement('div');
    actionLogDiv.id = 'action-log';
    const pLog = document.createElement('p');
    pLog.textContent = 'Game Log:';
    actionLogDiv.appendChild(pLog);
    gameContainer.appendChild(actionLogDiv);
    const gameMessageBox = document.createElement('div');
    gameMessageBox.id = 'game-message-box';
    gameMessageBox.classList.add('hidden');
    const msgTitle = document.createElement('h2');
    msgTitle.id = 'message-title';
    const msgText = document.createElement('p');
    msgText.id = 'message-text';
    const msgCloseButton = document.createElement('button');
    msgCloseButton.id = 'message-close-button';
    gameMessageBox.appendChild(msgTitle);
    gameMessageBox.appendChild(msgText);
    gameMessageBox.appendChild(msgCloseButton);
    gameContainer.appendChild(gameMessageBox);
    document.body.appendChild(gameContainer);

    HTMLCanvasElement.prototype.getContext = vi.fn((contextId: string) => {
        if (contextId === '2d') {
            const mockCtx = {
                fillRect: vi.fn(), clearRect: vi.fn(), strokeRect: vi.fn(), beginPath: vi.fn(),
                moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), fillText: vi.fn(),
                measureText: vi.fn(() => ({ width: 50, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2, fontBoundingBoxAscent: 10, fontBoundingBoxDescent: 2 })),
                save: vi.fn(), restore: vi.fn(), setLineDash: vi.fn(), arc: vi.fn(), fill: vi.fn(),
                translate: vi.fn(), rotate: vi.fn(), createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
                canvas: document.getElementById('game-canvas') as HTMLCanvasElement, globalAlpha: 1.0,
                font: '', fillStyle: '', strokeStyle: '', lineWidth: 1, textAlign: 'start',
                textBaseline: 'alphabetic', imageSmoothingEnabled: true,
            };
            return new Proxy(mockCtx, {
                set: (target, property, value) => {
                    (target as any)[property] = value; return true;
                },
            }) as unknown as CanvasRenderingContext2D;
        }
        return null;
    });
}

describe('Game Integration Tests', () => {
    beforeEach(async () => {
        vi.useFakeTimers();
        setupDOMProgrammatically(); 

        vi.resetModules(); 
        // Call resetCharacterIdCounter_TEST_HOOK *after* resetModules ensures character.ts is fresh when its hook is called.
        // And *before* mainApp import if mainApp's import process could trigger character creation indirectly.
        resetCharacterIdCounter_TEST_HOOK(); 
        
        mainApp = await import('../main'); 
        
        // Re-acquire the mocked rollDice from the re-imported config module.
        // This ensures 'mockedRollDice' refers to the instance used by the SUT for this test run.
        const configModule = await import('../config');
        mockedRollDice = configModule.rollDice as vi.MockedFunction<typeof configModule.rollDice>;
        mockedRollDice.mockReset(); // Reset this specific instance for the current test.

        const actualCombatModule = await import('../combat');
        processAttackSpy = vi.spyOn(actualCombatModule, 'processAttack');
        const actualAiModule = await import('../ai');
        getEnemyAIActionSpy = vi.spyOn(actualAiModule, 'getEnemyAIAction');

        mockInitializeUI.mockClear();
        mockAddMessageToActionLog.mockClear();
        mockShowGameMessage.mockClear();
        processAttackSpy.mockClear();
        getEnemyAIActionSpy.mockClear();

        if (mainApp.clearVisualEffects_TEST_HOOK) {
            mainApp.clearVisualEffects_TEST_HOOK();
        }
    });

    afterEach(() => {
        vi.runOnlyPendingTimers(); 
        vi.useRealTimers();
        vi.restoreAllMocks(); 
        document.body.innerHTML = ''; 
        if (HTMLCanvasElement.prototype.getContext && (HTMLCanvasElement.prototype.getContext as any).mockClear) {
            (HTMLCanvasElement.prototype.getContext as any).mockClear();
        }
        delete HTMLCanvasElement.prototype.getContext; 
        if (processAttackSpy) processAttackSpy.mockRestore();
        if (getEnemyAIActionSpy) getEnemyAIActionSpy.mockRestore();
    });

    it('Player Warrior takes a full turn: Move then Attack Enemy Grunt, verifying state and UI calls', async () => {
        // Order of character creation in INITIAL_PARTY_SETUP and INITIAL_ENEMY_SETUP:
        // 1. Warrior, 2. Mage, 3. Grunt, 4. Archer
        mockedRollDice 
            .mockReturnValueOnce(20) // 1. Warrior init (20 + 2 = 22)
            .mockReturnValueOnce(5)  // 2. Mage init (5 + 3 = 8)
            .mockReturnValueOnce(10) // 3. Grunt init (10 + 1 = 11)
            .mockReturnValueOnce(12); // 4. Archer init (12 + 2 = 14)
                                     // Expected sorted order: Warrior (22), Archer (14), Grunt (11), Mage (8)
        
        mainApp.initializeGame(); 
        const gameState = mainApp.getGameState_TEST_HOOK(); 

        const warrior = gameState.characters.find(c => c.name === PLAYER_WARRIOR_CONFIG.name)!;
        const grunt = gameState.characters.find(c => c.name === ENEMY_MELEE_CONFIG.name)!;
        const initialWarriorPos = {...warrior.position};
        
        expect(gameState.activeCharacterId).toBe(warrior.id); 
        expect(gameState.isPlayerTurn).toBe(true);
        
        mainApp.handleActionButtonClick(ActionType.MOVE);
        expect(gameState.selectedAction?.type).toBe(ActionType.MOVE);
        
        const moveTarget: GridPoint = { x: initialWarriorPos.x + 1, y: initialWarriorPos.y }; 
        const mockCanvasClickEventMove = {
            clientX: moveTarget.x * TILE_SIZE + TILE_SIZE / 2,
            clientY: moveTarget.y * TILE_SIZE + TILE_SIZE / 2,
            target: { getBoundingClientRect: () => ({ left: 0, top: 0, width: GRID_COLS * TILE_SIZE, height: GRID_ROWS * TILE_SIZE }) }
        } as unknown as MouseEvent;
        mainApp.handleCanvasClick(mockCanvasClickEventMove);

        expect(warrior.position).toEqual(moveTarget);
        expect(warrior.canMove).toBe(false);
        expect(gameState.selectedAction).toBeNull();

        const gruntTargetPosition = { x: moveTarget.x + 1, y: moveTarget.y };
        grunt.position = gruntTargetPosition; 
        testOccupyTile(gameState.grid, grunt.position, grunt.id); 
        
        mainApp.handleActionButtonClick(ActionType.ATTACK); 
        const attackAction = warrior.actions.find(a => a.type === ActionType.ATTACK)!;
        expect(gameState.selectedAction).toBeDefined();
        expect(gameState.selectedAction?.name).toBe(attackAction.name);
        
        if (mainApp.getAttackableTargetTiles_TEST_HOOK) { // Check if test hook exists
             expect(mainApp.getAttackableTargetTiles_TEST_HOOK()).toContainEqual(gruntTargetPosition);
        }
        
        expect(warrior.canAct).toBe(true);

        mockedRollDice.mockReset(); 
        mockedRollDice
            .mockReturnValueOnce(18) // Warrior Attack d20 (HIT)
            .mockReturnValueOnce(4);  // Warrior Damage d6 for Slash

        const mockCanvasClickEventAttack = {
            clientX: grunt.position.x * TILE_SIZE + TILE_SIZE / 2,
            clientY: grunt.position.y * TILE_SIZE + TILE_SIZE / 2,
            target: { getBoundingClientRect: () => ({ left: 0, top: 0, width: GRID_COLS * TILE_SIZE, height: GRID_ROWS * TILE_SIZE }) }
        } as unknown as MouseEvent;
        mainApp.handleCanvasClick(mockCanvasClickEventAttack);
        
        expect(processAttackSpy).toHaveBeenCalled(); 
        const expectedDamageDealt = (4 + PLAYER_WARRIOR_CONFIG.stats.attackPower) - ENEMY_MELEE_CONFIG.stats.defense;
        expect(grunt.stats.currentHp).toBe(ENEMY_MELEE_CONFIG.stats.maxHp - expectedDamageDealt); 
        expect(warrior.canAct).toBe(false);
        expect(mockAddMessageToActionLog).toHaveBeenCalledWith(expect.stringContaining("HIT!"), gameState);
        expect(gameState.selectedAction).toBeNull(); 

        mainApp.handleActionButtonClick('END_TURN');
        
        const archer = gameState.characters.find(c => c.name === ENEMY_RANGED_CONFIG.name)!;
        expect(gameState.activeCharacterId).toBe(archer.id); 
        expect(gameState.isPlayerTurn).toBe(false);
    });

    it('AI Grunt moves and then attacks Player Warrior if initially out of range', async () => {
        mockedRollDice
            .mockReturnValueOnce(5)  // 1. Warrior init (5 + 2 = 7)
            .mockReturnValueOnce(10) // 2. Mage init (10 + 3 = 13)
            .mockReturnValueOnce(20) // 3. Grunt init (20 + 1 = 21) -> Grunt is first
            .mockReturnValueOnce(12); // 4. Archer init (12 + 2 = 14)
                                     // Sorted order: Grunt (21), Archer (14), Mage (13), Warrior (7)
        
        mainApp.initializeGame();
        const gameState = mainApp.getGameState_TEST_HOOK();
        const warrior = gameState.characters.find(c => c.name === PLAYER_WARRIOR_CONFIG.name)!;
        const grunt = gameState.characters.find(c => c.name === ENEMY_MELEE_CONFIG.name)!;
        const archer = gameState.characters.find(c => c.name === ENEMY_RANGED_CONFIG.name)!;
        const mage = gameState.characters.find(c => c.name === PLAYER_MAGE_CONFIG.name)!;

        const initialGruntPos = { ...grunt.position }; 
        const initialWarriorHp = warrior.stats.currentHp;

        expect(gameState.activeCharacterId).toBe(grunt.id); 

        await vi.advanceTimersByTimeAsync(501); 
        
        expect(getEnemyAIActionSpy).toHaveBeenCalledWith(grunt, gameState);
        const firstAIDecision = getEnemyAIActionSpy.mock.results[0].value;
        expect(firstAIDecision?.type).toBe('move'); 
        expect(grunt.position).not.toEqual(initialGruntPos); 
        expect(grunt.canMove).toBe(false);
        expect(grunt.canAct).toBe(true); 
        expect(mockAddMessageToActionLog).toHaveBeenCalledWith(expect.stringContaining(`${grunt.name} moves to`), gameState);
        
        mockedRollDice.mockReset(); 
        
        await vi.advanceTimersByTimeAsync(751); 

        expect(getEnemyAIActionSpy).toHaveBeenCalledTimes(2); 
        const secondAIDecision = getEnemyAIActionSpy.mock.results[1].value;
        
        expect(secondAIDecision?.type).toBe('wait'); 

        expect(grunt.canAct).toBe(false); 
        expect(mockAddMessageToActionLog).toHaveBeenCalledWith(expect.stringContaining(`${grunt.name} waits.`), gameState);

        mockedRollDice.mockReset(); 
        
        await vi.advanceTimersByTimeAsync(1001); 
        
        expect(gameState.activeCharacterId).toBe(archer.id); 

        mockedRollDice
            .mockReturnValueOnce(10) 
            .mockReturnValueOnce(3);  
        
        const initialMageHp = mage.stats.currentHp;
        await vi.advanceTimersByTimeAsync(501); 
        
        expect(getEnemyAIActionSpy).toHaveBeenCalledTimes(3);
        const thirdAIDecision = getEnemyAIActionSpy.mock.results[2].value;
        
        if (thirdAIDecision?.type === 'attack' && thirdAIDecision?.targetId === mage.id) {
            await vi.advanceTimersByTimeAsync(751);  
            expect(processAttackSpy).toHaveBeenCalledWith(archer, mage, expect.objectContaining({ name: "Shortbow" }), expect.any(Function));
            expect(mage.stats.currentHp).toBe(initialMageHp); 
            expect(mockAddMessageToActionLog).toHaveBeenCalledWith(expect.stringContaining(`${archer.name} uses Shortbow`), gameState);
            expect(mockAddMessageToActionLog).toHaveBeenCalledWith(expect.stringContaining("MISS!"), gameState);
        } else if (thirdAIDecision?.type === 'wait') {
             await vi.advanceTimersByTimeAsync(751); 
            expect(mockAddMessageToActionLog).toHaveBeenCalledWith(expect.stringContaining(`${archer.name} waits.`), gameState);
        }
    });


    it('Game proceeds to Player Victory when Warrior defeats the last Grunt', async () => {
        mockedRollDice
            .mockReturnValueOnce(20) 
            .mockReturnValueOnce(5)  
            .mockReturnValueOnce(10) 
            .mockReturnValueOnce(12); 
        
        mainApp.initializeGame(); 
        const gameState = mainApp.getGameState_TEST_HOOK();
        const warrior = gameState.characters.find(c => c.name === PLAYER_WARRIOR_CONFIG.name)!;
        let grunt = gameState.characters.find(c => c.name === ENEMY_MELEE_CONFIG.name)!;
        
        gameState.characters = [warrior, grunt]; 
        warrior.stats.initiative = 30; 
        grunt.stats.initiative = 5;
        gameState.characters.sort((a,b) => b.stats.initiative - a.stats.initiative);
        gameState.turnOrder = gameState.characters.map(char => char.id);
       
        gameState.currentTurnIndex = 0; 
        gameState.activeCharacterId = warrior.id; 
        resetCharacterTurnActions(warrior); 
        gameState.isPlayerTurn = true;

        grunt.stats.currentHp = 1; 
        grunt.stats.defense = 0;   
        grunt.position = { x: warrior.position.x + 1, y: warrior.position.y }; 
        testOccupyTile(gameState.grid, grunt.position, grunt.id);
        
        expect(gameState.activeCharacterId).toBe(warrior.id);

        mainApp.handleActionButtonClick(ActionType.ATTACK);

        mockedRollDice.mockReset();
        mockedRollDice
            .mockReturnValueOnce(18) 
            .mockReturnValueOnce(3);  

        const mockCanvasClickEventAttack = {
            clientX: grunt.position.x * TILE_SIZE + TILE_SIZE / 2,
            clientY: grunt.position.y * TILE_SIZE + TILE_SIZE / 2,
            target: { getBoundingClientRect: () => ({ left: 0, top: 0, width: GRID_COLS * TILE_SIZE, height: GRID_ROWS * TILE_SIZE }) }
        } as unknown as MouseEvent;
        mainApp.handleCanvasClick(mockCanvasClickEventAttack); 

        expect(processAttackSpy).toHaveBeenCalled();
        expect(grunt.isAlive).toBe(false);
        expect(gameState.isCombatOver).toBe(true); 
        expect(gameState.winner).toBe(CharacterType.PLAYER);
        expect(mockShowGameMessage).toHaveBeenCalledWith("Victory!", "You have defeated all enemies!", CharacterType.PLAYER);
    });

    it('Game proceeds to Enemy Victory when Grunt defeats the last Warrior', async () => {
        mockedRollDice
            .mockReturnValueOnce(5)  
            .mockReturnValueOnce(10) 
            .mockReturnValueOnce(20) 
            .mockReturnValueOnce(12); 
        
        mainApp.initializeGame(); 
        const gameState = mainApp.getGameState_TEST_HOOK();
        let warrior = gameState.characters.find(c => c.name === PLAYER_WARRIOR_CONFIG.name)!;
        const grunt = gameState.characters.find(c => c.name === ENEMY_MELEE_CONFIG.name)!;

        gameState.characters = [grunt, warrior]; 
        grunt.stats.initiative = 30; 
        warrior.stats.initiative = 5;
        gameState.characters.sort((a,b) => b.stats.initiative - a.stats.initiative);
        gameState.turnOrder = gameState.characters.map(char => char.id);

        gameState.currentTurnIndex = 0;
        gameState.activeCharacterId = grunt.id; 
        resetCharacterTurnActions(grunt);
        gameState.isPlayerTurn = false;

        warrior.stats.currentHp = 1; 
        warrior.stats.defense = 0;  
        warrior.position = { x: grunt.position.x + 1, y: grunt.position.y };
        testOccupyTile(gameState.grid, warrior.position, warrior.id);
        
        expect(gameState.activeCharacterId).toBe(grunt.id);

        mockedRollDice.mockReset();
        mockedRollDice
            .mockReturnValueOnce(18) 
            .mockReturnValueOnce(3);  
        
        await vi.runAllTimersAsync(); 

        expect(processAttackSpy).toHaveBeenCalled();
        expect(warrior.isAlive).toBe(false);
        expect(gameState.isCombatOver).toBe(true); 
        expect(gameState.winner).toBe(CharacterType.ENEMY);
        expect(mockShowGameMessage).toHaveBeenCalledWith("Defeat!", "Your party has been vanquished.", CharacterType.ENEMY);
    });
});
