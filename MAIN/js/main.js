// js/main.js
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
import { gameConfig, gearSettings, rtcConfig, SERVER_URL } from './gameConfig.js';
import { initUI, showScreen, updateHUD, updateMoneyDisplay, updateUpgradeButtonStates, updateBetValue, uiElements } from './uiManager.js';
import { SoundManager } from './soundManager.js';
import { generateRoomId, isMobileDevice, createNameTagSprite } from './utils.js';
import { getCarById, CARS } from './cars/carFactory.js';
import { getTrackById, TRACKS } from './tracks/trackFactory.js';

// --- Variáveis Globais de Jogo ---
let scene, camera, renderer;
let localCar = null; // Object holding { group, wheels, data (from gameConfig), nameTag }
let remoteCar = null; // Object holding { group, wheels, data (from opponent's player object), nameTag }
let currentTrack = null; // Three.js Group for the track
let clock = new THREE.Clock();
let deltaTime = 0;
let players = {}; // Stores simplified state for local and remote players { id: { x, z, rotation, lap, name } }
let ws = null; // WebSocket connection
let peerConnection = null; // WebRTC Peer Connection
let dataChannel = null; // WebRTC Data Channel
let lastMoveSentTime = 0;
let startTime = null;
let finishTimes = {}; // { playerId: timeInMs }
let soundManager = new SoundManager();
let keys = {}; // Keyboard input state

// --- Callbacks para UI Manager ---
const gameCallbacks = {
    onGenerateRoomId: () => {
        gameConfig.roomId = generateRoomId();
        uiElements.roomInput.value = gameConfig.roomId;
        uiElements.statusDisplay.textContent = 'ID gerado! Compartilhe.';
    },
    onCopyRoomId: () => {
        if (uiElements.roomInput.value) {
            navigator.clipboard.writeText(uiElements.roomInput.value);
            uiElements.statusDisplay.textContent = 'ID copiado!';
        }
    },
    onMultiplayerStart: () => {
        gameConfig.isOffline = false;
        gameConfig.playerName = uiElements.playerNameInput.value.trim() || "Jogador";
        if (!gameConfig.playerName) {
            uiElements.statusDisplay.textContent = 'Por favor, digite seu nome.';
            return;
        }
        gameConfig.roomId = uiElements.roomInput.value.trim();
        if (!gameConfig.roomId) {
            uiElements.statusDisplay.textContent = 'Por favor, insira ou gere um ID de sala.';
            return;
        }
        showScreen('shopScreen');
        updateMoneyDisplay();
    },
    onOfflineStart: () => {
        gameConfig.isOffline = true;
        gameConfig.playerName = uiElements.playerNameInput.value.trim() || "Jogador";
        if (!gameConfig.playerName) {
            uiElements.statusDisplay.textContent = 'Por favor, digite seu nome.';
            return;
        }
        gameConfig.opponentName = "CPU"; // Default name for CPU
        showScreen('shopScreen');
        updateMoneyDisplay();
    },
    onRaceStart: () => {
        // Ensure sound context is resumed after user gesture
        soundManager.audioContext.resume().then(() => {
            console.log('AudioContext resumed!');
            if (!gameConfig.isOffline) {
                connectToServer();
                showScreen('loadingOverlay');
                uiElements.loadingText.textContent = 'Conectando ao servidor...';
            } else {
                setupGameScene(); // For offline, directly setup scene
                showScreen('gameScreen');
                startGame();
            }
        }).catch(e => console.error("Could not resume AudioContext:", e));
    },
    onBuyUpgrade: (upgradeType) => {
        let cost = 0;
        let currentLevel = gameConfig.upgrades[upgradeType];

        switch (upgradeType) {
            case 'torque': cost = 100 * (currentLevel + 1); break;
            case 'speed': cost = 150 * (currentLevel + 1); break;
            case 'gears': cost = 200 * (currentLevel + 1); break;
        }

        const maxLevel = 3; // Example: Max level for upgrades
        if (currentLevel < maxLevel && gameConfig.money >= cost) {
            gameConfig.money -= cost;
            gameConfig.upgrades[upgradeType]++;
            updateMoneyDisplay();
        } else if (currentLevel >= maxLevel) {
            console.log(`Upgrade ${upgradeType} já está no nível máximo.`);
        } else {
            console.log("Dinheiro insuficiente!");
        }
    },
    onBetIncrease: () => {
        const maxBet = Math.floor(gameConfig.money * 0.5); // Max 50% of current money
        if (gameConfig.betAmount < maxBet) {
            gameConfig.betAmount = Math.min(maxBet, gameConfig.betAmount + 50); // Increment by 50
            updateBetValue(gameConfig.betAmount);
        }
    },
    onBetDecrease: () => {
        if (gameConfig.betAmount > 0) {
            gameConfig.betAmount = Math.max(0, gameConfig.betAmount - 50);
            updateBetValue(gameConfig.betAmount);
        }
    },
    onCarSelected: (carId) => {
        gameConfig.selectedCarId = carId;
        console.log("Selected Car:", carId);
    },
    onRematch: () => {
        if (!gameConfig.isOffline && dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify({ type: 'rematch_request', playerId: gameConfig.playerId }));
            uiElements.loadingText.textContent = 'Aguardando rematch do oponente...';
            showScreen('loadingOverlay');
        } else if (gameConfig.isOffline) {
            restartGame();
            showScreen('gameScreen');
        }
    },
    onExitGame: () => {
        closeConnections();
        gameConfig.status = 'waiting';
        showScreen('startScreen');
        uiElements.statusDisplay.textContent = 'Pronto para jogar novamente';
        // Reset player data / UI elements
        gameConfig.playerId = null;
        gameConfig.roomId = null;
        gameConfig.isOffline = false;
        gameConfig.betAmount = 0;
        updateBetValue(0);
        localCar = null;
        remoteCar = null;
        players = {};
        finishTimes = {};
        // You might want to reset upgrades/money if not persisting them
        // gameConfig.money = 300; 
        // gameConfig.upgrades = { torque: 0, speed: 0, gears: 0 };
    },
    // Mobile Control Callbacks
    onAccelerateStart: () => { keys['accelerate'] = true; uiElements.accelerateBtn.classList.add('active'); },
    onAccelerateEnd: () => { keys['accelerate'] = false; uiElements.accelerateBtn.classList.remove('active'); },
    onBrakeStart: () => { keys['brake'] = true; uiElements.brakeBtn.classList.add('active'); },
    onBrakeEnd: () => { keys['brake'] = false; uiElements.brakeBtn.classList.remove('active'); },
    onGearUp: () => { shiftGearUp(); },
    onGearDown: () => { shiftGearDown(); },
    onTurnLeftStart: () => { keys['turnLeft'] = true; uiElements.dpadLeft.classList.add('active'); },
    onTurnLeftEnd: () => { keys['turnLeft'] = false; uiElements.dpadLeft.classList.remove('active'); },
    onTurnRightStart: () => { keys['turnRight'] = true; uiElements.dpadRight.classList.add('active'); },
    onTurnRightEnd: () => { keys['turnRight'] = false; uiElements.dpadRight.classList.remove('active'); },
};

