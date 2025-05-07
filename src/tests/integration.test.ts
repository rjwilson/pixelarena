// src/tests/integration.test.ts
import { describe, it, expect, vi, beforeEach, afterEach, SpyInstance } from 'vitest';

import * as mainApp from '../main';
import { GameState, Character, CharacterType, ActionType, GridPoint, GameAction } from '../types';
import { PLAYER_WARRIOR_CONFIG, ENEMY_MELEE_CONFIG, rollDice as actualRollDice, GRID_COLS, GRID_ROWS, TILE_SIZE } from '../config';
import { createCharacter as testCreateCharacter } from '../character';
import { createGrid as testCreateGrid, occupyTile as testOccupyTile } from '../grid';
import * as uiManager from '../ui'; // Import the actual module to get its type, then cast spies

// --- Mocking Core Modules & Functions ---
vi.mock('../config', async (importOriginal) => {
    const originalConfig = await importOriginal<typeof import('../config')>();
    return {
        ...originalConfig,
        rollDice: vi.fn(),
    };
});
const mockedRollDice = vi.mocked(actualRollDice);

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

// Get typed spies for UI functions by casting the mocked module
const {
    initializeUI: mockInitializeUI,
    addMessageToActionLog: mockAddMessageToActionLog,
    showGameMessage: mockShowGameMessage,
    updateCharacterDisplays: mockUpdateCharacterDisplays,
    updateTurnIndicator: mockUpdateTurnIndicator,
    updateActionButtons: mockUpdateActionButtons,
    hideGameMessage: mockHideGameMessage,
} = uiManager as { [K in keyof typeof uiManager]: SpyInstance & typeof uiManager[K] };


function setupDOM() {
    document.body.innerHTML = `
        <div id="game-container">
            <canvas id="game-canvas" width="${GRID_COLS * TILE_SIZE}" height="${GRID_ROWS * TILE_SIZE}"></canvas>
            <div id="player-party-info"><div id="player-characters-display"></div></div>
            <div id="enemy-and-ui-info">
                <div id="enemy-characters-display"></div>
                <div id="turn-indicator"><span id="current-turn-character"></span></div>
                <div id="action-menu">
                    <div id="actions-container">
                        <button id="move-button">Move</button>
                        <button id="attack-button">Attack</button>
                        <button id="special-button">Special</button>
                        <button id="end-turn-button">End Turn</button>
                    </div>
                </div>
            </div>
            <div id="action-log"><p>Game Log:</p></div>
            <div id="game-message-box" class="hidden">
                <h2 id="message-title"></h2>
                <p id="message-text"></p>
                <button id="message-close-button"></button>
            </div>
        </div>
    `;
    // Mock getContext if necessary for environments like JSDOM that don't fully support canvas
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (canvas && typeof HTMLCanvasElement.prototype.getContext === 'function' && !canvas.getContext('2d')) {
         HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
            fillRect: vi.fn(),
            clearRect: vi.fn(),
            strokeRect: vi.fn(),
            beginPath: vi.fn(),
            moveTo: vi.fn(),
            lineTo: vi.fn(),
            stroke: vi.fn(),
            fillText: vi.fn(),
            measureText: vi.fn(() => ({ width: 0 })),
            save: vi.fn(),
            restore: vi.fn(),
            setLineDash: vi.fn(),
            // Add other methods main.ts or its dependencies might call on ctx
        }) as any);
    }
}

