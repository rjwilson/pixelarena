// src/main.ts
import {
    GRID_ROWS,
    GRID_COLS,
    TILE_SIZE,
    PLAYER_WARRIOR_CONFIG,
    PLAYER_MAGE_CONFIG,
    ENEMY_MELEE_CONFIG,
    ENEMY_RANGED_CONFIG,
    INITIAL_PARTY_SETUP,
    INITIAL_ENEMY_SETUP,
    MOVABLE_TILE_COLOR,
    ATTACKABLE_TILE_COLOR,
    SELECTED_TILE_COLOR,
    HOVER_TILE_COLOR
} from './config';
import { GameState, Character, GridPoint, CharacterType, ActionType, GameAction, VisualEffect } from './types';
import { createGrid, renderGrid, pixelToGridCoords, getTile, highlightTiles, getReachableTiles, getTargetableTiles, occupyTile } from './grid';
import { createCharacter, renderCharacter, moveCharacter as moveCharacterLogic, resetCharacterTurnActions } from './character';
import { initializeUI, updateCharacterDisplays, updateActionLog, updateTurnIndicator, updateActionButtons, showGameMessage, hideGameMessage, addMessageToActionLog } from './ui';
import { processAttack } from './combat';
import { getEnemyAIAction, AIActionDecision } from './ai';

// --- Global Game State ---
export let gameState: GameState; 

// --- Canvas and Context ---
let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;

// --- Temporary state for player interaction ---
let currentlySelectedTile: GridPoint | null = null;
let hoveredTile: GridPoint | null = null;
let reachableMovementTiles: GridPoint[] = [];
let attackableTargetTiles: GridPoint[] = []; // Used by player actions
let specialAbilityTargetTiles: GridPoint[] = [];

// --- Visual Effects ---
let visualEffects: VisualEffect[] = [];

/**
 * Initializes the entire game: sets up the canvas, game state, characters, and UI.
 */
export function initializeGame(): void {
    canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
        const errorMsg = "CRITICAL ERROR: Canvas element with ID 'game-canvas' not found in the DOM during initializeGame.";
        console.error(errorMsg);
        if (typeof process !== 'undefined' && process.env && (process.env.VITEST_WORKER_ID || process.env.NODE_ENV === 'test')) {
            throw new Error(errorMsg + " Check test's DOM setup (setupDOMProgrammatically).");
        }
        return; 
    }

    // @ts-ignore 
    ctx = canvas.getContext('2d');
    if (!ctx) {
        const errorMsg = "CRITICAL ERROR: Failed to get 2D rendering context from canvas.";
        console.error(errorMsg);
        if (typeof process !== 'undefined' && process.env && (process.env.VITEST_WORKER_ID || process.env.NODE_ENV === 'test')) {
            throw new Error(errorMsg + " Check test's canvas context mock.");
        }
        return;
    }

    canvas.width = GRID_COLS * TILE_SIZE;
    canvas.height = GRID_ROWS * TILE_SIZE;

    gameState = {
        characters: [],
        grid: createGrid(),
        turnOrder: [],
        currentTurnIndex: 0,
        activeCharacterId: null,
        selectedCharacterId: null,
        selectedAction: null,
        isPlayerTurn: true,
        isCombatOver: false,
        winner: null,
        actionLog: ["Game Started!"],
    };

    initializeUI(gameState, handleActionButtonClick, handleEndTurnClick, resetGame);

    INITIAL_PARTY_SETUP.forEach(setup => {
        let config;
        if (setup.configName === "Warrior") config = PLAYER_WARRIOR_CONFIG;
        else if (setup.configName === "Mage") config = PLAYER_MAGE_CONFIG;
        else { console.error(`Unknown player config name: ${setup.configName}`); return; }
        const playerChar = createCharacter(config, { x: setup.x, y: setup.y });
        gameState.characters.push(playerChar);
        occupyTile(gameState.grid, playerChar.position, playerChar.id);
    });

    INITIAL_ENEMY_SETUP.forEach(setup => {
        let config;
        if (setup.configName === "Goblin Grunt") config = ENEMY_MELEE_CONFIG;
        else if (setup.configName === "Goblin Archer") config = ENEMY_RANGED_CONFIG;
        else { console.error(`Unknown enemy config name: ${setup.configName}`); return; }
        const enemyChar = createCharacter(config, { x: setup.x, y: setup.y });
        gameState.characters.push(enemyChar);
        occupyTile(gameState.grid, enemyChar.position, enemyChar.id);
    });

    gameState.characters.sort((a, b) => b.stats.initiative - a.stats.initiative);
    gameState.turnOrder = gameState.characters.map(char => char.id);

    startTurn();

    addEventListeners();

    updateCharacterDisplays(gameState.characters);
    updateActionLog(gameState.actionLog);
    updateTurnIndicator(gameState.activeCharacterId ? gameState.characters.find(c => c.id === gameState.activeCharacterId) ?? null : null);
    updateActionButtonsForCurrentCharacter();

    console.log("Game Initialized");
    if (typeof requestAnimationFrame !== 'undefined') {
        gameLoop();
    }
}