// --- Funções de Inicialização e Setup ---
async function initGame() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB); // Sky blue
    scene.fog = new THREE.Fog(0x87CEEB, 100, 500);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Initial camera position, will be updated by updateCamera()
    camera.position.set(0, 50, -50);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048; // Higher resolution shadows
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -200;
    directionalLight.shadow.camera.right = 200;
    directionalLight.shadow.camera.top = 200;
    directionalLight.shadow.camera.bottom = -200;
    scene.add(directionalLight);

    // Initial setup for UI (event listeners etc.)
    initUI(gameCallbacks);

    // Load initial sound assets (if any beyond synthetic)
    await soundManager.init(); // CORRECTED: Now awaits AudioContext initialization

    setupControls(); // Setup keyboard and mobile controls
    animate(); // Start the game loop

    window.addEventListener('resize', onWindowResize);

    // Populate car selection options on shop screen (using CarFactory)
    // This is handled by uiManager.js populateCarSelection now.
}

function setupGameScene() {
    // Clear previous scene elements (if restarting/changing track/car)
    if (localCar && localCar.group) scene.remove(localCar.group);
    if (remoteCar && remoteCar.group) scene.remove(remoteCar.group);
    if (currentTrack) scene.remove(currentTrack);

    // Create selected car models
    const selectedCarDef = getCarById(gameConfig.selectedCarId);
    if (!selectedCarDef) {
        console.error("Selected car definition not found:", gameConfig.selectedCarId);
        return;
    }
    const localCarModel = selectedCarDef.createModel();
    localCar = {
        group: localCarModel.group,
        wheels: localCarModel.wheels,
        data: {
            position: selectedCarDef.startPosition || new THREE.Vector3().copy(getTrackById(gameConfig.selectedTrackId).startPosition),
            rotation: 0,
            targetRotation: 0,
            accelerationFactor: selectedCarDef.accelerationFactor,
            maxSpeedBase: selectedCarDef.maxSpeedBase,
            torqueMultiplierBase: selectedCarDef.torqueMultiplierBase,
            handlingFactor: selectedCarDef.handlingFactor,
            color: selectedCarDef.color, // Store car color
            name: gameConfig.playerName,
            currentLap: 0,
            lastCheckpoint: 0 // Reset checkpoint progress
        },
        nameTag: createNameTagSprite(gameConfig.playerName, selectedCarDef.color)
    };
    localCar.group.add(localCar.nameTag);
    scene.add(localCar.group);
    
    // Position the local car at the track's start position
    localCar.group.position.copy(localCar.data.position);
    localCar.data.rotation = 0; // Ensure straight start
    localCar.group.rotation.y = localCar.data.rotation;


    if (!gameConfig.isOffline) {
        const remoteCarModel = selectedCarDef.createModel(); // Opponent uses same car type for now
        // Change opponent car color slightly
        const opponentColor = new THREE.Color(selectedCarDef.color).offsetHSL(0.1, 0, 0).getHex(); // Shift hue
        remoteCarModel.group.traverse((node) => {
            if (node.isMesh && node.material instanceof THREE.MeshStandardMaterial) {
                node.material.color.set(opponentColor);
            }
        });

        remoteCar = {
            group: remoteCarModel.group,
            wheels: remoteCarModel.wheels,
            data: {
                position: selectedCarDef.startPosition || new THREE.Vector3().copy(getTrackById(gameConfig.selectedTrackId).startPosition),
                rotation: 0,
                // Placeholder for opponent name/color, will be updated via dataChannel
                name: gameConfig.opponentName, 
                color: opponentColor,
                currentLap: 0
            },
            nameTag: createNameTagSprite(gameConfig.opponentName, opponentColor)
        };
        remoteCar.group.add(remoteCar.nameTag);
        scene.add(remoteCar.group);
        // Offset remote car to start next to local car
        remoteCar.group.position.copy(localCar.data.position).add(new THREE.Vector3(0, 0, -5)); // Adjust Z for side-by-side
        remoteCar.data.position.copy(remoteCar.group.position);
    } else {
        remoteCar = null; // Ensure remoteCar is null in offline mode
    }

    // Create selected track
    const selectedTrackDef = getTrackById(gameConfig.selectedTrackId);
    if (!selectedTrackDef) {
        console.error("Selected track definition not found:", gameConfig.selectedTrackId);
        return;
    }
    currentTrack = selectedTrackDef.createModel();
    scene.add(currentTrack);

    // Initial player data setup for tracking
    players[gameConfig.playerId] = {
        name: gameConfig.playerName,
        id: gameConfig.playerId,
        x: localCar.data.position.x,
        z: localCar.data.position.z,
        rotation: localCar.data.rotation,
        lap: 0,
        lastCheckpoint: 0,
        finishTime: null
    };

    if (!gameConfig.isOffline && remoteCar) {
        const opponentPId = gameConfig.playerId === 0 ? 1 : 0;
        players[opponentPId] = {
            name: gameConfig.opponentName,
            id: opponentPId,
            x: remoteCar.data.position.x,
            z: remoteCar.data.position.z,
            rotation: remoteCar.data.rotation,
            lap: 0,
            lastCheckpoint: 0,
            finishTime: null
        };
    }
}


