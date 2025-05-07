// src/character.ts
import { ActionType } from './types';
import { TILE_SIZE, UI_FONT, rollDice } from './config';
import { getTile, occupyTile } from './grid'; // For initial placement
let characterIdCounter = 0;
/**
 * Resets the characterIdCounter to 0.
 * INTENDED FOR TESTING PURPOSES ONLY.
 */
export function resetCharacterIdCounter_TEST_HOOK() {
    characterIdCounter = 0;
}
/**
 * Creates a new character instance.
 * @param config The configuration object for this character type.
 * @param initialPosition The starting position on the grid.
 * @returns A Character object.
 */
export function createCharacter(config, initialPosition) {
    const id = `${config.type.toLowerCase()}_${config.name.replace(/\s+/g, '_').toLowerCase()}_${characterIdCounter++}`;
    // Initialize actions, potentially adding specific damage rolls or effects here
    const processedActions = config.actions.map(actionConfig => {
        const action = {
            ...actionConfig,
            // Define damage functions based on action type or character config
            damage: () => {
                // Example: Basic attack damage based on character's attackPower + a dice roll
                if (actionConfig.type === ActionType.ATTACK) {
                    // A common D&D style might be weapon dice + modifier
                    // For simplicity, let's say 1d6 + attackPower for a basic attack
                    return rollDice(6) + config.stats.attackPower;
                }
                return 0; // Default no damage for non-attack actions unless specified
            },
            // Effect would be defined here or in a more complex action system
        };
        return action;
    });
    // Add special ability if it exists
    if (config.specialAbility) {
        const special = {
            ...config.specialAbility,
            damage: () => {
                if (config.name === "Mage" && config.specialAbility?.name === "Firebolt") {
                    return rollDice(6, 2); // 2d6 for Firebolt
                }
                if (config.name === "Warrior" && config.specialAbility?.name === "Power Attack") {
                    return rollDice(8) + config.stats.attackPower + 5; // 1d8 + STR + 5 for Power Attack
                }
                return 0;
            },
            // Effect for special ability
        };
        processedActions.push(special);
    }
    const newChar = {
        id,
        name: config.name,
        type: config.type,
        stats: {
            ...config.stats,
            currentHp: config.stats.maxHp,
            initiative: rollDice(20) + config.stats.initiativeBonus,
        },
        position: initialPosition,
        sprite: config.sprite,
        isAlive: true,
        canMove: true,
        canAct: true,
        targetable: true,
        actions: processedActions,
    };
    return newChar;
}
/**
 * Renders a single character on the canvas.
 * @param ctx The canvas rendering context.
 * @param character The character to render.
 * @param isSelected If the character is currently selected by the player.
 * @param isActive If it's this character's turn.
 */
export function renderCharacter(ctx, character, isSelected = false, isActive = false) {
    if (!character.isAlive)
        return;
    const x = character.position.x * TILE_SIZE;
    const y = character.position.y * TILE_SIZE;
    // Draw character sprite (simple colored rectangle with symbol for now)
    if (typeof character.sprite === 'string') {
        // TODO: Implement image loading if sprite is a string (URL/path)
        ctx.fillStyle = 'gray'; // Placeholder if image not loaded
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        // Potentially draw an image:
        // const img = new Image();
        // img.src = character.sprite;
        // img.onload = () => ctx.drawImage(img, x, y, TILE_SIZE, TILE_SIZE);
    }
    else {
        ctx.fillStyle = character.sprite.color;
        ctx.fillRect(x + TILE_SIZE * 0.1, y + TILE_SIZE * 0.1, TILE_SIZE * 0.8, TILE_SIZE * 0.8); // Slightly smaller rect
        if (character.sprite.symbol) {
            ctx.fillStyle = 'white';
            ctx.font = `bold ${TILE_SIZE * 0.5}px ${UI_FONT.split(',')[0]}`; // Use the primary game font
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(character.sprite.symbol, x + TILE_SIZE / 2, y + TILE_SIZE / 2);
        }
    }
    // Draw Health Bar above character
    const healthBarWidth = TILE_SIZE * 0.8;
    const healthBarHeight = 5;
    const healthBarX = x + TILE_SIZE * 0.1;
    const healthBarY = y - healthBarHeight - 2; // Position above the character
    // Background of health bar
    ctx.fillStyle = '#333'; // Dark gray
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
    // Current health portion
    const hpPercentage = character.stats.currentHp / character.stats.maxHp;
    ctx.fillStyle = hpPercentage > 0.5 ? 'green' : hpPercentage > 0.25 ? 'orange' : 'red';
    ctx.fillRect(healthBarX, healthBarY, healthBarWidth * hpPercentage, healthBarHeight);
    // Border for health bar
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);
    // Visual indicator for selected or active character
    if (isSelected) {
        ctx.strokeStyle = 'yellow';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
    }
    else if (isActive) {
        ctx.strokeStyle = 'cyan';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]); // Dashed line for active character
        ctx.strokeRect(x + 2, y + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.setLineDash([]); // Reset line dash
    }
}
/**
 * Moves a character to a new position on the grid.
 * Assumes the move is valid.
 * @param character The character to move.
 * @param newPosition The target grid position.
 * @param grid The game grid (to update occupancy).
 */
export function moveCharacter(character, newPosition, grid) {
    const oldTile = getTile(grid, character.position.x, character.position.y);
    if (oldTile) {
        oldTile.isOccupied = false;
        oldTile.occupyingCharacterId = undefined;
    }
    character.position = newPosition;
    occupyTile(grid, newPosition, character.id);
    character.canMove = false; // Character has used their move action for this turn
}
/**
 * Applies damage to a character, reducing their HP.
 * @param character The character taking damage.
 * @param amount The amount of damage to apply (before defense).
 * @returns The actual damage dealt after considering defense.
 */
export function applyDamage(character, amount) {
    const damageTaken = Math.max(0, amount - character.stats.defense); // Damage cannot be negative
    character.stats.currentHp -= damageTaken;
    if (character.stats.currentHp <= 0) {
        character.stats.currentHp = 0;
        character.isAlive = false;
        character.targetable = false; // Dead characters usually cannot be targeted
        // TODO: Add logic for character death (e.g., remove from turn order, update UI)
    }
    return damageTaken;
}
/**
 * Heals a character, increasing their HP.
 * @param character The character to heal.
 * @param amount The amount of HP to restore.
 */
export function healCharacter(character, amount) {
    character.stats.currentHp += amount;
    if (character.stats.currentHp > character.stats.maxHp) {
        character.stats.currentHp = character.stats.maxHp;
    }
}
/**
 * Resets a character's turn-specific flags (canMove, canAct).
 * @param character The character to reset.
 */
export function resetCharacterTurnActions(character) {
    if (character.isAlive) {
        character.canMove = true;
        character.canAct = true;
    }
}