function startTurn(): void {
    if (!gameState || gameState.isCombatOver) return; 

    gameState.activeCharacterId = gameState.turnOrder[gameState.currentTurnIndex];
    const activeCharacter = gameState.characters.find(c => c.id === gameState.activeCharacterId);

    if (!activeCharacter || !activeCharacter.isAlive) {
        endTurn();
        return;
    }

    resetCharacterTurnActions(activeCharacter);
    gameState.isPlayerTurn = activeCharacter.type === CharacterType.PLAYER;
    gameState.selectedCharacterId = activeCharacter.type === CharacterType.PLAYER ? activeCharacter.id : null;
    gameState.selectedAction = null;
    currentlySelectedTile = null;
    clearHighlights();

    addMessageToActionLog(`${activeCharacter.name}'s turn.`, gameState);
    updateTurnIndicator(activeCharacter);
    updateActionButtonsForCurrentCharacter();

    if (activeCharacter.type === CharacterType.PLAYER) {
        console.log(`${activeCharacter.name}'s turn (Player).`);
    } else {
        console.log(`${activeCharacter.name}'s turn (Enemy).`);
        updateActionButtonsForCurrentCharacter();
        if (typeof setTimeout !== 'undefined') {
            setTimeout(() => processEnemyActionPhase(activeCharacter), 500);
        } else {
            processEnemyActionPhase(activeCharacter);
        }
    }
}

function processEnemyActionPhase(enemyCharacter: Character): void {
    if (!gameState || !enemyCharacter.isAlive || gameState.isCombatOver || enemyCharacter.type === CharacterType.PLAYER) {
        if (enemyCharacter.type !== CharacterType.PLAYER && (!enemyCharacter.isAlive || (gameState && gameState.isCombatOver))) {
            if (gameState && gameState.activeCharacterId === enemyCharacter.id) endTurn();
        }
        return;
    }

    if (!enemyCharacter.canMove && !enemyCharacter.canAct) {
        addMessageToActionLog(`${enemyCharacter.name} has no more actions or moves.`, gameState);
        if (typeof setTimeout !== 'undefined') setTimeout(() => { if (gameState.activeCharacterId === enemyCharacter.id) endTurn(); }, 10); else { if (gameState.activeCharacterId === enemyCharacter.id) endTurn(); }
        return;
    }

    const decision = getEnemyAIAction(enemyCharacter, gameState);
    let actionTakenThisPhase = false;

    if (decision) {
        switch (decision.type) {
            case 'move':
                if (decision.targetPosition && enemyCharacter.canMove) {
                    addMessageToActionLog(`${enemyCharacter.name} moves to (${decision.targetPosition.x}, ${decision.targetPosition.y}).`, gameState);
                    moveCharacterLogic(enemyCharacter, decision.targetPosition, gameState.grid);
                    actionTakenThisPhase = true;
                } else {
                    actionTakenThisPhase = true; 
                    addMessageToActionLog(`${enemyCharacter.name} decided to move but cannot.`, gameState);
                }
                break;
            case 'attack':
                if (decision.targetId && decision.actionToUse && enemyCharacter.canAct) {
                    const target = gameState.characters.find(c => c.id === decision.targetId);
                    if (target) {
                        performAttack(enemyCharacter, target, decision.actionToUse);
                        actionTakenThisPhase = true;
                    } else {
                        actionTakenThisPhase = true; 
                        addMessageToActionLog(`${enemyCharacter.name} tries to attack ${decision.targetId} with ${decision.actionToUse.name} but target not found.`, gameState);
                    }
                } else {
                     actionTakenThisPhase = true; 
                     addMessageToActionLog(`${enemyCharacter.name} decided to attack but cannot.`, gameState);
                }
                break;
            case 'special':
                if (decision.targetId && decision.actionToUse && enemyCharacter.canAct) {
                    const target = gameState.characters.find(c => c.id === decision.targetId);
                    if (target) {
                        performSpecialAbility(enemyCharacter, target, decision.actionToUse);
                        actionTakenThisPhase = true;
                    } else {
                        actionTakenThisPhase = true; 
                        addMessageToActionLog(`${enemyCharacter.name} tries to use ${decision.actionToUse.name} on ${decision.targetId} but target not found.`, gameState);
                    }
                } else {
                    actionTakenThisPhase = true; 
                    addMessageToActionLog(`${enemyCharacter.name} decided to use special ability but cannot.`, gameState);
                }
                break;
            case 'wait':
                addMessageToActionLog(`${enemyCharacter.name} waits.`, gameState);
                enemyCharacter.canAct = false;
                actionTakenThisPhase = true;
                break;
        }
    } else {
        addMessageToActionLog(`${enemyCharacter.name} is unable to decide on an action.`, gameState);
        actionTakenThisPhase = true; 
    }

    updateCharacterDisplays(gameState.characters);
    checkWinLossConditions(); 

    if (gameState.isCombatOver) return;

    const continueTurn = () => processEnemyActionPhase(enemyCharacter);
    const endAITurn = () => { if (gameState.activeCharacterId === enemyCharacter.id) endTurn(); };

    if (decision?.type === 'move' && enemyCharacter.canAct && actionTakenThisPhase) {
        addMessageToActionLog(`${enemyCharacter.name} considers an action after moving.`, gameState);
        if (typeof setTimeout !== 'undefined') setTimeout(continueTurn, 750); else continueTurn();
    }
    else if ((decision?.type === 'attack' || decision?.type === 'special') && enemyCharacter.canMove && actionTakenThisPhase) {
        addMessageToActionLog(`${enemyCharacter.name} considers moving after acting.`, gameState);
        if (typeof setTimeout !== 'undefined') setTimeout(continueTurn, 750); else continueTurn();
    }
    else { 
        if (typeof setTimeout !== 'undefined') setTimeout(endAITurn, 1000); else endAITurn();
    }
}

