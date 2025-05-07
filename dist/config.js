// src/config.ts
import { CharacterType, ActionType } from './types';
// Simple dice rolling function (d20, d6, etc.)
export const rollDice = (sides, count = 1) => {
    let total = 0;
    for (let i = 0; i < count; i++) {
        total += Math.floor(Math.random() * sides) + 1;
    }
    return total;
};
// --- Grid Configuration ---
export const GRID_ROWS = 10; // Number of rows in the grid
export const GRID_COLS = 10; // Number of columns in the grid
export const TILE_SIZE = 48; // Size of each tile in pixels (for rendering)
// Consider adding padding/margin for the grid on the canvas if needed
// --- Character Configuration ---
// Define base stats and appearances for character types/classes
export const PLAYER_WARRIOR_CONFIG = {
    name: "Warrior",
    type: CharacterType.PLAYER,
    stats: {
        maxHp: 30,
        attackPower: 7,
        defense: 4,
        ac: 16,
        speed: 4,
        initiativeBonus: 2,
    },
    sprite: { color: "blue", symbol: "W" },
    actions: [
        { name: "Slash", type: ActionType.ATTACK, range: 1, description: "A melee attack with a sword." },
    ],
    specialAbility: {
        name: "Power Attack",
        type: ActionType.SPECIAL_ABILITY,
        range: 1,
        description: "A powerful melee attack that is harder to hit but deals more damage. (+5 to hit, +5 damage, uses Action & Move)",
        // Effect will be implemented in combat logic
    }
};
export const PLAYER_MAGE_CONFIG = {
    name: "Mage",
    type: CharacterType.PLAYER,
    stats: {
        maxHp: 20,
        attackPower: 3,
        defense: 2,
        ac: 12,
        speed: 3,
        initiativeBonus: 3,
    },
    sprite: { color: "purple", symbol: "M" },
    actions: [
        { name: "Staff Bash", type: ActionType.ATTACK, range: 1, description: "A weak melee attack with a staff." },
    ],
    specialAbility: {
        name: "Firebolt",
        type: ActionType.SPECIAL_ABILITY,
        range: 6,
        description: "Hurl a magical bolt of fire. (Deals 2d6 fire damage)",
        // Effect will be implemented in combat logic
    }
};
export const ENEMY_MELEE_CONFIG = {
    name: "Goblin Grunt",
    type: CharacterType.ENEMY,
    stats: {
        maxHp: 15,
        attackPower: 5,
        defense: 2,
        ac: 13,
        speed: 4,
        initiativeBonus: 1,
    },
    sprite: { color: "red", symbol: "g" },
    actions: [
        { name: "Scimitar", type: ActionType.ATTACK, range: 1, description: "A quick slash with a rusty scimitar." },
    ],
    // No special ability for this basic enemy
};
export const ENEMY_RANGED_CONFIG = {
    name: "Goblin Archer",
    type: CharacterType.ENEMY,
    stats: {
        maxHp: 12,
        attackPower: 4,
        defense: 1,
        ac: 12,
        speed: 3,
        initiativeBonus: 2,
    },
    sprite: { color: "darkred", symbol: "a" },
    actions: [
        { name: "Shortbow", type: ActionType.ATTACK, range: 7, description: "Fire an arrow from a shortbow." },
    ],
    // No special ability for this basic enemy
};
export const ALL_CHARACTER_CONFIGS = [
    PLAYER_WARRIOR_CONFIG,
    PLAYER_MAGE_CONFIG,
    ENEMY_MELEE_CONFIG,
    ENEMY_RANGED_CONFIG,
];
// --- Game Mechanics Configuration ---
export const D20_CRITICAL_HIT_THRESHOLD = 20;
export const D20_CRITICAL_MISS_THRESHOLD = 1;
// --- UI & Rendering Configuration ---
export const UI_FONT = '"Press Start 2P", cursive';
export const DAMAGE_TEXT_COLOR = "red";
export const DAMAGE_TEXT_CRIT_COLOR = "orange";
export const MISS_TEXT_COLOR = "grey";
export const HEAL_TEXT_COLOR = "lightgreen";
export const VFX_DURATION = 1500; // milliseconds for visual effects like damage numbers
// Colors for highlighting tiles
export const MOVABLE_TILE_COLOR = "rgba(0, 255, 0, 0.3)"; // Greenish tint for movable tiles
export const ATTACKABLE_TILE_COLOR = "rgba(255, 0, 0, 0.3)"; // Reddish tint for attackable tiles
export const SELECTED_TILE_COLOR = "rgba(255, 255, 0, 0.4)"; // Yellowish for selected tile
export const HOVER_TILE_COLOR = "rgba(200, 200, 255, 0.2)"; // Light blue for hovered tile
// --- Initial Party Setup ---
// Defines which characters start in the game and their initial positions
// This could also be generated or loaded from a scenario file later
export const INITIAL_PARTY_SETUP = [
    { configName: "Warrior", x: 2, y: 2 },
    { configName: "Mage", x: 1, y: 3 },
];
export const INITIAL_ENEMY_SETUP = [
    { configName: "Goblin Grunt", x: GRID_COLS - 3, y: GRID_ROWS - 3 },
    { configName: "Goblin Archer", x: GRID_COLS - 2, y: GRID_ROWS - 4 },
];
// --- Turn Management ---
export const MAX_ACTION_LOG_MESSAGES = 20; // Max messages to keep in the action log UI
