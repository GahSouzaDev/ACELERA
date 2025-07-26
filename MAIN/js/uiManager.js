// js/uiManager.js
import { gameConfig } from './gameConfig.js';
import { CARS } from './cars/carFactory.js';
import { TRACKS } from './tracks/trackFactory.js';
import { isMobileDevice, createNameTagCanvas } from './utils.js';

// --- Elementos da Interface ---
const elements = {
    // Screens
    startScreen: document.getElementById('startScreen'),
    shopScreen: document.getElementById('shopScreen'),
    gameScreen: document.getElementById('gameScreen'),
    loadingOverlay: document.getElementById('loadingOverlay'),
    endGameScreen: document.getElementById('endGameScreen'),

    // Start Screen
    playerNameInput: document.getElementById('playerNameInput'),
    roomInput: document.getElementById('roomInput'),
    generateIdButton: document.getElementById('generateIdButton'),
    copyIdButton: document.getElementById('copyIdButton'),
    multiplayerButton: document.getElementById('multiplayerButton'),
    offlineButton: document.getElementById('offlineButton'),

    // Shop Screen
    moneyDisplay: document.getElementById('moneyDisplay'),
    carSelectionContainer: document.getElementById('carSelectionContainer'),
    upgradeButtons: document.querySelectorAll('.buy-button'),
    torqueCost: document.getElementById('torqueCost'),
    speedCost: document.getElementById('speedCost'),
    gearsCost: document.getElementById('gearsCost'),
    betValue: document.getElementById('betValue'),
    betIncrease: document.getElementById('betIncrease'),
    betDecrease: document.getElementById('betDecrease'),
    raceButton: document.getElementById('raceButton'),

    // Game Screen HUD
    statusDisplay: document.getElementById('status'),
    speedDisplay: document.getElementById('speedDisplay'), // HUD speed
    gearDisplay: document.getElementById('gearDisplay'),   // HUD gear
    lapCounter: document.getElementById('lapCounter'),
    positionDisplay: document.getElementById('positionDisplay'),
    
    // Dashboard (in-game speedometer/tachometer)
    dashboardSpeedDisplay: document.getElementById('dashboardSpeedDisplay'),
    dashboardGearDisplay: document.getElementById('dashboardGearDisplay'),
    rpmNeedle: document.getElementById('rpmNeedle'),

    // Mobile Controls
    mobileControls: document.getElementById('mobileControls'),
    accelerateBtn: document.getElementById('accelerateBtn'),
    brakeBtn: document.getElementById('brakeBtn'),
    gearUpBtn: document.getElementById('gearUpBtn'),
    gearDownBtn: document.getElementById('gearDownBtn'),
    dpadUp: document.getElementById('dpadUp'),
    dpadLeft: document.getElementById('dpadLeft'),
    dpadRight: document.getElementById('dpadRight'),
    dpadDown: document.getElementById('dpadDown'), // Assuming you might add an 'up' button for D-pad if not accelerating

    // End Game Screen
    endGameMessage: document.getElementById('endGameMessage'),
    raceResults: document.getElementById('raceResults'),
    rematchBtn: document.getElementById('rematchBtn'),
    exitBtn: document.getElementById('exitBtn'),
};

// --- Funções de Exibição de Telas ---
export function showScreen(screenId) {
    const screens = [
        elements.startScreen,
        elements.shopScreen,
        elements.gameScreen,
        elements.loadingOverlay,
        elements.endGameScreen
    ];
    
    screens.forEach(screen => {
        if (screen.id === screenId) {
            screen.classList.remove('hidden');
            // Force reflow to ensure transition plays
            void screen.offsetWidth; 
            screen.style.opacity = '1';
            screen.style.pointerEvents = 'auto';
        } else {
            screen.style.opacity = '0';
            screen.style.pointerEvents = 'none';
            // Use setTimeout to add 'hidden' after transition
            setTimeout(() => {
                screen.classList.add('hidden');
            }, 500); // Must match CSS transition duration
        }
    });
}

