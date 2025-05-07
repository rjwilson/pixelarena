// src/types.ts
/**
 * Represents the type of character (Player or Enemy).
 */
export var CharacterType;
(function (CharacterType) {
    CharacterType["PLAYER"] = "PLAYER";
    CharacterType["ENEMY"] = "ENEMY";
})(CharacterType || (CharacterType = {}));
/**
 * Represents a type of action a character can perform.
 */
export var ActionType;
(function (ActionType) {
    ActionType["MOVE"] = "MOVE";
    ActionType["ATTACK"] = "ATTACK";
    ActionType["SPECIAL_ABILITY"] = "SPECIAL_ABILITY";
    // HEAL = "HEAL", // Example for later
    // DEFEND = "DEFEND", // Example for later
})(ActionType || (ActionType = {}));
/**
 * Represents the different phases within a player's turn.
 */
export var TurnPhase;
(function (TurnPhase) {
    TurnPhase["SELECTION"] = "SELECTION";
    TurnPhase["MOVEMENT"] = "MOVEMENT";
    TurnPhase["ACTION_TARGETING"] = "ACTION_TARGETING";
    TurnPhase["ENEMY_TURN"] = "ENEMY_TURN";
    TurnPhase["IDLE"] = "IDLE"; // Waiting for player input or an event
})(TurnPhase || (TurnPhase = {}));
