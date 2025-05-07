// src/types.ts

/**
 * Represents a point on the 2D grid.
 */
export interface GridPoint {
    x: number;
    y: number;
}

/**
 * Defines the basic stats for any character in the game.
 */
export interface CharacterStats {
    maxHp: number;       // Maximum Health Points
    currentHp: number;   // Current Health Points
    attackPower: number; // Base attack damage
    defense: number;     // Reduces damage taken
    ac: number;          // Armor Class (target for d20 attack rolls)
    speed: number;       // Movement range on the grid (in tiles)
    initiative: number;  // Determines turn order (higher goes first)
}

/**
 * Represents the type of character (Player or Enemy).
 */
export enum CharacterType {
    PLAYER = "PLAYER",
    ENEMY = "ENEMY",
}

/**
 * Represents a character in the game, whether player-controlled or AI.
 */
export interface Character {
    id: string;                 // Unique identifier
    name: string;               // Display name
    type: CharacterType;        // Player or Enemy
    stats: CharacterStats;
    position: GridPoint;        // Current position on the grid
    sprite: string | { color: string; symbol?: string }; // Visual representation (e.g., color or path to sprite, or a symbol)
    isAlive: boolean;
    canMove: boolean;           // Has this character already moved this turn?
    canAct: boolean;            // Has this character already taken a standard action this turn?
    targetable: boolean;        // Can this character be targeted by actions?
    // Basic abilities/actions - can be expanded
    actions: GameAction[];
    // Potentially add methods like takeDamage, heal, etc., if we make this a class later
}

/**
 * Represents a type of action a character can perform.
 */
export enum ActionType {
    MOVE = "MOVE",
    ATTACK = "ATTACK",
    SPECIAL_ABILITY = "SPECIAL_ABILITY",
    // HEAL = "HEAL", // Example for later
    // DEFEND = "DEFEND", // Example for later
}

/**
 * Represents a generic game action.
 */
export interface GameAction {
    name: string;
    type: ActionType;
    range?: number; // Range of the action in grid units (e.g., for attacks or spells)
    damage?: () => number; // Function to roll damage, e.g., () => rollDice(1, 8) + 2
    effect?: (target: Character, Caster?: Character) => void; // For special abilities or spells
    description: string;
}


/**
 * Represents a tile on the game grid.
 */
export interface GridTile {
    x: number;
    y: number;
    isOccupied: boolean;    // Is a character on this tile?
    occupyingCharacterId?: string; // ID of the character on this tile
    isWalkable: boolean;    // Can characters move through this tile?
    // Potentially add terrain type, effects, etc. later
    // terrain: TerrainType;
}

/**
 * Represents the overall game state.
 */
export interface GameState {
    characters: Character[];
    grid: GridTile[][]; // 2D array representing the game map
    turnOrder: string[]; // Array of character IDs in order of initiative
    currentTurnIndex: number;
    activeCharacterId: string | null; // ID of the character whose turn it is
    selectedCharacterId: string | null; // ID of the character currently selected by the player
    selectedAction: GameAction | null; // Action selected by the player
    isPlayerTurn: boolean;
    isCombatOver: boolean;
    winner: CharacterType | null; // Who won the game
    actionLog: string[]; // Log of game events
}

/**
 * Represents the different phases within a player's turn.
 */
export enum TurnPhase {
    SELECTION = "SELECTION", // Player is selecting a character or an action
    MOVEMENT = "MOVEMENT",   // Player has selected move and is choosing a destination
    ACTION_TARGETING = "ACTION_TARGETING", // Player has selected an action (e.g. attack) and is choosing a target
    ENEMY_TURN = "ENEMY_TURN", // AI is processing its turn
    IDLE = "IDLE" // Waiting for player input or an event
}

// Dice rolling function type
export type DiceRollFn = (sides: number, count?: number) => number;

// For visual effects on the canvas
export interface VisualEffect {
    id: string;
    type: 'damage_number' | 'miss_text' | 'heal_text' | 'status_icon';
    position: GridPoint; // Position in world/grid coordinates
    text?: string;
    color?: string;
    duration: number; // in milliseconds
    startTime: number;
    animation?: (ctx: CanvasRenderingContext2D, effect: VisualEffect, now: number) => void; // Custom animation logic
}

// Configuration for character classes or types
export interface CharacterConfig {
    name: string;
    type: CharacterType;
    stats: Omit<CharacterStats, 'currentHp' | 'initiative'> & { initiativeBonus: number }; // Base stats, currentHp will be maxHp initially
    sprite: string | { color: string; symbol?: string };
    actions: Omit<GameAction, 'effect'>[]; // Base actions, specific effects might be added in character creation
    specialAbility?: GameAction; // A unique special ability
}