// --- Atualizações de HUD / Dashboard ---
export function updateHUD(speed, gear, currentLap, totalLaps, position, rpm) {
    elements.speedDisplay.textContent = Math.abs(Math.round(speed));
    elements.gearDisplay.textContent = gear;
    elements.lapCounter.textContent = `VOLTA: ${currentLap}/${totalLaps}`;
    elements.positionDisplay.textContent = `POSIÇÃO: ${position}°`;

    // Dashboard updates
    elements.dashboardSpeedDisplay.textContent = Math.abs(Math.round(speed));
    elements.dashboardGearDisplay.textContent = gear;

    // RPM Needle update (-135deg for 0 RPM, +135deg for max RPM, total 270deg range)
    const maxRpm = 8000; // Define max RPM for your visual gauge
    const rpmRatio = Math.min(1, Math.max(0, rpm / maxRpm));
    const angle = -135 + (rpmRatio * 270);
    elements.rpmNeedle.style.transform = `rotate(${angle}deg)`;
}

export function updateMoneyDisplay() {
    elements.moneyDisplay.textContent = `Dinheiro: $${gameConfig.money}`;
    updateUpgradeButtonStates();
    updateBetValue(gameConfig.betAmount); // Ensure bet value display is updated if money changes
}

export function updateUpgradeButtonStates() {
    elements.upgradeButtons.forEach(button => {
        const upgradeType = button.dataset.upgrade;
        let cost = 0;
        switch (upgradeType) {
            case 'torque': cost = 100 * (gameConfig.upgrades.torque + 1); break;
            case 'speed': cost = 150 * (gameConfig.upgrades.speed + 1); break;
            case 'gears': cost = 200 * (gameConfig.upgrades.gears + 1); break;
        }
        
        // Assuming max 3 levels for upgrades for now
        const maxLevel = 3; 
        const currentLevel = gameConfig.upgrades[upgradeType];

        if (currentLevel >= maxLevel) {
            button.textContent = 'MÁXIMO!';
            button.disabled = true;
            elements[`${upgradeType}Cost`].textContent = '---';
        } else {
            button.textContent = `COMPRAR ($${cost})`;
            button.disabled = gameConfig.money < cost;
            elements[`${upgradeType}Cost`].textContent = `$${cost}`;
        }
    });
}

export function updateBetValue(amount) {
    elements.betValue.textContent = `$${amount}`;
}

export function setLoadingText(text) {
    elements.loadingText.textContent = text;
}

export function showEndGameResults(message, results) {
    elements.endGameMessage.textContent = message;
    let resultsHTML = '<h3>Resultados:</h3>';
    results.forEach(result => {
        resultsHTML += `<p>${result.name}: ${(result.time / 1000).toFixed(2)}s</p>`;
    });
    elements.raceResults.innerHTML = resultsHTML;
    showScreen('endGameScreen');
}

// --- Funções de Car/Track Selection (Shop Screen) ---
export function populateCarSelection(onCarSelectCallback) {
    elements.carSelectionContainer.innerHTML = ''; // Clear previous options
    Object.values(CARS).forEach(car => {
        const carOptionDiv = document.createElement('div');
        carOptionDiv.className = 'car-option';
        carOptionDiv.dataset.carId = car.id;
        carOptionDiv.innerHTML = `
            <img src="https://via.placeholder.com/150x90/333333/FFFFFF?text=${car.name.replace(' ', '+')}" alt="${car.name}">
            <p>${car.name}</p>
        `;
        carOptionDiv.addEventListener('click', () => {
            document.querySelectorAll('.car-option').forEach(opt => opt.classList.remove('selected'));
            carOptionDiv.classList.add('selected');
            gameConfig.selectedCarId = car.id;
            onCarSelectCallback(car.id); // Notify main game logic
        });
        elements.carSelectionContainer.appendChild(carOptionDiv);
    });

    // Select the initially configured car
    const initialCarOption = elements.carSelectionContainer.querySelector(`[data-car-id="${gameConfig.selectedCarId}"]`);
    if (initialCarOption) {
        initialCarOption.classList.add('selected');
    }
}