// --- Funções de Controle ---
function setupControls() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
        // Use generic keys flags to avoid direct dependency on DOM keys in gameConfig
        if (e.code === 'Space') keys['accelerate'] = true;
        if (e.code === 'KeyS') keys['brake'] = true;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys['turnLeft'] = true;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') keys['turnRight'] = true;

        if (e.code === 'KeyW' || e.code === 'ArrowUp') shiftGearUp();
        if (e.code === 'KeyS' && !keys['brake']) shiftGearDown(); // Shift down only if not braking with 'S'
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') keys['accelerate'] = false;
        if (e.code === 'KeyS') keys['brake'] = false;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys['turnLeft'] = false;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') keys['turnRight'] = false;
    });

    // Mobile controls are handled via uiManager, just need to set the state in `keys`
    // The `isMobileDevice()` check handles showing/hiding buttons.
    // REMOVED: setInterval(updateControls, 16); updateControls should not exist / not call updatePhysics.
}

function updateControlState() { // This function is called by animate() loop
    gameConfig.accelerationInput = 0;
    if (keys['accelerate']) {
        gameConfig.accelerationInput = 1;
    }
    if (keys['brake']) {
        gameConfig.accelerationInput = -0.5; // Represents braking/reverse
    }

    gameConfig.steeringInput = 0;
    if (keys['turnLeft']) {
        gameConfig.steeringInput = 1;
    }
    if (keys['turnRight']) {
        gameConfig.steeringInput = -1;
    }
}

// --- Funções de Conexão (WebRTC) ---
function connectToServer() {
    uiElements.statusDisplay.textContent = 'Conectando ao servidor...';
    
    ws = new WebSocket(SERVER_URL);

    ws.onopen = () => {
        uiElements.statusDisplay.textContent = 'Aguardando oponente...';
        ws.send(JSON.stringify({ 
            type: 'join', 
            roomId: gameConfig.roomId,
            playerName: gameConfig.playerName, // Send player name on join
            carId: gameConfig.selectedCarId // Send selected car
        }));
    };

    ws.onerror = (error) => {
        uiElements.statusDisplay.textContent = 'Erro na conexão. Tente novamente.';
        showScreen('shopScreen'); // Go back to shop screen on error
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        uiElements.statusDisplay.textContent = 'Conexão fechada.';
        if (gameConfig.status === 'playing' || gameConfig.status === 'finished') {
             showEndGameScreen(`Oponente desconectou.`, []); // Show results if game was active
        } else {
            showScreen('shopScreen'); // Go back to shop screen if not in game
        }
        closeConnections();
        gameConfig.status = 'waiting';
    };

    ws.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'start_multiplayer') {
                gameConfig.playerId = data.playerId;
                gameConfig.opponentName = data.opponentName; // Get opponent's name
                gameConfig.selectedCarId = data.localCarId; // Ensure both players use the car selected by Player 0
                gameConfig.selectedTrackId = data.localTrackId; // Ensure both players use the track selected by Player 0
                
                uiElements.statusDisplay.textContent = `Conectado! Você é o Jogador ${gameConfig.playerId + 1}`;
                initPeerConnection();
                if (gameConfig.playerId === 0) { // Player 0 creates the offer and data channel
                    dataChannel = peerConnection.createDataChannel('gameData');
                    setupDataChannel(true); // Is initiator
                    const offer = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offer);
                    ws.send(JSON.stringify({ type: 'offer', sdp: offer, roomId: gameConfig.roomId }));
                }
                setupGameScene(); // Setup scene once player data and selections are confirmed
            } else if (data.type === 'offer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                ws.send(JSON.stringify({ type: 'answer', sdp: answer, roomId: gameConfig.roomId }));
            } else if (data.type === 'answer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            } else if (data.type === 'ice') {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else if (data.type === 'error') {
                uiElements.statusDisplay.textContent = `Erro: ${data.message}`;
                showScreen('shopScreen');
            }
        } catch (error) {
            console.error('Error processing message from WebSocket:', error);
            uiElements.statusDisplay.textContent = 'Erro no processamento.';
            showScreen('shopScreen');
        }
    };
}

function initPeerConnection() {
    peerConnection = new RTCPeerConnection(rtcConfig);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            ws.send(JSON.stringify({ type: 'ice', candidate: event.candidate, roomId: gameConfig.roomId }));
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        uiElements.statusDisplay.textContent = `Estado da Conexão: ${state}`;
        if (state === 'failed' || state === 'disconnected') {
            uiElements.statusDisplay.textContent = 'Conexão P2P perdida. Tentando reconectar...';
            // You might want to implement reconnection logic here
        } else if (state === 'connected') {
            uiElements.statusDisplay.textContent = 'Conexão P2P estabelecida!';
            if (dataChannel && dataChannel.readyState === 'open') {
                 startGame();
            }
        }
    };

    // If we are not the initiator, we receive the data channel here
    peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        setupDataChannel(false); // Not initiator
    };
}