function endTurn(): void {
    if (!gameState || (gameState.isCombatOver && gameState.activeCharacterId === null)) return;

    const activeCharBeforeEnd = gameState.characters.find(c => c.id === gameState.activeCharacterId);
    if (activeCharBeforeEnd) {
         addMessageToActionLog(`${activeCharBeforeEnd.name} ends their turn.`, gameState);
    } else if (gameState.activeCharacterId) {
        addMessageToActionLog(`Turn ends for ${gameState.activeCharacterId}.`, gameState);
    }

    gameState.currentTurnIndex = (gameState.currentTurnIndex + 1) % gameState.turnOrder.length;
    clearHighlightsAndSelection();
    gameState.selectedAction = null;
    gameState.activeCharacterId = null;

    checkWinLossConditions(); 
    if (!gameState.isCombatOver) {
        startTurn();
    } else {
        updateCharacterDisplays(gameState.characters);
        updateActionLog(gameState.actionLog);
        updateTurnIndicator(null);
        updateActionButtons(null, false, null);
        console.log("Combat is over. Winner:", gameState.winner);
    }
}

function gameLoop(timestamp?: number): void {
    if (!gameState) return; 

    if (gameState.isCombatOver && !document.getElementById('game-message-box')?.classList.contains('hidden')) {
        //
    }

    if (ctx) { 
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#2D3748";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        renderGrid(ctx, gameState);

        if (hoveredTile) {
            highlightTiles(ctx, [hoveredTile], HOVER_TILE_COLOR);
        }
        if (currentlySelectedTile && gameState.isPlayerTurn) {
            highlightTiles(ctx, [currentlySelectedTile], SELECTED_TILE_COLOR);
        }

        if (gameState.isPlayerTurn && gameState.selectedAction) {
            if (gameState.selectedAction.type === ActionType.MOVE) {
                highlightTiles(ctx, reachableMovementTiles, MOVABLE_TILE_COLOR);
            } else if (gameState.selectedAction.type === ActionType.ATTACK) {
                highlightTiles(ctx, attackableTargetTiles, ATTACKABLE_TILE_COLOR);
            } else if (gameState.selectedAction.type === ActionType.SPECIAL_ABILITY) {
                highlightTiles(ctx, specialAbilityTargetTiles, ATTACKABLE_TILE_COLOR);
            }
        }

        gameState.characters.forEach(char => {
            renderCharacter(
                ctx,
                char,
                char.id === gameState.selectedCharacterId && char.type === CharacterType.PLAYER,
                char.id === gameState.activeCharacterId
            );
        });

        const now = Date.now();
        visualEffects = visualEffects.filter(effect => {
            if (now > effect.startTime + effect.duration) return false;
            if (effect.animation) {
                effect.animation(ctx, effect, now);
            } else {
                ctx.font = `bold ${TILE_SIZE * 0.4}px "Press Start 2P"`;
                ctx.fillStyle = effect.color || 'white';
                ctx.textAlign = 'center';
                const effectX = (effect.position.x + 0.5) * TILE_SIZE;
                let effectY = (effect.position.y + 0.5) * TILE_SIZE;
                const progress = (now - effect.startTime) / effect.duration;
                effectY -= progress * TILE_SIZE * 0.5;
                ctx.globalAlpha = Math.max(0, 1 - progress * progress);
                ctx.fillText(effect.text || '', effectX, effectY);
                ctx.globalAlpha = 1.0;
            }
            return true;
        });
    }
    
    if (typeof requestAnimationFrame !== 'undefined') {
        if (!gameState.isCombatOver) { 
            requestAnimationFrame(gameLoop);
        }
     }
}

