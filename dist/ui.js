// src/ui.ts
import { ActionType, CharacterType } from './types';
import { MAX_ACTION_LOG_MESSAGES, UI_FONT } from './config';
// --- DOM Element References ---
let playerCharactersDisplay;
let enemyCharactersDisplay;
let actionLogDisplay;
let currentTurnCharacterSpan;
let actionsContainer;
let gameMessageBox;
let messageTitle;
let messageText;
let messageCloseButton;
// Action Buttons
let moveButton;
let attackButton;
let specialButton;
let endTurnButton;
/**
 * Initializes all UI elements and attaches event listeners for UI controls.
 * @param initialState The initial game state to populate some UI parts.
 * @param onActionButtonClick Callback for when an action button is clicked.
 * @param onEndTurnClick Callback for when the end turn button is clicked.
 * @param onResetGameClick Callback for when the reset/restart button on the game message box is clicked.
 */
export function initializeUI(initialState, onActionButtonClick, onEndTurnClick, onResetGameClick) {
    playerCharactersDisplay = document.getElementById('player-characters-display');
    enemyCharactersDisplay = document.getElementById('enemy-characters-display');
    actionLogDisplay = document.getElementById('action-log');
    currentTurnCharacterSpan = document.getElementById('current-turn-character');
    actionsContainer = document.getElementById('actions-container');
    gameMessageBox = document.getElementById('game-message-box');
    messageTitle = document.getElementById('message-title');
    messageText = document.getElementById('message-text');
    messageCloseButton = document.getElementById('message-close-button');
    // Get action buttons
    moveButton = document.getElementById('move-button');
    attackButton = document.getElementById('attack-button');
    specialButton = document.getElementById('special-button');
    endTurnButton = document.getElementById('end-turn-button');
    if (!playerCharactersDisplay || !enemyCharactersDisplay || !actionLogDisplay || !currentTurnCharacterSpan || !actionsContainer || !gameMessageBox || !messageTitle || !messageText || !messageCloseButton || !moveButton || !attackButton || !specialButton || !endTurnButton) {
        console.error("One or more UI elements not found in the DOM!");
        return;
    }
    // Attach event listeners to action buttons
    moveButton.addEventListener('click', () => onActionButtonClick(ActionType.MOVE));
    attackButton.addEventListener('click', () => onActionButtonClick(ActionType.ATTACK));
    specialButton.addEventListener('click', () => onActionButtonClick('SPECIAL')); // Use 'SPECIAL' to distinguish from ActionType
    endTurnButton.addEventListener('click', onEndTurnClick);
    messageCloseButton.addEventListener('click', onResetGameClick);
    // Initial population if needed (e.g., action log)
    updateActionLog(initialState.actionLog);
    updateCharacterDisplays(initialState.characters);
    if (initialState.activeCharacterId) {
        updateTurnIndicator(initialState.characters.find(c => c.id === initialState.activeCharacterId) || null);
    }
}
/**
 * Updates the display of player and enemy characters.
 * @param characters Array of all characters in the game.
 */
export function updateCharacterDisplays(characters) {
    if (!playerCharactersDisplay || !enemyCharactersDisplay)
        return;
    playerCharactersDisplay.innerHTML = ''; // Clear previous entries
    enemyCharactersDisplay.innerHTML = '';
    characters.forEach(char => {
        const charCard = document.createElement('div');
        charCard.className = 'character-card mb-3 p-3 bg-gray-600 rounded-md border border-gray-500 shadow';
        if (!char.isAlive) {
            charCard.classList.add('opacity-50');
        }
        const name = document.createElement('h4');
        name.className = 'text-sm font-bold mb-1 font-press-start';
        name.textContent = `${char.name} ${char.isAlive ? '' : '(Fallen)'}`;
        name.style.color = char.type === CharacterType.PLAYER ? '#a3bffa' : '#fca5a5'; // Light blue for players, light red for enemies
        const hp = document.createElement('p');
        hp.className = 'text-xs text-gray-300';
        hp.textContent = `HP: ${char.stats.currentHp} / ${char.stats.maxHp}`;
        // Health Bar
        const healthBarContainer = document.createElement('div');
        healthBarContainer.className = 'health-bar-container w-full bg-gray-500 rounded-sm h-2.5 mt-1 overflow-hidden';
        const healthBar = document.createElement('div');
        healthBar.className = 'health-bar h-full rounded-sm';
        const hpPercentage = char.isAlive ? (char.stats.currentHp / char.stats.maxHp) * 100 : 0;
        healthBar.style.width = `${hpPercentage}%`;
        if (hpPercentage <= 25)
            healthBar.style.backgroundColor = '#f87171'; // red-400
        else if (hpPercentage <= 60)
            healthBar.style.backgroundColor = '#facc15'; // yellow-400
        else
            healthBar.style.backgroundColor = '#4ade80'; // green-400
        healthBarContainer.appendChild(healthBar);
        charCard.appendChild(name);
        charCard.appendChild(hp);
        charCard.appendChild(healthBarContainer);
        if (char.type === CharacterType.PLAYER) {
            playerCharactersDisplay.appendChild(charCard);
        }
        else {
            enemyCharactersDisplay.appendChild(charCard);
        }
    });
}
/**
 * Adds a new message to the action log display.
 * @param message The message string to add.
 */
