// src/ai.ts
import { Character, GameState, GridPoint, ActionType, CharacterType, GameAction } from './types';
import { getReachableTiles, findCharactersInRange, getTile, isWithinGrid } from './grid';

export interface AIActionDecision {
    type: 'move' | 'attack' | 'special' | 'wait';
    targetId?: string;        // For attack/special
    targetPosition?: GridPoint; // For move
    actionToUse?: GameAction; // The specific GameAction object to use
}

/**
 * Determines the AI's next action based on a more refined logic.
 *
 * AI Behavior Priority:
 * 1. If can use an offensive special ability on a player in range, do it.
 * 2. If can use a standard attack on a player in range, do it.
 * 3. If can move to a position to attack a player this turn (special or standard), do it.
 * 4. If cannot attack this turn, move towards the nearest player.
 * 5. If no actions are possible, wait.
 *
 * Target Prioritization:
 * - Prefers targets with lower current HP.
 * - If HP is similar, prefers closer targets.
 *
 * @param aiCharacter The AI character making the decision.
 * @param gameState The current state of the game.
 * @returns An AIActionDecision object or null if no action can be taken.
 */
export function getEnemyAIAction(aiCharacter: Character, gameState: GameState): AIActionDecision | null {
    if (!aiCharacter.isAlive) return null;

    const playerCharacters = gameState.characters.filter(c => c.type === CharacterType.PLAYER && c.isAlive);
    if (playerCharacters.length === 0) return { type: 'wait' }; // No targets

    // Sort players by HP (ascending), then by distance (ascending) as a tie-breaker
    const sortedPlayerTargets = [...playerCharacters].sort((a, b) => {
        if (a.stats.currentHp !== b.stats.currentHp) {
            return a.stats.currentHp - b.stats.currentHp;
        }
        const distA = Math.abs(aiCharacter.position.x - a.position.x) + Math.abs(aiCharacter.position.y - a.position.y);
        const distB = Math.abs(aiCharacter.position.x - b.position.x) + Math.abs(aiCharacter.position.y - b.position.y);
        return distA - distB;
    });

    // --- Attempt to use an action (Special Ability or Attack) if possible from current position ---
    if (aiCharacter.canAct) {
        // Prioritize offensive special abilities
        const specialAbilities = aiCharacter.actions.filter(a => a.type === ActionType.SPECIAL_ABILITY && a.range && (a.damage || a.effect)); // Assuming damage or effect implies offensive
        for (const special of specialAbilities) {
            const targetsInRange = findCharactersInRange(aiCharacter.position, special.range!, sortedPlayerTargets, false);
            if (targetsInRange.length > 0) {
                return { type: 'special', targetId: targetsInRange[0].id, actionToUse: special };
            }
        }

        // Then try standard attacks
        const attackActions = aiCharacter.actions.filter(a => a.type === ActionType.ATTACK && a.range);
        for (const attack of attackActions) {
            const targetsInRange = findCharactersInRange(aiCharacter.position, attack.range!, sortedPlayerTargets, false);
            if (targetsInRange.length > 0) {
                return { type: 'attack', targetId: targetsInRange[0].id, actionToUse: attack };
            }
        }
    }

    // --- Attempt to move then act (if still has action) ---
    if (aiCharacter.canMove) {
        const reachableTiles = getReachableTiles(aiCharacter.position, aiCharacter.stats.speed, gameState.grid, gameState.characters);
        let bestMoveOption: { movePos: GridPoint; action?: AIActionDecision } | null = null;
        let bestMoveScore = -Infinity; // Higher is better (e.g., can attack after move)

        for (const movePos of reachableTiles) {
            // Temporarily simulate being at movePos to check for actions
            const tempAiPosition = movePos;
            let currentScore = 0; // Score this potential move

            // Can we act after moving?
            if (aiCharacter.canAct) {
                 // Check special abilities from new position
                const specialAbilities = aiCharacter.actions.filter(a => a.type === ActionType.SPECIAL_ABILITY && a.range && (a.damage || a.effect));
                for (const special of specialAbilities) {
                    const targetsFromNewPos = findCharactersInRange(tempAiPosition, special.range!, sortedPlayerTargets, false);
                    if (targetsFromNewPos.length > 0) {
                        currentScore = 100 - (targetsFromNewPos[0].stats.currentHp / targetsFromNewPos[0].stats.maxHp) * 50; // Higher score for lower HP target
                        if (currentScore > bestMoveScore) {
                            bestMoveScore = currentScore;
                            bestMoveOption = { movePos, action: { type: 'special', targetId: targetsFromNewPos[0].id, actionToUse: special }};
                        }
                    }
                }
                // Check attacks from new position (if no better special found)
                if (currentScore <= bestMoveScore || !bestMoveOption?.action || bestMoveOption.action.type !== 'special') { // only check attacks if special wasn't better
                    const attackActions = aiCharacter.actions.filter(a => a.type === ActionType.ATTACK && a.range);
                    for (const attack of attackActions) {
                        const targetsFromNewPos = findCharactersInRange(tempAiPosition, attack.range!, sortedPlayerTargets, false);
                        if (targetsFromNewPos.length > 0) {
                            currentScore = 80 - (targetsFromNewPos[0].stats.currentHp / targetsFromNewPos[0].stats.maxHp) * 40;
                             if (currentScore > bestMoveScore) {
                                bestMoveScore = currentScore;
                                bestMoveOption = { movePos, action: { type: 'attack', targetId: targetsFromNewPos[0].id, actionToUse: attack }};
                            }
                        }
                    }
                }
            }
            
            // If no action possible after moving from this tile, score based on proximity to closest target
            if (!bestMoveOption || (bestMoveOption.movePos.x !== movePos.x || bestMoveOption.movePos.y !== movePos.y) || !bestMoveOption.action) {
                 if (sortedPlayerTargets.length > 0) {
                    const closestTarget = sortedPlayerTargets[0];
                    const distToTarget = Math.abs(movePos.x - closestTarget.position.x) + Math.abs(movePos.y - closestTarget.position.y);
                    currentScore = 50 - distToTarget * 5; // Closer is better
                    if (currentScore > bestMoveScore) {
                        bestMoveScore = currentScore;
                        bestMoveOption = { movePos, action: undefined }; // Just move, no immediate action after
                    }
                }
            }
        }

        if (bestMoveOption) {
            // If the best move leads to an action, the AI will move then `main.ts` needs to re-evaluate for the action.
            // For now, this function returns the move. The main game loop will handle the subsequent action if `canAct` is still true.
            // Or, we can make AI return a sequence: [move, attack/special]
            // Let's return just the move for now, and AI will re-evaluate action in its next "thought" if it moved.
            // This is simpler for the current game loop structure.
             const tileToMove = getTile(gameState.grid, bestMoveOption.movePos.x, bestMoveOption.movePos.y);
             if (tileToMove && (!tileToMove.isOccupied || tileToMove.occupyingCharacterId === aiCharacter.id)) {
                // If the best move also identified a subsequent action, we could return that too,
                // but main.ts currently handles AI actions in discrete steps.
                // So, just return the move. If AI still `canAct` after moving, `getEnemyAIAction` will be called again.
                // This is slightly inefficient but fits the current structure.
                // A better way: if bestMoveOption.action exists, it means AI plans to move AND act.
                // However, the current `enemyTurn` in main.ts calls `getEnemyAIAction` once, performs the action,
                // then if it was a move and AI can still act, it calls `getEnemyAIAction` again. This is fine.

                return { type: 'move', targetPosition: bestMoveOption.movePos };
             }
        }
    }

    // --- If no other action, wait ---
    // This also covers the case where aiCharacter.canAct and aiCharacter.canMove are both false.
    return { type: 'wait' };
}

