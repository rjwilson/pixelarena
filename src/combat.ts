// src/combat.ts
import {
    Character,
    GameAction,
    ActionType, // Not directly used in processAttack but good for context
    VisualEffect
} from './types';
import {
    rollDice,
    TILE_SIZE,
    D20_CRITICAL_HIT_THRESHOLD,
    D20_CRITICAL_MISS_THRESHOLD,
    DAMAGE_TEXT_COLOR,
    DAMAGE_TEXT_CRIT_COLOR,
    MISS_TEXT_COLOR,
    VFX_DURATION
} from './config';
import { applyDamage } from './character';

export interface AttackResult {
    hit: boolean;
    crit: boolean;
    miss: boolean;
    damageDealt: number;
    logMessage: string;
}

/**
 * Processes an attack action between two characters.
 * @param attacker The character performing the attack.
 * @param target The character being attacked.
 * @param action The attack action being used (contains damage function, range, etc.).
 * @param addVisualEffect A callback to add visual effects to the screen.
 * @returns AttackResult object with details of the attack.
 */
export function processAttack(
    attacker: Character,
    target: Character,
    action: GameAction,
    addVisualEffect: (effect: Omit<VisualEffect, 'id' | 'startTime'>) => void
): AttackResult {
    let logMessage = `${attacker.name} uses ${action.name} against ${target.name}.`;
    const result: AttackResult = {
        hit: false,
        crit: false,
        miss: false,
        damageDealt: 0,
        logMessage: "", // Will be populated
    };

    // --- Attack Roll ---
    const attackRollD20 = rollDice(20); // The raw d20 roll
    let attackBonus = 0; // Placeholder for character's base attack bonus (e.g., from STR/DEX + proficiency)
                       // For this prototype, we'll keep it simple and assume actions might have inherent bonuses.

    // Apply action-specific bonuses, like the Warrior's Power Attack +5 to hit.
    if (action.name === "Power Attack" && attacker.name === "Warrior") {
        // As per prompt: "A powerful melee attack that is harder to hit but deals more damage. (+5 to hit, +5 damage...)"
        // Interpreting the explicit numbers: +5 to hit.
        attackBonus += 5;
        logMessage += ` (Power Attack: +5 to hit!)`;
    }
    // Example for a spell attack (Mage's Firebolt) - might use a different stat (e.g. INT)
    // For now, let's assume Firebolt also uses a similar to-hit mechanism against AC.
    // A more complex system would have different roll types (attack roll vs spell attack roll).
    if (action.name === "Firebolt" && attacker.name === "Mage") {
        // Let's assume mages are proficient with their spells, giving a conceptual +3 bonus for this example
        // attackBonus += 3; // This should ideally come from character stats/proficiencies
    }


    const totalAttackRoll = attackRollD20 + attackBonus;
    logMessage += ` Rolls d20: ${attackRollD20} + Bonus: ${attackBonus} = Total: ${totalAttackRoll}`;

    // --- Check for Hit ---
    if (attackRollD20 === D20_CRITICAL_MISS_THRESHOLD) { // Natural 1
        result.miss = true;
        logMessage += `... CRITICAL MISS! (Rolled a 1)`;
        addVisualEffect({
            type: 'miss_text',
            text: 'CRIT MISS!',
            position: target.position,
            color: 'darkred', // More intense color for crit miss
            duration: VFX_DURATION * 1.5
        });
    } else if (attackRollD20 === D20_CRITICAL_HIT_THRESHOLD) { // Natural 20
        result.hit = true;
        result.crit = true;
        logMessage += `... CRITICAL HIT! (Rolled a 20)`;
        // Visual effect for crit hit will be part of damage dealing
    } else if (totalAttackRoll >= target.stats.ac) { // Regular Hit
        result.hit = true;
        logMessage += ` vs AC ${target.stats.ac}... HIT!`;
    } else { // Regular Miss
        result.miss = true;
        logMessage += ` vs AC ${target.stats.ac}... MISS!`;
        addVisualEffect({
            type: 'miss_text',
            text: 'Miss',
            position: target.position,
            color: MISS_TEXT_COLOR,
            duration: VFX_DURATION
        });
    }

    // --- Damage Calculation ---
    if (result.hit) {
        let damageAmount = 0;
        if (action.damage) {
            damageAmount = action.damage(); // Call the damage function (e.g., rolls dice like 1d8+STR)
        } else {
            // Fallback if no damage function is defined on the action (should not happen for attacks)
            damageAmount = attacker.stats.attackPower; // A less ideal fallback
            logMessage += ` (Fallback damage: ${damageAmount})`;
        }

        if (result.crit) {
            // D&D 5e style critical hit: roll all damage dice twice.
            // If action.damage() returns, say, 1d8+3, a crit would be 2d8+3.
            // Our current action.damage() in character.ts rolls dice and adds modifiers.
            // For simplicity in this prototype: we'll call action.damage() again for the extra dice.
            // A more accurate system would parse the dice string (e.g., "1d8") and roll just the dice part again.
            let criticalDamageBonus = 0;
            if (action.damage) { // Check if damage function exists
                 // To simulate rolling dice again:
                 // If damage was e.g. rollDice(8) + 3 (from STR), crit adds another rollDice(8).
                 // This requires the damage function to be structured to separate dice from static mods,
                 // or we just double the output of a pure dice roll part of it.
                 // For this prototype, let's assume action.damage() IS the dice part + static mods.
                 // So, for a crit, we add the result of calling action.damage() (for dice) again,
                 // but we need to be careful not to double static modifiers if they are part of action.damage().

                 // Simpler crit rule for prototype: Double the value from action.damage() if it represents dice rolls.
                 // Or, if action.damage is just `rollDice(X, Y) + MOD`, then add `rollDice(X,Y)` again.
                 // The current `action.damage` in `character.ts` for Warrior's Slash is `rollDice(6) + config.stats.attackPower;`
                 // So crit would be `(rollDice(6) + AP) + rollDice(6)`.
                 // For Firebolt `rollDice(6,2)`, crit would be `rollDice(6,2) + rollDice(6,2)`.

                if (action.name === "Slash") criticalDamageBonus = rollDice(6); // Warrior's Slash uses d6
                else if (action.name === "Firebolt") criticalDamageBonus = rollDice(6, 2); // Mage's Firebolt uses 2d6
                else if (action.name === "Power Attack") criticalDamageBonus = rollDice(8); // Warrior's PA uses d8
                else if (action.name === "Scimitar") criticalDamageBonus = rollDice(6); // Goblin Grunt
                else if (action.name === "Shortbow") criticalDamageBonus = rollDice(6); // Goblin Archer
                else criticalDamageBonus = damageAmount; // Fallback: double the initial damage if specific dice aren't clear

            } else {
                criticalDamageBonus = attacker.stats.attackPower; // Fallback crit damage
            }
            damageAmount += criticalDamageBonus;
            logMessage += ` CRITICAL DAMAGE! (Extra: ${criticalDamageBonus})`;
        }

        // Apply defense AFTER all damage bonuses are calculated
        result.damageDealt = applyDamage(target, damageAmount); // applyDamage handles target's defense
        logMessage += ` ${target.name} takes ${result.damageDealt} damage.`;

        addVisualEffect({
            type: 'damage_number',
            text: result.damageDealt.toString(),
            position: target.position,
            color: result.crit ? DAMAGE_TEXT_CRIT_COLOR : DAMAGE_TEXT_COLOR,
            duration: result.crit ? VFX_DURATION * 1.5 : VFX_DURATION, // Longer/bigger for crits
            // Optional: Add a custom animation for crits
            animation: result.crit ? (ctx, effect, now) => {
                const progress = (now - effect.startTime) / effect.duration;
                const scale = 1 + Math.sin(progress * Math.PI) * 0.5; // Pulse effect
                const alpha = 1 - progress;
                const yOffset = -progress * TILE_SIZE * 0.7;

                ctx.save();
                ctx.font = `bold ${TILE_SIZE * 0.4 * scale}px "Press Start 2P"`;
                ctx.fillStyle = effect.color || 'orange';
                ctx.textAlign = 'center';
                ctx.globalAlpha = alpha;
                ctx.fillText(
                    effect.text || '',
                    (effect.position.x + 0.5) * TILE_SIZE,
                    (effect.position.y + 0.5) * TILE_SIZE + yOffset
                );
                ctx.restore();
            } : undefined
        });

        if (!target.isAlive) {
            logMessage += ` ${target.name} has been defeated!`;
            // Potentially add a "defeated" visual effect or animation trigger here
        }
    }

    result.logMessage = logMessage;
    console.log("AttackProcessed:", result);
    return result;
}