function addEventListeners(): void {
    if (canvas) { 
        canvas.addEventListener('click', handleCanvasClick);
        canvas.addEventListener('mousemove', handleCanvasMouseMove);
    }
}

export function handleCanvasClick(event: MouseEvent): void {
    if (!gameState || gameState.isCombatOver || !gameState.isPlayerTurn) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    const clickedGridPos = pixelToGridCoords(clickX, clickY);
    if (!clickedGridPos) return;

    const activePlayerCharacter = gameState.characters.find(c => c.id === gameState.activeCharacterId && c.type === CharacterType.PLAYER);
    if (!activePlayerCharacter || !activePlayerCharacter.isAlive) return;

    currentlySelectedTile = clickedGridPos;

    const clickedTile = getTile(gameState.grid, clickedGridPos.x, clickedGridPos.y);
    if (!clickedTile) return;

    if (gameState.selectedAction) {
        switch (gameState.selectedAction.type) {
            case ActionType.MOVE:
                if (activePlayerCharacter.canMove && reachableMovementTiles.some(p => p.x === clickedGridPos.x && p.y === clickedGridPos.y)) {
                    if (!clickedTile.isOccupied || (clickedTile.isOccupied && clickedTile.occupyingCharacterId === activePlayerCharacter.id)) {
                        addMessageToActionLog(`${activePlayerCharacter.name} moves to (${clickedGridPos.x}, ${clickedGridPos.y}).`, gameState);
                        moveCharacterLogic(activePlayerCharacter, clickedGridPos, gameState.grid);
                        clearHighlightsAndSelection();
                        updateActionButtonsForCurrentCharacter();
                    } else {
                        addMessageToActionLog("Cannot move to an occupied tile.", gameState);
                    }
                } else {
                    addMessageToActionLog("Cannot move there or already moved.", gameState);
                }
                break;
            case ActionType.ATTACK:
            case ActionType.SPECIAL_ABILITY:
                const targetCharacter = gameState.characters.find(c => c.position.x === clickedGridPos.x && c.position.y === clickedGridPos.y && c.isAlive && c.targetable);
                const targetableSet = gameState.selectedAction.type === ActionType.ATTACK ? attackableTargetTiles : specialAbilityTargetTiles;

                if (activePlayerCharacter.canAct && targetableSet.some(p => p.x === clickedGridPos.x && p.y === clickedGridPos.y)) {
                    if (targetCharacter && targetCharacter.type !== activePlayerCharacter.type) {
                        if (gameState.selectedAction.type === ActionType.ATTACK) {
                            performAttack(activePlayerCharacter, targetCharacter, gameState.selectedAction);
                        } else {
                            performSpecialAbility(activePlayerCharacter, targetCharacter, gameState.selectedAction);
                        }
                        clearHighlightsAndSelection();
                        updateActionButtonsForCurrentCharacter();
                    } else if (targetCharacter && targetCharacter.type === activePlayerCharacter.type) {
                        addMessageToActionLog("Cannot target friendly characters with this action.", gameState);
                    } else {
                        addMessageToActionLog("No valid target on that tile for this action.", gameState);
                    }
                } else {
                     addMessageToActionLog("Target out of range or action not available.", gameState);
                }
                break;
        }
    } else {
        const characterOnTile = gameState.characters.find(c => c.position.x === clickedGridPos.x && c.position.y === clickedGridPos.y && c.isAlive);
        if (characterOnTile && characterOnTile.type === CharacterType.PLAYER && characterOnTile.id === activePlayerCharacter.id) {
            gameState.selectedCharacterId = characterOnTile.id;
            addMessageToActionLog(`Selected ${characterOnTile.name}. Choose an action.`, gameState);
            updateActionButtonsForCurrentCharacter();
        } else if (characterOnTile) {
            addMessageToActionLog(`Tile (${clickedGridPos.x}, ${clickedGridPos.y}) contains ${characterOnTile.name}.`, gameState);
        } else {
            addMessageToActionLog(`Selected empty tile (${clickedGridPos.x}, ${clickedGridPos.y}).`, gameState);
        }
    }
    updateCharacterDisplays(gameState.characters);
}