function setupDataChannel(isInitiator) {
    dataChannel.onopen = () => {
        uiElements.statusDisplay.textContent = 'Canal de dados aberto. Iniciando jogo...';
        showScreen('gameScreen');
        startGame();

        // Send initial player info (name, car color) after channel opens
        const carDefinition = getCarById(gameConfig.selectedCarId);
        dataChannel.send(JSON.stringify({ 
            type: 'player_info', 
            name: gameConfig.playerName, 
            color: carDefinition ? carDefinition.color : 0x3366ff 
        }));
    };

    dataChannel.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            const opponentId = gameConfig.playerId === 0 ? 1 : 0; // Determine opponent's ID based on local player ID

            if (data.type === 'move') {
                // Update opponent's position, rotation, speed, etc.
                if (remoteCar && players[opponentId]) {
                    remoteCar.data.position.set(data.x, remoteCar.data.position.y, data.z);
                    remoteCar.data.rotation = data.rotation;
                    remoteCar.group.position.copy(remoteCar.data.position);
                    remoteCar.group.rotation.y = remoteCar.data.rotation;

                    // Update remote car's wheels rotation
                    const wheelRotationSpeed = data.speed * deltaTime * 0.1; // Adjust multiplier as needed
                    remoteCar.wheels.forEach(wheel => {
                        wheel.rotation.x += wheelRotationSpeed;
                    });
                }
                players[opponentId].x = data.x;
                players[opponentId].z = data.z;
                players[opponentId].rotation = data.rotation;
                // Check if opponent is past the finish line for lap logic
                players[opponentId].lastCheckpoint = data.lastCheckpoint;
            } else if (data.type === 'lap_update') {
                if (players[opponentId]) {
                    players[opponentId].lap = data.lap;
                    players[opponentId].lastCheckpoint = data.lastCheckpoint; // Update opponent's checkpoint
                }
            } else if (data.type === 'player_info') {
                // Update opponent's name and car color
                gameConfig.opponentName = data.name;
                remoteCar.data.name = data.name;
                remoteCar.nameTag.material.map = createNameTagCanvas(data.name, data.color);
                remoteCar.nameTag.material.map.needsUpdate = true;
                remoteCar.group.traverse((node) => { // Apply color to remote car body
                    if (node.isMesh && node.material instanceof THREE.MeshStandardMaterial && node.geometry.parameters.depth === 5) { // Assuming body is the largest box
                        node.material.color.set(data.color);
                    }
                });
                console.log(`Opponent is: ${data.name} with car color ${data.color.toString(16)}`);
            } else if (data.type === 'race_finished') {
                if (!finishTimes[opponentId]) { // Record opponent's finish time if not already recorded
                    finishTimes[opponentId] = data.finishTime;
                    players[opponentId].finishTime = data.finishTime;
                    checkRaceCompletion(); // Check if both finished
                }
            } else if (data.type === 'rematch_request') {
                // If rematch request is received, automatically accept for simplicity
                dataChannel.send(JSON.stringify({ type: 'rematch_accepted', playerId: gameConfig.playerId }));
                restartGame();
                showScreen('gameScreen');
                uiElements.statusDisplay.textContent = 'Rematch aceito. Iniciando...';
            } else if (data.type === 'rematch_accepted') {
                restartGame();
                showScreen('gameScreen');
                uiElements.statusDisplay.textContent = 'Rematch aceito pelo oponente. Iniciando...';
            }
        } catch (error) {
            console.error('DataChannel message error:', error, event.data);
        }
    };

    dataChannel.onclose = () => {
        uiElements.statusDisplay.textContent = 'Canal de dados fechado.';
        if (gameConfig.status === 'playing' || gameConfig.status === 'finished') {
            showEndGameScreen(`Oponente desconectou.`, [
                { name: gameConfig.playerName, time: players[gameConfig.playerId]?.finishTime || (Date.now() - startTime) },
                { name: gameConfig.opponentName, time: players[gameConfig.playerId === 0 ? 1 : 0]?.finishTime || (Date.now() - startTime) } // Estimate opponent's time
            ]);
        }
        closeConnections();
    };

    dataChannel.onerror = (error) => {
        console.error('DataChannel error:', error);
        uiElements.statusDisplay.textContent = 'Erro no canal de dados.';
    };
}


// --- Funções de Lógica do Jogo ---
function startGame() {
    gameConfig.status = 'playing';
    startTime = Date.now();
    finishTimes = {};

    // Reset car physics properties
    gameConfig.speed = 0;
    gameConfig.gear = 'N';
    gameConfig.accelerationInput = 0;
    gameConfig.steeringInput = 0;
    localCar.data.targetRotation = 0;
    localCar.data.currentLap = 0;
    localCar.data.lastCheckpoint = 0;

    // Position local car at start
    localCar.group.position.copy(getTrackById(gameConfig.selectedTrackId).startPosition);
    localCar.group.rotation.y = 0; // Face forward

    if (!gameConfig.isOffline && remoteCar) {
        // Position remote car next to local car
        remoteCar.group.position.copy(localCar.data.position).add(new THREE.Vector3(0, 0, -5)); // Offset behind local car
        remoteCar.group.rotation.y = 0; // Face forward
        
        // Ensure remote car's data is updated with its actual starting position
        remoteCar.data.position.copy(remoteCar.group.position);
        remoteCar.data.rotation = 0;
        remoteCar.data.currentLap = 0;
        remoteCar.data.lastCheckpoint = 0;

        // Update player tracking object
        players[gameConfig.playerId === 0 ? 1 : 0].x = remoteCar.data.position.x;
        players[gameConfig.playerId === 0 ? 1 : 0].z = remoteCar.data.position.z;
        players[gameConfig.playerId === 0 ? 1 : 0].rotation = remoteCar.data.rotation;
        players[gameConfig.playerId === 0 ? 1 : 0].lap = 0;
        players[gameConfig.playerId === 0 ? 1 : 0].lastCheckpoint = 0;
    }

    uiElements.loadingText.textContent = 'Preparando corrida...';
    showScreen('gameScreen');
    updateHUD(0, 'N', 0, 3, 1, 0); // Initial HUD state
    soundManager.startEngineSound();
}

