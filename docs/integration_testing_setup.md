# Notes on Integration Test Setup (`integration.test.ts`)

For these integration tests, we want to simulate the game's flow as orchestrated by `main.ts` but without the actual browser rendering or real-time delays.

**1. Mocking `ui.ts`:**
We'll mock the entire `ui.ts` module. This means that when `main.ts` (or other modules) call functions like `updateCharacterDisplays`, `addMessageToActionLog`, `showGameMessage`, etc., the actual DOM manipulation won't happen. Instead, we can use Vitest's `vi.spyOn` or check if the mocked functions were called with the expected arguments.

```typescript
// At the top of your integration.test.ts
vi.mock('../ui', () => ({
  initializeUI: vi.fn(),
  updateCharacterDisplays: vi.fn(),
  addMessageToActionLog: vi.fn(), // We'll spy on this one particularly
  updateActionLog: vi.fn(),
  updateTurnIndicator: vi.fn(),
  updateActionButtons: vi.fn(),
  showGameMessage: vi.fn(),
  hideGameMessage: vi.fn(),
}));
```

**2. Mocking Timers:**
`main.ts` uses `setTimeout` for AI "thinking" delays and turn transitions. Vitest allows us to control these:
* `vi.useFakeTimers()`: Call this at the beginning of your `describe` block or in a `beforeEach`.
* `vi.runAllTimers()`: Advances all pending timers to their completion.
* `vi.advanceTimersByTime(ms)`: Advances timers by a specific amount.
* `vi.useRealTimers()`: Call in an `afterEach` or `afterAll` to restore real timers if needed.

**3. Game Initialization within Tests:**
The `initializeGame` function in `main.ts` sets up the DOM event listeners and the main game loop (`requestAnimationFrame`). For integration tests focusing on turn logic and state, directly calling `initializeGame` might start an animation loop we don't want.

Instead, we might need a test-specific helper function that performs the core setup parts of `initializeGame` (creating characters, grid, setting initial turn order) and populates our test `gameState` object without starting the `requestAnimationFrame` loop or attaching real DOM listeners if they interfere. However, since `initializeGame` also sets up the initial turn, it's often easier to call it and manage timers. We'll try calling it and see how it behaves with mocked timers.

**4. Simulating Player Input:**
Since we're not using browser automation, we won't be "clicking" the canvas. Instead, we'll directly call the handler functions from `main.ts` that would normally be triggered by these events, like `handleCanvasClick` or `handleActionButtonClick`, passing them the necessary arguments (e.g., simulated click coordinates or action types).

Let's proceed with the test file.

