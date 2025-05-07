# Specification: Combat System

## 1. Intent

The Combat System is the heart of the game's conflict resolution. Its primary intent is to:

* Determine the outcome of offensive actions (attacks, damaging special abilities) between characters.
* Implement a ruleset inspired by Dungeons & Dragons (D&D) for attack rolls, armor class, damage calculation, critical hits, and critical misses.
* Provide clear feedback on the results of combat actions for logging and potential visual display.
* Serve as a central point for applying the game's combat rules consistently.

The system aims for a balance between D&D-inspired mechanics and the simplicity required for this prototype.

## 2. Module Responsibility

The Combat System module (`combat.ts`) is responsible for:

* **Processing Attacks (`processAttack` function)**: This is the core function of the module. Given an attacker, a target, and the specific action being used, it:
    * **Calculates To-Hit**:
        * Simulates a d20 roll for the attack.
        * Incorporates any relevant attack bonuses (e.g., from specific abilities like the Warrior's "Power Attack" which grants +5 to hit). *Currently, base character attack bonuses (like STR/DEX modifiers or proficiency) are simplified or implicitly part of action definitions rather than a separate character stat applied here.*
        * Compares the total attack roll against the target's Armor Class (AC).
    * **Determines Hit, Miss, Critical Hit, or Critical Miss**:
        * A natural 20 on the d20 roll is a critical hit (usually an automatic hit dealing extra damage).
        * A natural 1 on the d20 roll is a critical miss (usually an automatic miss).
        * Otherwise, the outcome depends on the comparison with the target's AC.
    * **Calculates Damage**:
        * If the attack hits, it invokes the `damage()` function associated with the `GameAction` being used. This function (defined in `character.ts` during character creation) typically involves rolling dice (e.g., 1d6, 2d8) and adding relevant modifiers (e.g., character's `attackPower`, specific ability bonuses like Power Attack's +5 damage).
        * For critical hits, it applies bonus damage. The current implementation rolls the action's primary damage dice an additional time.
    * **Applies Damage to Target**: Calls the `applyDamage` function (from `character.ts`) on the target character. `applyDamage` subtracts the target's defense from the calculated damage and updates the target's HP.
    * **Generates Combat Log Message**: Constructs a descriptive string detailing the attack roll, outcome (hit/miss/crit), and damage dealt.
    * **Triggers Visual Effects**: Invokes a callback function (`addVisualEffect`) passed into `processAttack` to signal that visual feedback (like damage numbers or "Miss" text) should be displayed on screen.

## 3. Key Concepts & Design Considerations

* **D20 System**: Core resolution mechanic relies on a 20-sided die roll, a hallmark of D&D.
* **Attack Roll vs. Armor Class (AC)**: The fundamental check for whether an attack hits.
* **Critical Hits & Misses**: Natural 20s and 1s on the attack roll have special outcomes, adding an element of chance and excitement.
* **Action-Specific Damage**: The `damage()` function is part of the `GameAction` definition. This allows different attacks and abilities to have unique damage profiles (different dice, different modifiers).
    * The Warrior's "Power Attack" is a key example, having both a to-hit bonus (handled in `processAttack`) and a distinct damage calculation (handled by its `damage()` function defined during character creation).
* **Separation of Concerns**:
    * The Combat System focuses purely on resolving a single offensive action. It does not know about turns, AI, or player input.
    * Character stats (AC, defense, HP modification) are managed by the Character System; `combat.ts` reads these stats and calls `character.ts` functions to apply changes.
    * The decision to initiate an attack comes from `main.ts` (for player actions) or `ai.ts`.
* **Visual Feedback Decoupling**: `processAttack` does not directly render visual effects. It uses a callback (`addVisualEffect`) provided by the calling module (typically `main.ts`) to request that such effects be created. This keeps rendering concerns separate from combat logic.
* **Simplicity for Prototype**:
    * Complex D&D rules like advantage/disadvantage, saving throws (for many spells), detailed weapon properties, or character-level proficiency bonuses are currently not implemented to keep the scope manageable.
    * Attack bonuses are currently primarily tied to specific actions (like Power Attack) rather than being a composite of character stats.

## 4. Relation to Other Modules

* **`main.ts` (Main Game Orchestration)**:
    * Calls `processAttack` when a player or AI character performs an attack or a damaging special ability.
    * Provides the `addVisualEffect` callback to `processAttack`.
    * Uses the `AttackResult` (log message, damage dealt) to update the game log and potentially other UI elements.
* **`character.ts` (Character System)**:
    * `processAttack` reads attacker's `actions` (to get `damage()` function and action properties) and target's `stats` (AC, defense).
    * `processAttack` calls `applyDamage` from `character.ts` to modify the target's HP and update its alive status.
* **`config.ts`**: Provides constants like `D20_CRITICAL_HIT_THRESHOLD`, `D20_CRITICAL_MISS_THRESHOLD`, and the `rollDice` function used for attack and damage rolls.
* **`ai.ts` (AI System)**: The AI's decision to attack will ultimately lead to `main.ts` calling `processAttack`.

## 5. Future Considerations / Potential Enhancements

* **Saving Throws**: For spells and abilities that don't use an attack roll but require the target to make a saving throw (e.g., against a fixed Difficulty Class - DC).
* **Advantage/Disadvantage**: Implementing the D&D 5e mechanic of rolling two d20s and taking the higher (advantage) or lower (disadvantage) result.
* **More Detailed Damage Types & Resistances/Vulnerabilities**: Adding concepts like fire, cold, poison damage, and allowing characters to have resistance or vulnerability to these types.
* **Area of Effect (AoE) Attacks**: Modifying `processAttack` or creating a new function to handle actions that can affect multiple targets in an area. This would involve iterating over targets within the AoE.
* **Complex Attack Modifiers**: Incorporating character proficiency bonuses and ability score modifiers (e.g., Strength for melee, Dexterity for ranged) into the attack roll and damage calculations more explicitly.
* **Cover System**: Allowing terrain or other characters to provide cover, modifying AC or granting bonuses to saving throws.