function restartGame() {
    gameConfig.status = 'playing';
    startTime = Date.now();
    finishTimes = {};

    // Reset car physics properties
    gameConfig.speed = 0;
    gameConfig.gear = 'N';
    gameConfig.accelerationInput = 0;
    gameConfig.steeringInput = 0;
    localCar.data.targetRotation = 0;
    localCar.data.currentLap = 0;
    localCar.data.lastCheckpoint = 0;

    // Position local car at start
    localCar.group.position.copy(getTrackById(gameConfig.selectedTrackId).startPosition);
    localCar.group.rotation.y = 0; // Face forward

    if (!gameConfig.isOffline && remoteCar) {
        // Position remote car next to local car
        remoteCar.group.position.copy(localCar.data.position).add(new THREE.Vector3(0, 0, -5)); // Offset behind local car
        remoteCar.group.rotation.y = 0; // Face forward
        
        // Ensure remote car's data is updated with its actual starting position
        remoteCar.data.position.copy(remoteCar.group.position);
        remoteCar.data.rotation = 0;
        remoteCar.data.currentLap = 0;
        remoteCar.data.lastCheckpoint = 0;

        // Update player tracking object
        players[gameConfig.playerId === 0 ? 1 : 0].x = remoteCar.data.position.x;
        players[gameConfig.playerId === 0 ? 1 : 0].z = remoteCar.data.position.z;
        players[gameConfig.playerId === 0 ? 1 : 0].rotation = remoteCar.data.rotation;
        players[gameConfig.playerId === 0 ? 1 : 0].lap = 0;
        players[gameConfig.playerId === 0 ? 1 : 0].lastCheckpoint = 0;
    }

    soundManager.startEngineSound();
    updateHUD(0, 'N', 0, 3, 1, 0); // Reset HUD
    uiElements.statusDisplay.textContent = 'Corrida reiniciada!';
    showScreen('gameScreen');
}


