# Specification: Character System

## 1. Intent

The Character System is responsible for defining and managing all active entities (player-controlled units and AI-controlled enemies) within the game world. Its primary intent is to:

* Represent the attributes, abilities, and current state of each character.
* Provide the logic for character creation based on predefined configurations.
* Handle modifications to character state, such as taking damage, healing, and using actions.
* Define the visual representation of characters on the game grid.
* Encapsulate the core data and fundamental behaviors associated with any unit participating in combat.

This system aims to provide a clear and extensible way to define diverse character types with unique capabilities.

## 2. Module Responsibility

The Character System module (`character.ts`) is responsible for:

* **Character Data Definition (`Character` interface)**: Defining the structure for all character data, including:
    * Unique identification (`id`, `name`).
    * Affiliation (`type`: PLAYER or ENEMY).
    * Core statistics (`stats`: HP, Attack Power, Defense, Armor Class, Speed, Initiative).
    * Current position on the grid (`position`).
    * Visual representation (`sprite`: color, symbol, or future image path).
    * Combat state (`isAlive`, `canMove`, `canAct`, `targetable`).
    * Available actions and abilities (`actions`: array of `GameAction`).
* **Character Creation (`createCharacter` function)**:
    * Instantiating new character objects based on `CharacterConfig` templates (defined in `config.ts`).
    * Assigning unique IDs.
    * Initializing current HP to maximum HP.
    * Rolling initiative by combining a d20 roll with a character's initiative bonus.
    * Processing and assigning actions, including defining their damage-dealing functions (which may involve dice rolls).
* **State Modification Functions**:
    * `applyDamage`: Calculating damage taken after accounting for defense, updating current HP, and setting `isAlive` and `targetable` status if HP drops to zero.
    * `healCharacter`: Increasing current HP, capped at maximum HP.
    * `moveCharacter`: Updating a character's grid position and `canMove` status. This function also interacts with the Grid System to update tile occupancy.
    * `resetCharacterTurnActions`: Resetting `canMove` and `canAct` flags at the start of an alive character's turn.
* **Character Rendering (`renderCharacter` function)**:
    * Drawing a character onto the HTML5 canvas at its grid position.
    * Displaying a simple visual representation (e.g., colored rectangle with a symbol).
    * Rendering a health bar above the character.
    * Providing visual cues for selected or currently active characters.

## 3. Key Concepts & Design Considerations

* **Configuration-Driven Creation**: Characters are created from `CharacterConfig` objects. This promotes consistency and makes it easy to define new character types (classes, enemies) by simply adding new configurations in `config.ts`.
* **Stats Block (`CharacterStats`)**: A centralized structure for all numerical attributes defining a character's combat prowess and survivability.
* **Action Economy (`canMove`, `canAct`)**: Simple flags to enforce the "one move, one standard action" per turn rule. These are reset at the beginning of a character's turn.
* **Actions (`GameAction[]`)**: Each character possesses a list of available actions. Actions define their type (Attack, Special Ability), range, damage potential (via a function), and description. This allows for varied character abilities.
    * **Damage Functions**: The `damage` property of a `GameAction` is a function that typically involves dice rolls (e.g., `() => rollDice(6) + attacker.stats.attackPower`). This encapsulates the damage calculation logic per action.
* **Simplified Sprites**: For the prototype, character sprites are programmatically drawn simple shapes (colored rectangles with symbols). The `sprite` property in `Character` and `CharacterConfig` is designed to potentially accommodate image file paths in the future.
* **Separation of Concerns**:
    * The Character System manages individual character data and intrinsic behaviors.
    * It does not manage turn order (handled by `main.ts`).
    * It does not resolve combat directly (the `processAttack` function in `combat.ts` takes character data as input but is a separate module).
    * AI decision-making (`ai.ts`) uses character data but is distinct.
* **Extensibility**: The use of interfaces (`Character`, `GameAction`) and configuration objects (`CharacterConfig`) is intended to make it relatively straightforward to add new character classes, enemy types, or abilities with unique mechanics.

## 4. Relation to Other Modules

* **`main.ts` (Main Game Orchestration)**:
    * Calls `createCharacter` to populate the game with units during setup.
    * Manages the turn order and determines the `activeCharacterId`.
    * Calls `renderCharacter` for each character in the game loop.
    * Invokes `moveCharacter`, `performAttack` (which uses `applyDamage`), and `performSpecialAbility` based on player or AI actions.
    * Calls `resetCharacterTurnActions` at the start of each character's turn.
* **`grid.ts` (Grid System)**:
    * `moveCharacter` in `character.ts` updates the grid's tile occupancy via `occupyTile` and `freeTile`.
    * Character positions are `GridPoint` objects, aligning with the grid's coordinate system.
* **`combat.ts` (Combat System)**:
    * `processAttack` takes attacker and target `Character` objects as input to resolve attacks.
    * `processAttack` calls `applyDamage` (from `character.ts`) to modify the target's HP.
* **`ai.ts` (AI System)**:
    * Reads character stats (speed, actions, range) to make decisions.
    * Identifies target characters based on their properties (HP, position, type).
* **`config.ts`**: Provides `CharacterConfig` templates (e.g., `PLAYER_WARRIOR_CONFIG`, `ENEMY_MELEE_CONFIG`) used by `createCharacter`. Also provides `rollDice` used in action damage functions and initiative rolls.
* **`ui.ts` (UI System)**: Reads character data (name, HP, maxHP, type, status) to update informational displays.

## 5. Future Considerations / Potential Enhancements

* **Complex Abilities/Spells**: Implementing a more robust system for actions that have effects beyond direct damage (e.g., buffs, debuffs, healing spells, area-of-effect attacks). This might involve more detailed `GameAction` definitions or an event system.
* **Status Effects**: Adding support for conditions like poisoned, stunned, slowed, etc., which would temporarily modify character stats or behavior.
* **Inventory/Equipment**: Allowing characters to equip items that modify their stats or grant new abilities.
* **Experience and Leveling**: For persistent characters, implementing a system for gaining experience and improving stats or learning new abilities.
* **Class System**: More formally defining character classes with unique progression paths and ability trees.
* **Sprite Animation**: Replacing simple geometric sprites with animated sprites for actions like moving, attacking, and idling.
* **Character State Machine**: For more complex behaviors or animations, a finite state machine could manage a character's current state (e.g., idle, moving, attacking, hit_react).