export function addMessageToActionLog(message, gameState) {
    if (!actionLogDisplay)
        return;
    if (gameState) { // If full gameState is passed, update its log and then render
        gameState.actionLog.unshift(message); // Add to the beginning
        if (gameState.actionLog.length > MAX_ACTION_LOG_MESSAGES) {
            gameState.actionLog.pop(); // Remove the oldest message
        }
        updateActionLog(gameState.actionLog);
    }
    else { // If only a message string, just append to current display (less ideal)
        const messageElement = document.createElement('p');
        messageElement.textContent = message;
        messageElement.style.fontFamily = UI_FONT;
        messageElement.style.fontSize = '0.7rem';
        actionLogDisplay.insertBefore(messageElement, actionLogDisplay.children[1]); // Insert after the "Game Log:" title
        if (actionLogDisplay.children.length > MAX_ACTION_LOG_MESSAGES + 1) { // +1 for the title
            actionLogDisplay.removeChild(actionLogDisplay.lastChild);
        }
    }
}
/**
 * Updates the entire action log display.
 * @param messages Array of messages to display.
 */
export function updateActionLog(messages) {
    if (!actionLogDisplay)
        return;
    // Keep the first child (the "Game Log:" title) and clear the rest
    while (actionLogDisplay.children.length > 1) {
        actionLogDisplay.removeChild(actionLogDisplay.lastChild);
    }
    // Add new messages, newest first
    messages.slice(0, MAX_ACTION_LOG_MESSAGES).forEach(msg => {
        const messageElement = document.createElement('p');
        messageElement.textContent = msg;
        messageElement.style.fontFamily = UI_FONT;
        messageElement.style.fontSize = '0.7rem';
        messageElement.style.lineHeight = '1.2';
        actionLogDisplay.appendChild(messageElement);
    });
    actionLogDisplay.scrollTop = 0; // Scroll to top to see latest message
}
/**
 * Updates the turn indicator display.
 * @param activeCharacter The character whose turn it currently is.
 */
export function updateTurnIndicator(activeCharacter) {
    if (!currentTurnCharacterSpan)
        return;
    if (activeCharacter && activeCharacter.isAlive) {
        currentTurnCharacterSpan.textContent = activeCharacter.name;
        currentTurnCharacterSpan.style.color = activeCharacter.type === CharacterType.PLAYER ? '#60a5fa' : '#f87171'; // blue-400 or red-400
    }
    else {
        currentTurnCharacterSpan.textContent = "---";
        currentTurnCharacterSpan.style.color = '#9ca3af'; // gray-400
    }
}
/**
 * Updates the state of action buttons (enabled/disabled, highlighted).
 * @param activeCharacter The currently active character.
 * @param isPlayerTurn True if it's a player's turn.
 * @param selectedAction The action currently selected by the player (if any).
 */
export function updateActionButtons(activeCharacter, isPlayerTurn, selectedAction) {
    const canPerformActions = activeCharacter && activeCharacter.isAlive && isPlayerTurn;
    moveButton.disabled = !canPerformActions || !activeCharacter?.canMove;
    attackButton.disabled = !canPerformActions || !activeCharacter?.canAct || !activeCharacter.actions.some(a => a.type === ActionType.ATTACK);
    specialButton.disabled = !canPerformActions || !activeCharacter?.canAct || !activeCharacter.actions.some(a => a.type === ActionType.SPECIAL_ABILITY);
    endTurnButton.disabled = !isPlayerTurn; // Only player can end their turn via button
    // Highlight selected action button
    [moveButton, attackButton, specialButton].forEach(btn => btn.classList.remove('ring-2', 'ring-yellow-400'));
    if (selectedAction) {
        if (selectedAction.type === ActionType.MOVE && !moveButton.disabled) {
            moveButton.classList.add('ring-2', 'ring-yellow-400');
        }
        else if (selectedAction.type === ActionType.ATTACK && !attackButton.disabled) {
            attackButton.classList.add('ring-2', 'ring-yellow-400');
        }
        else if (selectedAction.type === ActionType.SPECIAL_ABILITY && !specialButton.disabled) {
            specialButton.classList.add('ring-2', 'ring-yellow-400');
        }
    }
}
/**
 * Shows a game message (e.g., win/loss).
 * @param title The title of the message.
 * @param text The main text of the message.
 * @param winner The winner, to style the message box (optional).
 */
export function showGameMessage(title, text, winner) {
    if (!gameMessageBox || !messageTitle || !messageText || !messageCloseButton)
        return;
    messageTitle.textContent = title;
    messageText.textContent = text;
    // Style based on winner
    messageTitle.className = 'text-2xl font-bold mb-4 font-press-start'; // Reset classes
    messageCloseButton.className = 'font-bold py-2 px-6 rounded-lg shadow-md font-press-start transition duration-150 ease-in-out';
    if (winner === CharacterType.PLAYER) {
        messageTitle.classList.add('text-green-400');
        messageCloseButton.classList.add('bg-green-500', 'hover:bg-green-700', 'text-white');
        messageCloseButton.textContent = "Play Again?";
    }
    else if (winner === CharacterType.ENEMY) {
        messageTitle.classList.add('text-red-400');
        messageCloseButton.classList.add('bg-red-500', 'hover:bg-red-700', 'text-white');
        messageCloseButton.textContent = "Try Again?";
    }
    else { // Neutral or draw
        messageTitle.classList.add('text-yellow-400');
        messageCloseButton.classList.add('bg-blue-500', 'hover:bg-blue-700', 'text-white');
        messageCloseButton.textContent = "Continue";
    }
    gameMessageBox.classList.remove('hidden');
    gameMessageBox.classList.add('flex');
}
/**
 * Hides the game message box.
 */
export function hideGameMessage() {
    if (!gameMessageBox)
        return;
    gameMessageBox.classList.add('hidden');
    gameMessageBox.classList.remove('flex');
}
