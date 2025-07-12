function updateStatus(message) {
    document.getElementById('status').textContent = message;
}

function showEndGameScreen(message) {
    document.getElementById('endGameScreen').style.display = 'block';
    document.getElementById('endGameMessage').textContent = message;
    
    let resultsHTML = '<h3>RESULTADOS:</h3>';
    Object.keys(window.finishTimes).sort((a, b) => window.finishTimes[a] - window.finishTimes[b]).forEach(playerId => {
        const time = (window.finishTimes[playerId] / 1000).toFixed(2);
        resultsHTML += `<p>JOGADOR ${parseInt(playerId) + 1}: ${time}S</p>`;
    });
    
    document.getElementById('raceResults').innerHTML = resultsHTML;
}

function showCustomization() {
    document.getElementById('customizationScreen').style.display = 'block';
    
    document.querySelectorAll('.car-option').forEach(option => {
        option.classList.remove('selected');
        if (option.querySelector('img').alt.toLowerCase().includes(window.carConfig.model)) {
            option.classList.add('selected');
        }
    });
    
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('selected');
        if (option.style.backgroundColor === window.carConfig.color) {
            option.classList.add('selected');
        }
    });
    
    document.getElementById('engineLevel').value = window.carConfig.engineLevel;
    document.getElementById('engineLevelValue').textContent = window.carConfig.engineLevel;
    document.getElementById('tireLevel').value = window.carConfig.tireLevel;
    document.getElementById('tireLevelValue').textContent = window.carConfig.tireLevel;
}

function selectCarModel(model) {
    window.carConfig.model = model;
    document.querySelectorAll('.car-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
}

function selectColor(color) {
    window.carConfig.color = color;
    document.querySelectorAll('.color-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
}

function saveCustomization() {
    window.carConfig.engineLevel = parseInt(document.getElementById('engineLevel').value);
    window.carConfig.tireLevel = parseInt(document.getElementById('tireLevel').value);
    window.saveCarConfig();
    document.getElementById('customizationScreen').style.display = 'none';
}

function saveCarConfig() {
    localStorage.setItem('carConfig', JSON.stringify(window.carConfig));
}

function loadCarConfig() {
    const savedConfig = localStorage.getItem('carConfig');
    if (savedConfig) {
        window.carConfig = JSON.parse(savedConfig);
    }
}

function saveGameData() {
    localStorage.setItem('playerMoney', window.playerMoney);
}

function loadGameData() {
    const savedMoney = localStorage.getItem('playerMoney');
    if (savedMoney) {
        window.playerMoney = parseInt(savedMoney);
    }
}

function generateRandomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 5; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('roomId').value = id;
    window.updateStatus('ID GERADO!');
}

function restartGame() {
    if (window.dataChannel && window.dataChannel.readyState === 'open') {
        window.dataChannel.send(JSON.stringify({ type: 'restart' }));
        window.performGameRestart();
    } else {
        window.updateStatus('RECONECTANDO...');
        window.joinRoom();
    }
}

window.updateStatus = updateStatus;
window.showEndGameScreen = showEndGameScreen;
window.showCustomization = showCustomization;
window.selectCarModel = selectCarModel;
window.selectColor = selectColor;
window.saveCustomization = saveCustomization;
window.saveCarConfig = saveCarConfig;
window.loadCarConfig = loadCarConfig;
window.saveGameData = saveGameData;
window.loadGameData = loadGameData;
window.generateRandomId = generateRandomId;
window.restartGame = restartGame;