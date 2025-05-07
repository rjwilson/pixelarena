// src/ai.ts
import { Character, GameState, GridPoint, ActionType, CharacterType, GameAction } from './types';
import { getReachableTiles, findCharactersInRange, getTile, isWithinGrid } from './grid';

export interface AIActionDecision {
    type: 'move' | 'attack' | 'special' | 'wait';
    targetId?: string;        // For attack/special
    targetPosition?: GridPoint; // For move
    actionToUse?: GameAction; // The specific GameAction object to use
}

export function getEnemyAIAction(aiCharacter: Character, gameState: GameState): AIActionDecision | null {
    if (!aiCharacter.isAlive) return null;

    const playerCharacters = gameState.characters.filter(c => c.type === CharacterType.PLAYER && c.isAlive);
    if (playerCharacters.length === 0) return { type: 'wait' };

    // Sort players by HP (ascending), then by distance from AI (ascending) as a tie-breaker
    const sortedPlayerTargetsGlobal = [...playerCharacters].sort((a, b) => {
        if (a.stats.currentHp !== b.stats.currentHp) {
            return a.stats.currentHp - b.stats.currentHp;
        }
        const distA = Math.abs(aiCharacter.position.x - a.position.x) + Math.abs(aiCharacter.position.y - a.position.y);
        const distB = Math.abs(aiCharacter.position.x - b.position.x) + Math.abs(aiCharacter.position.y - b.position.y);
        return distA - distB;
    });
    // console.log(`AI (${aiCharacter.name}) sorted global targets:`, sortedPlayerTargetsGlobal.map(t => ({ name: t.name, hp: t.stats.currentHp, pos: t.position })));


    // --- 1. Attempt to use an action (Special Ability or Attack) if possible from CURRENT position ---
    if (aiCharacter.canAct) {
        // Prioritize offensive special abilities
        const specialAbilities = aiCharacter.actions.filter(a => a.type === ActionType.SPECIAL_ABILITY && a.range && (a.damage || a.effect));
        for (const special of specialAbilities) {
            // Check against all potential targets, sorted by global preference
            const targetsInRange = findCharactersInRange(aiCharacter.position, special.range!, sortedPlayerTargetsGlobal, false);
            if (targetsInRange.length > 0) {
                // console.log(`AI (${aiCharacter.name}) can use SPECIAL (${special.name}) on ${targetsInRange[0].name} from current position.`);
                return { type: 'special', targetId: targetsInRange[0].id, actionToUse: special };
            }
        }

        // Then try standard attacks
        const attackActions = aiCharacter.actions.filter(a => a.type === ActionType.ATTACK && a.range);
        for (const attack of attackActions) {
            const targetsInRange = findCharactersInRange(aiCharacter.position, attack.range!, sortedPlayerTargetsGlobal, false);
            if (targetsInRange.length > 0) {
                // console.log(`AI (${aiCharacter.name}) can ATTACK (${attack.name}) ${targetsInRange[0].name} from current position.`);
                return { type: 'attack', targetId: targetsInRange[0].id, actionToUse: attack };
            }
        }
    }

    // --- 2. Attempt to MOVE then ACT (if still has action) ---
    if (aiCharacter.canMove) {
        const reachableTiles = getReachableTiles(aiCharacter.position, aiCharacter.stats.speed, gameState.grid, gameState.characters);
        let bestMoveForAction: { movePos: GridPoint; actionDecision: AIActionDecision; score: number } | null = null;

        for (const movePos of reachableTiles) {
            if (!aiCharacter.canAct) break; // No point evaluating actions if AI cannot act after moving

            // Simulate being at movePos to check for actions
            // Prioritize special abilities from new position
            const specialAbilities = aiCharacter.actions.filter(a => a.type === ActionType.SPECIAL_ABILITY && a.range && (a.damage || a.effect));
            for (const special of specialAbilities) {
                const targetsFromNewPos = findCharactersInRange(movePos, special.range!, sortedPlayerTargetsGlobal, false);
                if (targetsFromNewPos.length > 0) {
                    const target = targetsFromNewPos[0];
                    const score = 1000 + (100 - (target.stats.currentHp / target.stats.maxHp) * 100) - (Math.abs(movePos.x - aiCharacter.position.x) + Math.abs(movePos.y - aiCharacter.position.y)); // Prefer closer moves
                    if (bestMoveForAction === null || score > bestMoveForAction.score) {
                        bestMoveForAction = {
                            movePos,
                            actionDecision: { type: 'special', targetId: target.id, actionToUse: special },
                            score
                        };
                    }
                    // Found a special for this movePos, might be improved by another movePos but don't check other specials from *this* movePos
                    // break; // Potentially break if one special is "good enough" or continue to find best special from this spot
                }
            }

            // If no special ability found from this movePos, check standard attacks
            if (bestMoveForAction === null || (bestMoveForAction.movePos.x !== movePos.x || bestMoveForAction.movePos.y !== movePos.y) || bestMoveForAction.actionDecision.type !== 'special') {
                const attackActions = aiCharacter.actions.filter(a => a.type === ActionType.ATTACK && a.range);
                for (const attack of attackActions) {
                    const targetsFromNewPos = findCharactersInRange(movePos, attack.range!, sortedPlayerTargetsGlobal, false);
                    if (targetsFromNewPos.length > 0) {
                        const target = targetsFromNewPos[0];
                        const score = 800 + (100 - (target.stats.currentHp / target.stats.maxHp) * 100) - (Math.abs(movePos.x - aiCharacter.position.x) + Math.abs(movePos.y - aiCharacter.position.y)); // Prefer closer moves
                        if (bestMoveForAction === null || score > bestMoveForAction.score) {
                            bestMoveForAction = {
                                movePos,
                                actionDecision: { type: 'attack', targetId: target.id, actionToUse: attack },
                                score
                            };
                        }
                        // break; // Potentially break
                    }
                }
            }
        }

        if (bestMoveForAction) {
            // console.log(`AI (${aiCharacter.name}) chose to MOVE to ${JSON.stringify(bestMoveForAction.movePos)} to then ${bestMoveForAction.actionDecision.type} ${bestMoveForAction.actionDecision.targetId}`);
            return { type: 'move', targetPosition: bestMoveForAction.movePos };
        }

        // --- 3. If no action possible even after moving, move towards GEOGRAPHICALLY CLOSEST player ---
        // This part is reached if bestMoveForAction is still null (no move leads to an attack/special)
        let bestMoveToGetCloser: { movePos: GridPoint; score: number } | null = null;

        // Find the GEOGRAPHICALLY closest player
        let geographicallyClosestPlayer: Character | null = null;
        let minGeoDistance = Infinity;
        for (const player of playerCharacters) {
            const dist = Math.abs(aiCharacter.position.x - player.position.x) + Math.abs(aiCharacter.position.y - player.position.y);
            if (dist < minGeoDistance) {
                minGeoDistance = dist;
                geographicallyClosestPlayer = player;
            }
        }

        if (geographicallyClosestPlayer) {
            // console.log(`AI (${aiCharacter.name}) is just moving. Geographically closest target: ${geographicallyClosestPlayer.name} at dist ${minGeoDistance}`);
            const originalDistanceToGeoTarget = minGeoDistance;

            for (const movePos of reachableTiles) {
                const distToGeoTargetFromMovePos = Math.abs(movePos.x - geographicallyClosestPlayer.position.x) + Math.abs(movePos.y - geographicallyClosestPlayer.position.y);
                let currentScore = 0;

                if (distToGeoTargetFromMovePos < originalDistanceToGeoTarget) {
                    currentScore = 200 - distToGeoTargetFromMovePos * 5 - (Math.abs(movePos.x - aiCharacter.position.x) + Math.abs(movePos.y - aiCharacter.position.y)); // Higher score for strictly closer tiles, factor in move cost
                } else {
                    currentScore = 100 - distToGeoTargetFromMovePos * 5 - (Math.abs(movePos.x - aiCharacter.position.x) + Math.abs(movePos.y - aiCharacter.position.y)); // Lower base score if not strictly closer
                }

                if (bestMoveToGetCloser === null || currentScore > bestMoveToGetCloser.score) {
                    bestMoveToGetCloser = { movePos, score: currentScore };
                }
            }
        }

        if (bestMoveToGetCloser) {
            // console.log(`AI (${aiCharacter.name}) chose to MOVE to ${JSON.stringify(bestMoveToGetCloser.movePos)} just to get closer.`);
            return { type: 'move', targetPosition: bestMoveToGetCloser.movePos };
        }
    }

    // --- 4. If no other action (or cannot move), wait ---
    // console.log(`AI (${aiCharacter.name}) decides to WAIT.`);
    return { type: 'wait' };
}