describe('Game Integration Tests', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        mockedRollDice.mockReset();
        
        mockInitializeUI.mockClear();
        mockAddMessageToActionLog.mockClear();
        mockShowGameMessage.mockClear();
        mockUpdateCharacterDisplays.mockClear();
        mockUpdateTurnIndicator.mockClear();
        mockUpdateActionButtons.mockClear();
        mockHideGameMessage.mockClear();

        setupDOM(); 

        if (mainApp.clearVisualEffects_TEST_HOOK) {
            mainApp.clearVisualEffects_TEST_HOOK();
        }
    });

    afterEach(() => {
        vi.runOnlyPendingTimers(); 
        vi.useRealTimers();
        vi.restoreAllMocks(); 
        document.body.innerHTML = ''; 
    });

    it('Player Warrior takes a full turn: Move then Attack Enemy Grunt, verifying state and UI calls', () => {
        mockedRollDice.mockReturnValueOnce(20).mockReturnValueOnce(5); // Warrior init > Grunt init
        
        mainApp.initializeGame(); 
        const gameState = mainApp.getGameState_TEST_HOOK(); 

        const warrior = gameState.characters.find(c => c.name === PLAYER_WARRIOR_CONFIG.name)!;
        const grunt = gameState.characters.find(c => c.name === ENEMY_MELEE_CONFIG.name)!;

        expect(gameState.activeCharacterId).toBe(warrior.id);
        expect(gameState.isPlayerTurn).toBe(true);
        
        // 1. Player selects Move action
        mainApp.handleActionButtonClick(ActionType.MOVE);
        expect(gameState.selectedAction?.type).toBe(ActionType.MOVE);
        
        // 2. Player clicks tile to move Warrior
        const moveTarget: GridPoint = { x: warrior.position.x + 1, y: warrior.position.y };
        const mockCanvasClickEventMove = {
            clientX: moveTarget.x * TILE_SIZE + TILE_SIZE / 2,
            clientY: moveTarget.y * TILE_SIZE + TILE_SIZE / 2,
        } as MouseEvent;
        mainApp.handleCanvasClick(mockCanvasClickEventMove);

        expect(warrior.position).toEqual(moveTarget);
        expect(warrior.canMove).toBe(false);
        expect(gameState.selectedAction).toBeNull();

        // 3. Player selects Attack action
        mainApp.handleActionButtonClick(ActionType.ATTACK);
        const attackAction = warrior.actions.find(a => a.type === ActionType.ATTACK)!;
        expect(gameState.selectedAction?.name).toBe(attackAction.name);

        // 4. Player clicks Grunt to attack (Grunt needs to be in range)
        grunt.position = { x: moveTarget.x + 1, y: moveTarget.y }; 
        testOccupyTile(gameState.grid, grunt.position, grunt.id); 

        mockedRollDice.mockReturnValueOnce(18); 
        mockedRollDice.mockReturnValueOnce(4);  

        const mockCanvasClickEventAttack = {
            clientX: grunt.position.x * TILE_SIZE + TILE_SIZE / 2,
            clientY: grunt.position.y * TILE_SIZE + TILE_SIZE / 2,
        } as MouseEvent;
        mainApp.handleCanvasClick(mockCanvasClickEventAttack);
        
        const expectedDamage = (4 + PLAYER_WARRIOR_CONFIG.stats.attackPower) - ENEMY_MELEE_CONFIG.stats.defense;
        expect(grunt.stats.currentHp).toBe(ENEMY_MELEE_CONFIG.stats.maxHp - expectedDamage);
        expect(warrior.canAct).toBe(false);
        expect(mockAddMessageToActionLog).toHaveBeenCalledWith(expect.stringContaining("HIT!"), gameState);
        expect(gameState.selectedAction).toBeNull(); 

        // 5. Player ends turn
        mainApp.handleActionButtonClick('END_TURN');
        vi.runAllTimers(); 
        expect(gameState.activeCharacterId).toBe(grunt.id); 
        expect(gameState.isPlayerTurn).toBe(false);
    });

    it('AI Grunt moves and then attacks Player Warrior if initially out of range', () => {
        mockedRollDice.mockReset();
        mockedRollDice.mockReturnValueOnce(5).mockReturnValueOnce(20); // Warrior init, Grunt init (Grunt first)
        
        mainApp.initializeGame();
        const gameState = mainApp.getGameState_TEST_HOOK();
        const warrior = gameState.characters.find(c => c.name === PLAYER_WARRIOR_CONFIG.name)!;
        const grunt = gameState.characters.find(c => c.name === ENEMY_MELEE_CONFIG.name)!;
        const initialGruntPos = { ...grunt.position };

        expect(gameState.activeCharacterId).toBe(grunt.id);

        vi.runAllTimers(); // AI's first action phase (Move)

        expect(grunt.position).not.toEqual(initialGruntPos); 
        expect(grunt.canMove).toBe(false);
        expect(grunt.canAct).toBe(true); 
        
        mockedRollDice.mockReturnValueOnce(19); 
        mockedRollDice.mockReturnValueOnce(5);  
        
        vi.runAllTimers(); // AI's second action phase (Attack)

        const expectedDamage = (5 + ENEMY_MELEE_CONFIG.stats.attackPower) - PLAYER_WARRIOR_CONFIG.stats.defense;
        expect(warrior.stats.currentHp).toBe(PLAYER_WARRIOR_CONFIG.stats.maxHp - expectedDamage);
        expect(grunt.canAct).toBe(false);
        expect(mockAddMessageToActionLog).toHaveBeenCalledWith(expect.stringContaining("HIT!"), gameState);

        vi.runAllTimers(); // End AI's turn
        expect(gameState.activeCharacterId).toBe(warrior.id); 
    });


    it('Game proceeds to Player Victory when Warrior defeats the last Grunt', () => {
        mockedRollDice.mockReset();
        mockedRollDice.mockReturnValueOnce(20).mockReturnValueOnce(5); // Warrior init > Grunt init
        
        mainApp.initializeGame();
        const gameState = mainApp.getGameState_TEST_HOOK();
        const warrior = gameState.characters.find(c => c.name === PLAYER_WARRIOR_CONFIG.name)!;
        const grunt = gameState.characters.find(c => c.name === ENEMY_MELEE_CONFIG.name)!;
        
        grunt.stats.currentHp = 1;
        grunt.stats.defense = 0; 
        // Ensure Grunt is in range for the attack
        grunt.position = { x: warrior.position.x + 1, y: warrior.position.y };
        testOccupyTile(gameState.grid, grunt.position, grunt.id);


        expect(gameState.activeCharacterId).toBe(warrior.id);

        mainApp.handleActionButtonClick(ActionType.ATTACK);

        mockedRollDice.mockReturnValueOnce(18); 
        mockedRollDice.mockReturnValueOnce(3);  

        const mockCanvasClickEventAttack = {
            clientX: grunt.position.x * TILE_SIZE + TILE_SIZE / 2,
            clientY: grunt.position.y * TILE_SIZE + TILE_SIZE / 2,
        } as MouseEvent;
        // performAttack is called inside handleCanvasClick if conditions are met
        mainApp.handleCanvasClick(mockCanvasClickEventAttack); 
        // checkWinLossConditions is called internally after performAttack

        expect(grunt.isAlive).toBe(false);
        expect(gameState.isCombatOver).toBe(true);
        expect(gameState.winner).toBe(CharacterType.PLAYER);
        expect(mockShowGameMessage).toHaveBeenCalledWith("Victory!", "You have defeated all enemies!", CharacterType.PLAYER);
    });

    it('Game proceeds to Enemy Victory when Grunt defeats the last Warrior', () => {
        mockedRollDice.mockReset();
        mockedRollDice.mockReturnValueOnce(5).mockReturnValueOnce(20); // Grunt init > Warrior init
        
        mainApp.initializeGame();
        const gameState = mainApp.getGameState_TEST_HOOK();
        const warrior = gameState.characters.find(c => c.name === PLAYER_WARRIOR_CONFIG.name)!;
        const grunt = gameState.characters.find(c => c.name === ENEMY_MELEE_CONFIG.name)!;

        warrior.stats.currentHp = 1;
        warrior.stats.defense = 0;
        grunt.position = { x: warrior.position.x + 1, y: warrior.position.y };
        testOccupyTile(gameState.grid, grunt.position, grunt.id);

        expect(gameState.activeCharacterId).toBe(grunt.id);

        mockedRollDice.mockReturnValueOnce(18); 
        mockedRollDice.mockReturnValueOnce(3);  
        
        vi.runAllTimers(); // Trigger AI's action (which should call performAttack, then checkWinLoss)

        expect(warrior.isAlive).toBe(false);
        expect(gameState.isCombatOver).toBe(true);
        expect(gameState.winner).toBe(CharacterType.ENEMY);
        expect(mockShowGameMessage).toHaveBeenCalledWith("Defeat!", "Your party has been vanquished.", CharacterType.ENEMY);
    });
});