function updatePhysics() {
    // This function is now ONLY called by the animate() loop.
    // Inputs are read from 'keys' flags, updated by updateControlState()
    const carStats = localCar.data;
    const currentGearSetting = gearSettings[gameConfig.gear];
    const speedKmh = gameConfig.speed; // Current speed in km/h

    // Apply upgrades
    const upgradeTorqueFactor = 1 + (gameConfig.upgrades.torque * 0.2); // +20% per level
    const upgradeSpeedFactor = 1 + (gameConfig.upgrades.speed * 0.15);  // +15% per level
    const upgradeGearFactor = 1 + (gameConfig.upgrades.gears * 0.25); // Expands optimal range

    // Calculate RPM based on current speed and gear ratios
    // This is a simplified model. Real cars have complex RPM curves.
    const maxSpeedForGear = currentGearSetting.maxSpeed * upgradeSpeedFactor;
    let rpm = 0;
    if (currentGearSetting.name !== 'N' && currentGearSetting.name !== 'R') {
        rpm = (Math.abs(speedKmh) / maxSpeedForGear) * 8000; // Max RPM around 8000
    } else if (gameConfig.gear === 'R') {
        rpm = (Math.abs(speedKmh) / currentGearSetting.maxSpeed) * 4000; // Lower max RPM for reverse
    }
    gameConfig.currentTorque = rpm; // Use RPM for torque display for now

    // Calculate torque efficiency based on optimal RPM range
    let torqueEfficiency = 0;
    if (gameConfig.gear !== 'N') {
        const optimalMin = currentGearSetting.optimalMin * upgradeGearFactor;
        const optimalMax = currentGearSetting.optimalMax * upgradeGearFactor;

        if (Math.abs(speedKmh) >= optimalMin && Math.abs(speedKmh) <= optimalMax) {
            torqueEfficiency = currentGearSetting.torqueMultiplier * carStats.torqueMultiplierBase;
        } else {
            // Drop-off outside optimal range
            const distance = Math.min(
                Math.abs(Math.abs(speedKmh) - optimalMin),
                Math.abs(Math.abs(speedKmh) - optimalMax)
            );
            // Linear decay from optimal range
            torqueEfficiency = currentGearSetting.torqueMultiplier * carStats.torqueMultiplierBase * Math.max(0.1, 1 - (distance / 50)); // 50 km/h outside optimal, torque drops to 10%
        }
    } else { // Neutral gear
        torqueEfficiency = currentGearSetting.torqueMultiplier; // Very low torque
    }
    
    torqueEfficiency *= upgradeTorqueFactor; // Apply torque upgrade

    // Apply friction from track surface
    let frictionMultiplier = 1.0; // Default for asphalt
    const selectedTrack = getTrackById(gameConfig.selectedTrackId);
    if (selectedTrack && selectedTrack.frictionZones) {
        selectedTrack.frictionZones.forEach(zone => {
            let isInZone = false;
            // Simple check for oval track (circular bands)
            if (zone.type === 'circular_band') {
                const distance = localCar.data.position.distanceTo(new THREE.Vector3(0, 0, 0)); // Distance from origin
                if (distance > zone.innerRadius && distance < zone.outerRadius) {
                    isInZone = true;
                }
            } else if (zone.type === 'circle') {
                const distance = localCar.data.position.distanceTo(new THREE.Vector3(0, 0, 0));
                if (distance < zone.radius) {
                    isInZone = true;
                }
            } else if (zone.type === 'curve_proximity') {
                // For circuit track, determine if car is off the main road segment
                // This is a simplified check. A more robust solution would involve raycasting to the track mesh or
                // more precise calculation of distance to the curve and normal direction.
                const carPos2D = new THREE.Vector2(localCar.data.position.x, localCar.data.position.z);
                const trackCurve2D = selectedTrack.curve.points.map(p => new THREE.Vector2(p.x, p.z)); // Convert 3D points to 2D
                
                // Find closest point on curve (approximation)
                let closestPointOnCurve = new THREE.Vector2();
                let minDistanceSq = Infinity;
                
                for(let i = 0; i < trackCurve2D.length; i++) {
                    const p = trackCurve2D[i];
                    const distSq = carPos2D.distanceToSquared(p);
                    if (distSq < minDistanceSq) {
                        minDistanceSq = distSq;
                        closestPointOnCurve = p;
                    }
                }
                
                // If distance from closest point on curve is greater than half road width + tolerance
                if (Math.sqrt(minDistanceSq) > (zone.roadWidth / 2) + 2) { // +2 for tolerance
                    isInZone = true;
                }
            }
            
            if (isInZone) {
                frictionMultiplier = zone.frictionMultiplier;
                // Play skid sound if high speed and high friction (e.g., hitting grass)
                if (Math.abs(speedKmh) > 20 && frictionMultiplier < 1.0 && Math.random() < 0.1) {
                    soundManager.playSkid();
                }
            }
        });
    }


    // Calculate acceleration
    let accelerationForce = gameConfig.accelerationInput * torqueEfficiency * carStats.accelerationFactor;
    if (gameConfig.gear === 'N') {
        accelerationForce *= 0.1; // Very low force in neutral
    }

    // Apply drag
    const drag = 0.005 * speedKmh * Math.abs(speedKmh); // Quadratic drag
    accelerationForce -= Math.sign(speedKmh) * drag;

    // Update speed
    gameConfig.speed += accelerationForce * deltaTime * 60; // Multiply by 60 for km/h/s-like effect
    gameConfig.speed *= (1 - (0.01 * deltaTime * frictionMultiplier)); // Constant friction + zone friction

    // Limit speed based on gear and car's max speed
    if (gameConfig.accelerationInput > 0) { // Only apply max speed limit when accelerating forward
        if (gameConfig.gear === 'R') {
            gameConfig.speed = Math.max(-currentGearSetting.maxSpeed, gameConfig.speed);
        } else if (gameConfig.gear !== 'N') {
            gameConfig.speed = Math.min(currentGearSetting.maxSpeed * upgradeSpeedFactor, gameConfig.speed);
        }
    } else if (gameConfig.accelerationInput === 0) { // Coasting
        // Gradually reduce speed to 0 if no input
        gameConfig.speed *= 0.99; // Natural deceleration
        if (Math.abs(gameConfig.speed) < 0.1) gameConfig.speed = 0;
    }


    // Update steering
    const steeringFactor = carStats.handlingFactor * (1 + gameConfig.upgrades.gears * 0.1); // Gears upgrade can improve handling slightly
    let steerAmount = gameConfig.steeringInput * deltaTime * 1.5 * steeringFactor; // Base steering speed
    
    // Reduce steering at very low speeds or when stationary
    if (Math.abs(gameConfig.speed) < 5) {
        steerAmount *= (Math.abs(gameConfig.speed) / 5);
    }
    if (Math.abs(gameConfig.speed) > 10) { // Apply steering based on speed
        localCar.data.targetRotation -= steerAmount * Math.sign(gameConfig.speed); // Invert steering if reversing
    }

    // Smooth rotation (interpolate towards target)
    localCar.data.rotation += (localCar.data.targetRotation - localCar.data.rotation) * 0.1;

    // Move car
    const direction = new THREE.Vector3(
        Math.sin(localCar.data.rotation),
        0,
        Math.cos(localCar.data.rotation)
    );
    localCar.data.position.add(direction.multiplyScalar(gameConfig.speed * deltaTime));

    // Update Three.js model positions
    localCar.group.position.copy(localCar.data.position);
    localCar.group.rotation.y = localCar.data.rotation;

    // Rotate wheels visually
    const wheelRotationSpeed = gameConfig.speed * deltaTime * 0.1; // Adjust multiplier
    localCar.wheels.forEach(wheel => {
        wheel.rotation.x += wheelRotationSpeed;
    });

    // Update player data for synchronization
    players[gameConfig.playerId].x = localCar.data.position.x;
    players[gameConfig.playerId].z = localCar.data.position.z;
    players[gameConfig.playerId].rotation = localCar.data.rotation;
    players[gameConfig.playerId].speed = gameConfig.speed; // Send speed for remote wheel rotation

    checkLapCompletion();
    updateCamera();
    updateHUD(gameConfig.speed, gameConfig.gear, localCar.data.currentLap, 3, calculatePosition(), gameConfig.currentTorque);
    soundManager.updateEngineSound(gameConfig.speed, gameConfig.gear, carStats.maxSpeedBase, gameConfig.currentTorque); // Pass RPM as currentTorque

    // Send position updates via DataChannel (throttled)
    const now = Date.now();
    if (!gameConfig.isOffline && dataChannel && dataChannel.readyState === 'open' && now - lastMoveSentTime > 50) { // Send every 50ms
        dataChannel.send(JSON.stringify({ 
            type: 'move', 
            x: localCar.data.position.x,
            z: localCar.data.position.z,
            rotation: localCar.data.rotation,
            speed: gameConfig.speed,
            lastCheckpoint: localCar.data.lastCheckpoint // Send current checkpoint to opponent
        }));
        lastMoveSentTime = now;
    }
    // Update remote car from received data if offline (CPU player)
    if (gameConfig.isOffline && remoteCar) {
        updateCpuOpponent();
    }
}

