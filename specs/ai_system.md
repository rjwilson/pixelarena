# Specification: AI System

## 1. Intent

The AI (Artificial Intelligence) System is responsible for controlling the behavior of non-player characters (NPCs), specifically enemy units, during combat. Its primary intent is to:

* Provide a believable and reasonably challenging opposition for the player.
* Enable enemy characters to make autonomous decisions regarding movement and actions (attacking, using special abilities).
* Adhere to the game's rules and action economy (one move, one standard action per turn).
* Be simple enough for a prototype but provide a foundation for more complex behaviors in the future.

The system aims to make enemies act purposefully, focusing on engaging player characters effectively based on their capabilities.

## 2. Module Responsibility

The AI System module (`ai.ts`) is responsible for:

* **Decision Making (`getEnemyAIAction` function)**: This is the core function of the module. Given an AI-controlled character and the current game state, it determines the best course of action (or sequence of actions) for that character's turn. This involves:
    * **Target Assessment**: Identifying and prioritizing potential player character targets. Prioritization is currently based on lowest current HP, then proximity.
    * **Action Evaluation**: Considering available actions (standard attacks, special abilities) based on range, potential effectiveness, and character state (e.g., `canAct`).
    * **Movement Planning**: If no immediate action is effective, or if a better action can be taken after repositioning, the AI plans a move. This involves:
        * Identifying reachable tiles using the Grid System.
        * Evaluating potential move positions based on proximity to targets or the ability to enable an attack.
    * **Outputting a Decision**: Returning an `AIActionDecision` object that specifies the type of action (`move`, `attack`, `special`, `wait`), the target (if any), the specific `GameAction` to use, and the target position for moves.

* **Adherence to Rules**: The AI logic must respect the game's action economy (e.g., an AI character cannot attack if `canAct` is false, or move if `canMove` is false).

## 3. Key Concepts & Design Considerations

* **Reactive AI**: The current AI is primarily reactive. It assesses the current game state and makes a decision for the immediate turn without long-term strategic planning or prediction of player moves.
* **Rule-Based Behavior**: The AI follows a predefined set of rules or priorities:
    1.  Attempt to use an offensive special ability if a viable target is in range.
    2.  If not, attempt a standard attack if a viable target is in range.
    3.  If no immediate attack is possible, attempt to move to a position from which an attack can be made (either immediately after moving or on a subsequent turn if only movement is possible now). This includes evaluating if moving allows for a special ability or standard attack.
    4.  If attacking is not feasible even after a potential move, move towards the highest-priority target.
    5.  If no productive action or move can be made, wait.
* **Target Prioritization**:
    * **Lowest HP First**: The AI generally prioritizes attacking player characters with lower current health, aiming to neutralize threats more quickly.
    * **Proximity as Tie-Breaker**: If multiple targets have similar low HP, or if HP is not a distinguishing factor, proximity can be used to select a target.
* **Action Selection**:
    * The AI considers its available `GameAction` list.
    * Offensive special abilities are generally preferred over standard attacks if they can be used effectively.
* **Simplified Pathfinding for Movement**: When deciding to move, the AI uses `getReachableTiles` from the Grid System. It then evaluates these tiles to see which one best achieves its current goal (e.g., gets into attack range, or simply gets closer to a target). It does not currently perform complex pathfinding around multiple obstacles or consider terrain strategically beyond basic walkability.
* **Single-Step Decisions**: The `getEnemyAIAction` function currently returns a single decision (e.g., "move to X,Y" or "attack target Z with action A"). The main game loop (`main.ts`) then handles executing this, and if the AI character can still perform another part of its turn (e.g., act after moving), `getEnemyAIAction` might be called again within the same character's turn.
* **No Inter-AI Coordination**: Each AI character makes decisions independently. There is no concept of group tactics or coordinated maneuvers in the current prototype.
* **Predictability vs. Challenge**: The current rule-based system can be somewhat predictable. Introducing elements of randomness or more complex evaluation functions could increase the challenge and reduce predictability in future iterations.

## 4. Relation to Other Modules

* **`main.ts` (Main Game Orchestration)**:
    * Calls `getEnemyAIAction` when it's an AI character's turn.
    * Executes the `AIActionDecision` returned by the AI, by calling appropriate functions (e.g., `moveCharacter`, `performAttack`, `performSpecialAbility`).
* **`character.ts` (Character System)**:
    * The AI reads the AI character's own stats (`speed`, `actions`, `canMove`, `canAct`) and the stats/status of potential player targets.
* **`grid.ts` (Grid System)**:
    * The AI uses `getReachableTiles`, `findCharactersInRange`, and `getTargetableTiles` to understand the spatial layout, character positions, and action ranges.
* **`combat.ts` (Combat System)**: While the AI doesn't call `processAttack` directly, its decision to attack (and which action to use) provides the inputs that `main.ts` will pass to `processAttack`.

## 5. Future Considerations / Potential Enhancements

* **Role-Based AI**: Different AI behaviors based on character roles (e.g., melee attacker, ranged support, healer, controller).
* **Advanced Pathfinding**: Using A* or similar algorithms for more intelligent movement around obstacles and through complex terrain.
* **Terrain Awareness**: AI considering terrain for defensive positioning (cover) or offensive advantages.
* **Predictive Behavior/Planning**: AI looking ahead multiple steps or anticipating player actions.
* **State Management for AI**: More complex AIs might benefit from their own internal state tracking (e.g., current objective, perceived threat levels).
* **Difficulty Scaling**: Implementing mechanisms to adjust AI effectiveness or decision-making quality based on a difficulty setting.
* **Fuzzy Logic or Utility-Based AI**: For more nuanced decisions where multiple factors are weighed, rather than a strict set of if-else rules.
* **Learning/Adaptive AI**: (Very advanced) AI that learns from past encounters (outside the scope of this prototype).
* **Inter-AI Coordination**: Allowing AI units to communicate or follow group tactics.

