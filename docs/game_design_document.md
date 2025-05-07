# Game Design Document: Pixel Combat Arena (Prototype)

## 1. Introduction

**Pixel Combat Arena** is a 2D turn-based tactical combat web application designed to run locally in modern web browsers. This document outlines the design for a functional prototype focusing on a small-scale encounter inspired by classic Dungeons & Dragons (D&D) combat. The visual style and UI layout are guided by a pixel art aesthetic.

**Project Goal**: To create a playable prototype demonstrating core tactical combat mechanics, including grid-based movement, an action economy, d20-based combat resolution, and basic enemy AI, all presented with a clear pixel art visual style. A significant emphasis is placed on robust code and automated testing.

## 2. Core Concept

The game pits a small party of player-controlled characters against a group of AI-controlled enemies in a tactical, turn-based battle on a 2D grid. Players will strategically maneuver their units, utilize unique character abilities, and manage resources to overcome their foes. The experience aims to capture the engaging, tactical decision-making of tabletop RPG combat in a streamlined digital format.

## 3. Gameplay Mechanics

### 3.1. Turn-Based System
Combat unfolds in discrete turns. Characters act one at a time based on an initiative order determined at the start of combat (higher initiative goes first). Each character completes their available actions before the next character in the order takes their turn. A round consists of every character having taken one turn.

### 3.2. Grid-Based Movement
All combat takes place on a 2D grid composed of square tiles. Characters occupy specific tiles and move a certain number of tiles based on their `speed` statistic. Movement is typically orthogonal (no diagonals for simplicity in this prototype, though Manhattan distance is used for range).

### 3.3. Action Economy (Simplified)
Inspired by D&D 5e, each character on their turn can perform:
* **One Move Action**: Allows the character to move up to their speed in tiles.
* **One Standard Action**: Used for primary offensive or utility actions like:
    * Attacking an enemy.
    * Casting a spell (currently implemented as special abilities).
    * Using a special character ability.

Characters can typically perform their Move and Standard Action in any order. Some special abilities (like the Warrior's "Power Attack" in the current implementation) might consume both the Standard Action and the Move Action for the turn.

### 3.4. Combat Resolution
* **Attack Rolls**: When a character attacks, a 20-sided die (d20) is rolled. This roll is potentially modified by bonuses (e.g., +5 to hit for Warrior's Power Attack). The total is compared against the target's Armor Class (AC).
    * If the total attack roll equals or exceeds the target's AC, the attack hits.
    * If it's lower, the attack misses.
* **Critical Hits**: A natural roll of 20 on the d20 is a critical hit, automatically hitting and dealing bonus damage (typically by rolling damage dice twice).
* **Critical Misses**: A natural roll of 1 on the d20 is a critical miss, automatically missing regardless of modifiers or AC.
* **Damage**: If an attack hits, damage is rolled based on the weapon or ability used (e.g., 1d6, 2d8). This base damage can be modified by character stats (e.g., `attackPower`) or ability-specific bonuses.
* **Defense**: Targets have a `defense` statistic that reduces incoming damage from successful hits. Damage dealt cannot be reduced below zero.

### 3.5. Characters
The prototype features a small roster of distinct characters:

* **Player Characters (Party of 2):**
    * **Warrior**: A melee combatant with higher HP and AC, focused on direct physical attacks. Special Ability: "Power Attack" (modified hit/damage, higher cost).
    * **Mage**: A spellcaster (represented by special abilities) with lower HP but capable of ranged magical attacks. Special Ability: "Firebolt" (ranged magical damage).
* **Enemy AI Characters (Party of 2):**
    * **Melee Creature (e.g., Goblin Grunt)**: A basic melee enemy that will try to engage players up close.
    * **Ranged Creature (e.g., Goblin Archer)**: An enemy that prefers to attack from a distance.

Each character is defined by stats (Max HP, Current HP, Attack Power, Defense, AC, Speed, Initiative) and a list of available actions/abilities.

### 3.6. Abilities & Actions
Characters have a set of actions they can perform, primarily:
* **Basic Attack**: A standard melee or ranged attack available to most characters, defined by their configuration.
* **Special Abilities**: Unique actions specific to a character class/type, such as the Warrior's "Power Attack" or the Mage's "Firebolt". These may have different ranges, damage outputs, or costs.

### 3.7. Win/Loss Conditions
* **Player Victory**: Achieved when all enemy characters are defeated (Current HP reduced to 0).
* **Enemy Victory (Player Defeat)**: Occurs when all player characters are defeated.
The game will display a message indicating the outcome.

## 4. Target Audience (Implied)

Players who enjoy:
* Turn-based tactical RPGs.
* Strategy games with grid-based combat.
* Games inspired by Dungeons & Dragons mechanics.
* Pixel art aesthetics.

## 5. Platform

**Web Application**: Playable directly in modern web browsers (e.g., Chrome, Firefox) from the local file system (by opening `index.html`).

## 6. Controls

* **Mouse-driven**:
    * Clicking UI buttons to select actions (Move, Attack, Special, End Turn).
    * Clicking on the game canvas to:
        * Select a character (if it's their turn and they are player-controlled).
        * Choose a destination tile for movement.
        * Select a target for an attack or ability.
* **Keyboard**: No keyboard controls are planned for this prototype.

## 7. Art Style & Visuals

* **Aesthetic**: 2D Pixel Art, inspired by the reference image provided during the project's inception. This includes character sprites, environment tiles, and UI elements.
* **Characters**: Initially rendered as simple colored rectangles with identifying symbols. The design allows for future replacement with more detailed pixel art sprites (static or animated).
* **Environment**: The grid is rendered with basic tile distinctions. Future enhancements would involve more detailed terrain tiles matching the pixel art style.
* **Visual Feedback**:
    * Highlighted tiles for movement range and attack/ability targets.
    * On-canvas text/effects for damage numbers, "Miss" indicators, and critical hit emphasis.
    * Health bars above characters.

## 8. User Interface (UI) Overview

The UI is designed to be clear and functional, providing necessary information and controls without cluttering the game view. It is inspired by the layout in the reference image.

* **Game Canvas**: The central area where the grid and characters are displayed and combat takes place.
* **Player Party Panel**: Displays information for each player character (name, HP, status).
* **Enemy Info Panel**: Displays information for each enemy character.
* **Action Log**: A scrollable text area showing a log of significant game events (actions taken, damage dealt, misses, turn changes).
* **Turn Indicator**: Clearly shows which character's turn it currently is.
* **Action Menu**: Contains buttons for the active player character to choose their action (Move, Attack, Special Ability) and to end their turn.
* **Game Message Box**: A modal dialog to display win/loss messages and offer a restart option.

## 9. Scope (Prototype)

This GDD describes a **functional prototype**. The primary goal is to implement and test the core gameplay loop and mechanics described above. Advanced features, extensive content (many characters, abilities, levels), and highly polished visuals/audio are outside the scope of this initial prototype but are noted as potential future enhancements. The emphasis is on a solid, testable foundation.