// --- Inicialização da Interface ---
export function initUI(gameCallbacks) {
    // Player Name Input
    elements.playerNameInput.value = gameConfig.playerName;
    elements.playerNameInput.addEventListener('input', (e) => {
        gameConfig.playerName = e.target.value.substring(0, 15) || "Player";
        if (gameConfig.localPlayerNameTag) {
            gameConfig.localPlayerNameTag.material.map = createNameTagCanvas(gameConfig.playerName, 0x3366ff); // Replace with actual car color
            gameConfig.localPlayerNameTag.material.map.needsUpdate = true;
        }
    });

    // Start Screen Buttons
    elements.generateIdButton.addEventListener('click', gameCallbacks.onGenerateRoomId);
    elements.copyIdButton.addEventListener('click', gameCallbacks.onCopyRoomId);
    elements.multiplayerButton.addEventListener('click', gameCallbacks.onMultiplayerStart);
    elements.offlineButton.addEventListener('click', gameCallbacks.onOfflineStart);

    // Shop Screen Buttons
    populateCarSelection(gameCallbacks.onCarSelected); // Add car selection logic
    elements.raceButton.addEventListener('click', gameCallbacks.onRaceStart);

    elements.upgradeButtons.forEach(button => {
        button.addEventListener('click', (e) => gameCallbacks.onBuyUpgrade(e.target.dataset.upgrade));
    });
    elements.betIncrease.addEventListener('click', gameCallbacks.onBetIncrease);
    elements.betDecrease.addEventListener('click', gameCallbacks.onBetDecrease);

    // End Game Screen Buttons
    elements.rematchBtn.addEventListener('click', gameCallbacks.onRematch);
    elements.exitBtn.addEventListener('click', gameCallbacks.onExitGame);

    // Control Buttons (Desktop vs Mobile)
    if (isMobileDevice()) {
        elements.mobileControls.style.display = 'flex'; // Show mobile controls
        elements.accelerateBtn.addEventListener('touchstart', gameCallbacks.onAccelerateStart);
        elements.accelerateBtn.addEventListener('touchend', gameCallbacks.onAccelerateEnd);
        elements.brakeBtn.addEventListener('touchstart', gameCallbacks.onBrakeStart);
        elements.brakeBtn.addEventListener('touchend', gameCallbacks.onBrakeEnd);
        elements.gearUpBtn.addEventListener('click', gameCallbacks.onGearUp);
        elements.gearDownBtn.addEventListener('click', gameCallbacks.onGearDown);
        elements.dpadLeft.addEventListener('touchstart', gameCallbacks.onTurnLeftStart);
        elements.dpadLeft.addEventListener('touchend', gameCallbacks.onTurnLeftEnd);
        elements.dpadRight.addEventListener('touchstart', gameCallbacks.onTurnRightStart);
        elements.dpadRight.addEventListener('touchend', gameCallbacks.onTurnRightEnd);
        elements.dpadUp.addEventListener('touchstart', gameCallbacks.onAccelerateStart); // Re-map for DPAD-UP
        elements.dpadUp.addEventListener('touchend', gameCallbacks.onAccelerateEnd);
        elements.dpadDown.addEventListener('touchstart', gameCallbacks.onBrakeStart); // Re-map for DPAD-DOWN
        elements.dpadDown.addEventListener('touchend', gameCallbacks.onBrakeEnd);
        
    } else {
        elements.mobileControls.style.display = 'none'; // Hide mobile controls
    }

    updateMoneyDisplay(); // Initial display of money
    updateUpgradeButtonStates(); // Initial state for upgrade buttons
}

// Expose elements for direct manipulation where necessary (e.g., in main.js for roomInput.value)
export const uiElements = elements;