function updateCpuOpponent() {
    // Simple AI for CPU opponent: follow a fixed path and progress laps
    const trackDef = getTrackById(gameConfig.selectedTrackId);
    if (!trackDef || !trackDef.checkpoints || trackDef.checkpoints.length === 0) return;

    const opponentId = gameConfig.playerId === 0 ? 1 : 0;
    const cpuPlayer = players[opponentId];
    if (!cpuPlayer) return;

    // Simulate movement
    const cpuSpeed = 50 + Math.random() * 20; // CPU speed
    const cpuSteering = Math.random() * 0.1 - 0.05; // Small random steering

    // Simple path following: head towards the next checkpoint
    const targetCheckpoint = trackDef.checkpoints[cpuPlayer.lastCheckpoint];
    if (targetCheckpoint) {
        const targetPos = targetCheckpoint.position;
        const currentPos = new THREE.Vector3(cpuPlayer.x, 0, cpuPlayer.z);
        const directionToTarget = new THREE.Vector3().subVectors(targetPos, currentPos).normalize();

        const currentDirection = new THREE.Vector3(Math.sin(cpuPlayer.rotation), 0, Math.cos(cpuPlayer.rotation));
        const angleDiff = Math.atan2(currentDirection.x * directionToTarget.z - currentDirection.z * directionToTarget.x, currentDirection.x * directionToTarget.x + currentDirection.z * directionToTarget.z);
        
        cpuPlayer.rotation += angleDiff * 0.05; // Steer towards target

        const moveDirection = new THREE.Vector3(
            Math.sin(cpuPlayer.rotation),
            0,
            Math.cos(cpuPlayer.rotation)
        );
        currentPos.add(moveDirection.multiplyScalar(cpuSpeed * deltaTime));
        
        cpuPlayer.x = currentPos.x;
        cpuPlayer.z = currentPos.z;

        remoteCar.group.position.set(cpuPlayer.x, remoteCar.data.position.y, cpuPlayer.z);
        remoteCar.group.rotation.y = cpuPlayer.rotation;

        // Simulate wheel rotation
        const wheelRotationSpeed = cpuSpeed * deltaTime * 0.1;
        remoteCar.wheels.forEach(wheel => {
            wheel.rotation.x += wheelRotationSpeed;
        });

        // Check if CPU passed checkpoint
        if (currentPos.distanceTo(targetPos) < targetCheckpoint.radius) {
            cpuPlayer.lastCheckpoint = (cpuPlayer.lastCheckpoint + 1) % trackDef.checkpoints.length;
            if (targetCheckpoint.isStartFinish && cpuPlayer.lastCheckpoint === 1) { // If Start/Finish line and it's the right checkpoint
                cpuPlayer.lap++;
                cpuPlayer.lap = Math.min(3, cpuPlayer.lap); // Cap at 3 laps for CPU
                if (cpuPlayer.lap >= 3 && !cpuPlayer.finishTime) {
                    cpuPlayer.finishTime = Date.now() - startTime + (Math.random() * 5000 - 2500); // Add some randomness
                    checkRaceCompletion();
                }
            }
        }
    }
}


function checkLapCompletion() {
    const trackDef = getTrackById(gameConfig.selectedTrackId);
    if (!trackDef || !trackDef.checkpoints || trackDef.checkpoints.length === 0) return;

    const currentCheckpointIndex = localCar.data.lastCheckpoint;
    const currentCheckpoint = trackDef.checkpoints[currentCheckpointIndex];
    const carPosition = localCar.data.position;

    // Check if car is close enough to the current target checkpoint
    if (carPosition.distanceTo(currentCheckpoint.position) < currentCheckpoint.radius) {
        // Only advance checkpoint if the next one is the logical successor
        const nextCheckpointIndex = currentCheckpoint.nextCheckpointIndex;
        // Make sure car isn't just driving backwards over checkpoints
        // For simple tracks like oval, this might be enough. For complex, need to check direction.
        
        // Advance local player's checkpoint
        localCar.data.lastCheckpoint = nextCheckpointIndex; 

        // If we crossed the start/finish line and we are at the beginning of the checkpoint cycle
        if (currentCheckpoint.isStartFinish && nextCheckpointIndex === trackDef.checkpoints[0].nextCheckpointIndex) { 
             localCar.data.currentLap++;
             players[gameConfig.playerId].lap = localCar.data.currentLap; // Update player's lap count

             if (!gameConfig.isOffline && dataChannel && dataChannel.readyState === 'open') {
                 dataChannel.send(JSON.stringify({ 
                     type: 'lap_update', 
                     lap: localCar.data.currentLap,
                     lastCheckpoint: localCar.data.lastCheckpoint
                 }));
             }
             
             if (localCar.data.currentLap >= 3 && !players[gameConfig.playerId].finishTime) {
                 players[gameConfig.playerId].finishTime = Date.now() - startTime;
                 checkRaceCompletion();
             }
         }
    }
}