export function handleCanvasMouseMove(event: MouseEvent): void {
    if (!gameState || gameState.isCombatOver || !gameState.isPlayerTurn) {
        hoveredTile = null;
        return;
    }
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    hoveredTile = pixelToGridCoords(mouseX, mouseY);
}

export function handleActionButtonClick(actionType: ActionType | 'SPECIAL' | 'END_TURN'): void {
    if (!gameState || gameState.isCombatOver || !gameState.isPlayerTurn) return;

    const activeCharacter = gameState.characters.find(c => c.id === gameState.activeCharacterId);
    if (!activeCharacter || !activeCharacter.isAlive) return;

    if (actionType === 'END_TURN') {
        handleEndTurnClick();
        return;
    }
    
    clearHighlights();
    currentlySelectedTile = null; 

    let gameActionToSelect: GameAction | undefined;

    switch (actionType) {
        case ActionType.MOVE:
            if (activeCharacter.canMove) {
                gameState.selectedAction = { name: "Move", type: ActionType.MOVE, description: "Move to a new tile."};
                reachableMovementTiles = getReachableTiles(activeCharacter.position, activeCharacter.stats.speed, gameState.grid, gameState.characters);
                addMessageToActionLog(`${activeCharacter.name} selected Move. Click a green tile.`, gameState);
            } else {
                addMessageToActionLog(`${activeCharacter.name} has already moved this turn.`, gameState);
                gameState.selectedAction = null;
            }
            break;
        case ActionType.ATTACK:
            gameActionToSelect = activeCharacter.actions.find(a => a.type === ActionType.ATTACK);
            if (activeCharacter.canAct && gameActionToSelect) {
                gameState.selectedAction = gameActionToSelect;
                attackableTargetTiles = getTargetableTiles(activeCharacter.position, gameActionToSelect.range || 1, gameState.grid)
                                        .filter(p => {
                                            const tile = getTile(gameState.grid, p.x, p.y);
                                            return tile && tile.isOccupied && gameState.characters.find(c => c.id === tile.occupyingCharacterId && c.type === CharacterType.ENEMY);
                                        });
                addMessageToActionLog(`${activeCharacter.name} selected ${gameActionToSelect.name}. Click an enemy in a red tile.`, gameState);
            } else {
                 addMessageToActionLog(activeCharacter.canAct ? `${activeCharacter.name} has no attack action.` : `${activeCharacter.name} has already acted this turn.`, gameState);
                gameState.selectedAction = null;
            }
            break;
        case 'SPECIAL': 
             gameActionToSelect = activeCharacter.actions.find(a => a.type === ActionType.SPECIAL_ABILITY);
            if (activeCharacter.canAct && gameActionToSelect) {
                gameState.selectedAction = gameActionToSelect;
                 specialAbilityTargetTiles = getTargetableTiles(activeCharacter.position, gameActionToSelect.range || 1, gameState.grid)
                                        .filter(p => { 
                                            const tile = getTile(gameState.grid, p.x, p.y);
                                            if (!tile) return false;
                                            if (gameActionToSelect?.damage) {
                                                return tile.isOccupied && gameState.characters.find(c => c.id === tile.occupyingCharacterId && c.type === CharacterType.ENEMY && c.isAlive);
                                            }
                                            return tile.isOccupied && gameState.characters.find(c => c.id === tile.occupyingCharacterId && c.isAlive);
                                        });
                addMessageToActionLog(`${activeCharacter.name} selected ${gameActionToSelect.name}. Click a target in a red tile.`, gameState);
            } else {
                addMessageToActionLog(activeCharacter.canAct ? `${activeCharacter.name} has no special ability or cannot use it.` : `${activeCharacter.name} has already acted this turn.`, gameState);
                gameState.selectedAction = null;
            }
            break;
    }
    updateActionButtonsForCurrentCharacter();
}