function checkRaceCompletion() {
    const totalPlayers = gameConfig.isOffline ? 1 : 2; // For offline, only local player finishes
    let finishedPlayers = 0;
    Object.values(players).forEach(p => {
        if (p.finishTime !== null) {
            finishedPlayers++;
        }
    });

    if (finishedPlayers === totalPlayers) {
        gameConfig.status = 'finished';
        soundManager.stopEngineSound();

        // Sort players by finish time
        const sortedResults = Object.values(players).sort((a, b) => a.finishTime - b.finishTime);
        const localPlayerResult = sortedResults.find(p => p.id === gameConfig.playerId);

        let message = '';
        if (localPlayerResult.finishTime === sortedResults[0].finishTime) {
            message = 'VOCÊ VENCEU!';
            // Handle money for winning
            if (gameConfig.betAmount > 0) {
                gameConfig.money += gameConfig.betAmount; // Win the bet amount
                updateMoneyDisplay();
            }
        } else {
            message = 'VOCÊ PERDEU!';
            // Handle money for losing
            if (!gameConfig.isOffline && gameConfig.betAmount > 0) {
                gameConfig.money -= gameConfig.betAmount; // Lose the bet amount
                updateMoneyDisplay();
            }
        }
        showEndGameScreen(message, sortedResults);

        // Notify opponent that race is finished if online
        if (!gameConfig.isOffline && dataChannel && dataChannel.readyState === 'open') {
            dataChannel.send(JSON.stringify({ 
                type: 'race_finished', 
                playerId: gameConfig.playerId,
                finishTime: players[gameConfig.playerId].finishTime
            }));
        }
    }
}


function updateCamera() {
    if (!localCar) return;

    const carPosition = localCar.group.position.clone();
    const offsetDistance = 25; // Distance behind the car
    const cameraHeight = 15; // Height above the car

    // Calculate camera position behind and above the car, following its rotation
    const cameraOffset = new THREE.Vector3(
        Math.sin(localCar.data.rotation) * offsetDistance,
        cameraHeight,
        Math.cos(localCar.data.rotation) * offsetDistance
    );
    cameraOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI); // Rotate 180 degrees to be behind

    camera.position.copy(carPosition).add(cameraOffset);
    camera.lookAt(carPosition.x, carPosition.y + 2, carPosition.z); // Look at a point slightly above the car
}

function calculatePosition() {
    if (gameConfig.isOffline) return 1; // Always 1st in offline vs CPU until opponent logic for CPU is enhanced

    const localPlayer = players[gameConfig.playerId];
    const opponentPlayer = players[gameConfig.playerId === 0 ? 1 : 0];

    if (!localPlayer || !opponentPlayer) return 1; // Default until data is ready

    if (localPlayer.lap > opponentPlayer.lap) return 1;
    if (localPlayer.lap < opponentPlayer.lap) return 2;

    // If same lap, compare checkpoints (a simple distance check might be better for complex tracks)
    if (localPlayer.lastCheckpoint > opponentPlayer.lastCheckpoint) return 1;
    if (localPlayer.lastCheckpoint < opponentPlayer.lastCheckpoint) return 2;

    // If same checkpoint, compare distance to next checkpoint
    const trackDef = getTrackById(gameConfig.selectedTrackId);
    if (trackDef && trackDef.checkpoints && trackDef.checkpoints.length > 0) {
        const nextLocalCheckpoint = trackDef.checkpoints[localPlayer.lastCheckpoint];
        const nextOpponentCheckpoint = trackDef.checkpoints[opponentPlayer.lastCheckpoint];

        if (nextLocalCheckpoint && nextOpponentCheckpoint) {
            const distLocal = localCar.data.position.distanceTo(nextLocalCheckpoint.position);
            const distOpponent = remoteCar.data.position.distanceTo(nextOpponentCheckpoint.position);

            if (distLocal < distOpponent) return 1; // Closer to next checkpoint
            if (distLocal > distOpponent) return 2;
        }
    }

    return 1; // Tie
}

function shiftGearUp() {
    const gears = Object.keys(gearSettings);
    const currentIndex = gears.indexOf(gameConfig.gear);
    if (currentIndex < gears.length - 1) {
        gameConfig.gear = gears[currentIndex + 1];
        soundManager.playGearShift();
    }
}

function shiftGearDown() {
    const gears = Object.keys(gearSettings);
    const currentIndex = gears.indexOf(gameConfig.gear);
    // Allow shifting down to 'N' from 'R' if at 0 speed or very low speed
    // Or shift down from '1' to 'R' if speed is suitable.
    if (currentIndex > 0) {
        gameConfig.gear = gears[currentIndex - 1];
        soundManager.playGearShift();
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function showEndGameScreen(message, results) {
    // Prepare results to display
    const formattedResults = results.map(p => ({
        name: p.name,
        time: p.finishTime !== null ? p.finishTime : (Date.now() - startTime) // Use actual finish time or current time if not finished
    }));
    // Sort by time for display, fastest first
    formattedResults.sort((a, b) => a.time - b.time);

    uiElements.endGameMessage.textContent = message;
    let resultsHTML = '<h3>Resultados:</h3>';
    formattedResults.forEach((result, index) => {
        resultsHTML += `<p>${index + 1}º ${result.name}: ${(result.time / 1000).toFixed(2)}s</p>`;
    });
    uiElements.raceResults.innerHTML = resultsHTML;
    showScreen('endGameScreen');
}

function closeConnections() {
    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (ws) {
        ws.close();
        ws = null;
    }
    soundManager.stopEngineSound();
}

// --- Loop Principal do Jogo ---
function animate() {
    requestAnimationFrame(animate);
    deltaTime = clock.getDelta();

    // Always update control state, regardless of game status
    updateControlState();

    if (gameConfig.status === 'playing') {
        updatePhysics(); // Physics is now only updated here
    }

    renderer.render(scene, camera);
}

// --- Iniciar o Jogo ao Carregar a Página ---
window.addEventListener('load', initGame);