function handleEndTurnClick(): void {
    if (!gameState || gameState.isCombatOver || !gameState.isPlayerTurn) return;
    endTurn();
}

function performAttack(attacker: Character, target: Character, action: GameAction): void {
    if (!attacker.canAct) {
        addMessageToActionLog(`${attacker.name} cannot act anymore this turn.`, gameState);
        return;
    }

    const attackResult = processAttack(attacker, target, action, addVisualEffect);
    addMessageToActionLog(attackResult.logMessage, gameState);
    
    attacker.canAct = false;
    updateCharacterDisplays(gameState.characters);
    checkWinLossConditions();
    updateActionButtonsForCurrentCharacter();
}

function performSpecialAbility(caster: Character, target: Character, action: GameAction): void {
    if (!caster.canAct) {
        addMessageToActionLog(`${caster.name} cannot act anymore this turn.`, gameState);
        return;
    }
    
    if (action.name === "Power Attack" && caster.name === "Warrior") {
        const attackResult = processAttack(caster, target, action, addVisualEffect);
        addMessageToActionLog(attackResult.logMessage, gameState);
        caster.canMove = false;
    }
    else if (action.name === "Firebolt" && caster.name === "Mage") {
        const attackResult = processAttack(caster, target, action, addVisualEffect);
        addMessageToActionLog(attackResult.logMessage, gameState);
    } else {
        addMessageToActionLog(`${caster.name} uses ${action.name} on ${target.name}! (Generic effect).`, gameState);
        if (action.effect) {
            action.effect(target, caster);
        }
    }

    caster.canAct = false;
    updateCharacterDisplays(gameState.characters);
    checkWinLossConditions();
    updateActionButtonsForCurrentCharacter();
}

function addVisualEffect(effect: Omit<VisualEffect, 'id' | 'startTime'>): void {
    visualEffects.push({
        ...effect,
        id: `vfx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        startTime: Date.now(),
    });
}

function clearHighlightsAndSelection(): void {
    if (!gameState) return; 
    reachableMovementTiles = [];
    attackableTargetTiles = [];
    specialAbilityTargetTiles = [];
    gameState.selectedAction = null;
    currentlySelectedTile = null; 
    updateActionButtonsForCurrentCharacter();
}

function clearHighlights(): void {
    reachableMovementTiles = [];
    attackableTargetTiles = [];
    specialAbilityTargetTiles = [];
}

function updateActionButtonsForCurrentCharacter(): void {
    if (!gameState) return; 
    const activeCharacter = gameState.characters.find(c => c.id === gameState.activeCharacterId);
    updateActionButtons(activeCharacter ?? null, gameState.isPlayerTurn, gameState.selectedAction);
}

function checkWinLossConditions(): void {
    if (!gameState || gameState.isCombatOver) return;

    const alivePlayers = gameState.characters.filter(c => c.type === CharacterType.PLAYER && c.isAlive);
    const aliveEnemies = gameState.characters.filter(c => c.type === CharacterType.ENEMY && c.isAlive);

    if (alivePlayers.length === 0) {
        gameState.isCombatOver = true;
        gameState.winner = CharacterType.ENEMY;
        addMessageToActionLog("All player characters have fallen! Game Over - Enemies Win!", gameState);
        showGameMessage("Defeat!", "Your party has been vanquished.", CharacterType.ENEMY);
    } else if (aliveEnemies.length === 0) {
        gameState.isCombatOver = true;
        gameState.winner = CharacterType.PLAYER;
        addMessageToActionLog("All enemies defeated! Victory!", gameState);
        showGameMessage("Victory!", "You have defeated all enemies!", CharacterType.PLAYER);
    }
}

function resetGame(): void {
    console.log("Resetting game...");
    hideGameMessage();
    visualEffects = [];
    clearHighlightsAndSelection();
    initializeGame();
}

// --- Test Hooks ---
export function getGameState_TEST_HOOK(): GameState {
    return gameState;
}

export function clearVisualEffects_TEST_HOOK(): void {
    visualEffects = [];
}

export function getAttackableTargetTiles_TEST_HOOK(): GridPoint[] {
    return attackableTargetTiles;
}
