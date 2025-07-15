const SERVER_URL = 'wss://heroic-hope-production-bbdc.up.railway.app';
const cars = [
    {
        id: 'car1',
        name: 'Carro Esportivo',
        bodyColor: 0x3366ff,
        hoodColor: 0x2244cc,
        baseStats: { torque: 1.0, speed: 1.0, gears: 1.0 }
    },
    {
        id: 'car2',
        name: 'Carro de Corrida',
        bodyColor: 0xff3366,
        hoodColor: 0xcc2244,
        baseStats: { torque: 0.9, speed: 1.1, gears: 0.9 }
    }
];

const tracks = [
    {
        id: 'hockenheimring',
        name: 'Hockenheimring',
        music: 'hockenheimring_music.mp3',
        geometry: {
            type: 'complex',
            segments: [
                { type: 'straight', length: 100, width: 20 },
                { type: 'curve', radius: 50, angle: Math.PI / 2, width: 20 },
                { type: 'straight', length: 80, width: 20 },
                { type: 'curve', radius: 30, angle: Math.PI / 4, width: 20 },
                { type: 'straight', length: 120, width: 20 },
                { type: 'curve', radius: 40, angle: -Math.PI / 2, width: 20 },
                { type: 'straight', length: 60, width: 20 },
                { type: 'curve', radius: 60, angle: Math.PI, width: 20 }
            ]
        }
    },
    {
        id: 'nurburgring',
        name: 'Nürburgring',
        music: 'nurburgring_music.mp3',
        geometry: {
            type: 'complex',
            segments: [
                { type: 'straight', length: 80, width: 18 },
                { type: 'curve', radius: 40, angle: Math.PI / 3, width: 18 },
                { type: 'straight', length: 90, width: 18 },
                { type: 'curve', radius: 50, angle: -Math.PI / 2, width: 18 },
                { type: 'straight', length: 70, width: 18 },
                { type: 'curve', radius: 30, angle: Math.PI / 4, width: 18 },
                { type: 'straight', length: 100, width: 18 },
                { type: 'curve', radius: 60, angle: Math.PI, width: 18 }
            ]
        }
    }
];

// Variáveis globais
let scene, camera, renderer, localCar, remoteCar, track;
let smokeParticles = [];
let clock = new THREE.Clock();
let deltaTime = 0;
let players = {};
let ws = null;
let peerConnection = null;
let dataChannel = null;
let lastMoveSent = 0;
let startTime = null;
let finishTimes = {};
let audioContext, accelerationSound, gearShiftSound, driftSound, menuMusic, selectionMusic, raceMusic;

// Configurações do jogo
const gameConfig = {
    playerId: null,
    playerName: '',
    roomId: null,
    isOffline: false,
    status: 'waiting',
    gear: 'N',
    speed: 0,
    acceleration: 0,
    torque: 0,
    steering: 0,
    position: new THREE.Vector3(100, 0.5, 0),
    rotation: 0,
    lap: 0,
    lastCheckpoint: 0,
    upgrades: {
        torque: 0,
        speed: 0,
        gears: 0
    },
    money: 300,
    carId: 'car1',
    carColor: 0x3366ff,
    trackId: 'hockenheimring',
    trackVote: null
};

// Configurações de marchas
const gearSettings = {
    'R': { minSpeed: -20, maxSpeed: 0, optimalMin: -14, optimalMax: -7, torqueMultiplier: 0.7 },
    'N': { minSpeed: -10, maxSpeed: 10, optimalMin: 0, optimalMax: 0, torqueMultiplier: 0.1 },
    '1': { minSpeed: 0, maxSpeed: 120, optimalMin: 16, optimalMax: 20, torqueMultiplier: 1.0 },
    '2': { minSpeed: 0, maxSpeed: 120, optimalMin: 35, optimalMax: 46, torqueMultiplier: 0.9 },
    '3': { minSpeed: 0, maxSpeed: 120, optimalMin: 54, optimalMax: 58, torqueMultiplier: 0.8 },
    '4': { minSpeed: 0, maxSpeed: 120, optimalMin: 70, optimalMax: 78, torqueMultiplier: 0.7 },
    '5': { minSpeed: 0, maxSpeed: 120, optimalMin: 85, optimalMax: 110, torqueMultiplier: 0.6 }
};

// Configuração WebRTC
const rtcConfig = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        {
            urls: 'turn:turn.speed.cloudflare.com:50000',
            username: 'd1a7f09155fb30285724a3a056ca2edf17956674aff12909ff133dcec42994b2614cdd0a380a1b65124def1e3d0208543050d14b77d1a7533f9da35893ee2ed9',
            credential: 'aba9b169546eb6dcc7bfb1cdf34544cf95b5161d602e3b5fa7c8342b2e9802fb'
        },
        {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
        }
    ]
};

// Elementos da interface
const startScreen = document.getElementById('startScreen');
const selectionScreen = document.getElementById('selectionScreen');
const countdownScreen = document.getElementById('countdownScreen');
const gameScreen = document.getElementById('gameScreen');
const startButton = document.getElementById('startButton');
const offlineButton = document.getElementById('offlineButton');
const confirmSelectionButton = document.getElementById('confirmSelectionButton');
const generateIdButton = document.getElementById('generateIdButton');
const copyIdButton = document.getElementById('copyIdButton');
const roomInput = document.getElementById('roomInput');
const nameInput = document.getElementById('nameInput');
const statusDisplay = document.getElementById('status');
const speedDisplay = document.getElementById('speedDisplay');
const gearDisplay = document.getElementById('gearDisplay');
const mobileGearDisplay = document.getElementById('mobileGearDisplay');
const torqueFill = document.querySelector('.torque-fill');
const lapCounter = document.getElementById('lapCounter');
const positionDisplay = document.getElementById('positionDisplay');
const moneyDisplay = document.getElementById('moneyDisplay');
const carSelect = document.getElementById('carSelect');
const colorSelect = document.getElementById('colorSelect');
const trackSelect = document.getElementById('trackSelect');
const timeDisplay = document.getElementById('timeDisplay');
const loadingOverlay = document.getElementById('loadingOverlay');
const endGameScreen = document.getElementById('endGameScreen');
const endGameMessage = document.getElementById('endGameMessage');
const raceResults = document.getElementById('raceResults');
const countdownDisplay = document.getElementById('countdownDisplay');
const rematchBtn = document.getElementById('rematchBtn');
const exitBtn = document.getElementById('exitBtn');

const accelerateBtn = document.getElementById('accelerateBtn');
const brakeBtn = document.getElementById('brakeBtn');
const gearUpBtn = document.getElementById('gearUpBtn');
const gearDownBtn = document.getElementById('gearDownBtn');

// Inicializar áudio
function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    function loadSound(url, callback) {
        fetch(url)
            .then(response => response.arrayBuffer())
            .then(data => audioContext.decodeAudioData(data, callback))
            .catch(error => console.error('Erro ao carregar som:', error));
    }

    loadSound('acceleration.mp3', buffer => {
        accelerationSound = buffer;
    });

    loadSound('gear_shift.mp3', buffer => {
        gearShiftSound = buffer;
    });

    loadSound('drift.mp3', buffer => {
        driftSound = buffer;
    });

    function loadMusic(url, loop = true) {
        const audio = new Audio(url);
        audio.loop = loop;
        audio.volume = 0.5;
        return audio;
    }

    menuMusic = loadMusic('menu_music.mp3');
    selectionMusic = loadMusic('selection_music.mp3');
    raceMusic = loadMusic(tracks[0].music);
}

function playSound(buffer, loop = false) {
    if (!audioContext) return;
    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.loop = loop;
    source.start(0);
    return source;
}

function playMusic(music) {
    stopMusic();
    music.play().catch(error => console.error('Erro ao tocar música:', error));
}

function stopMusic() {
    menuMusic.pause();
    menuMusic.currentTime = 0;
    selectionMusic.pause();
    selectionMusic.currentTime = 0;
    raceMusic.pause();
    raceMusic.currentTime = 0;
}

// Inicialização do jogo
function initGame() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 100, 500);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 15, -20);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    initAudio();
    playMusic(menuMusic);
    createTrack(gameConfig.trackId);
    createLocalCar();
    if (!gameConfig.isOffline) {
        createRemoteCar();
    }

    setupControls();
    animate();
    window.addEventListener('resize', onWindowResize);
}

// Criar pista de corrida
function createTrack(trackId) {
    const trackData = tracks.find(t => t.id === trackId);
    const trackGroup = new THREE.Group();

    const trackMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.9,
        metalness: 0.1
    });

    let currentPosition = new THREE.Vector3(0, 0, 0);
    let currentAngle = 0;

    trackData.geometry.segments.forEach(segment => {
        if (segment.type === 'straight') {
            const geometry = new THREE.PlaneGeometry(segment.width, segment.length);
            const mesh = new THREE.Mesh(geometry, trackMaterial);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.set(
                currentPosition.x + Math.sin(currentAngle) * segment.length / 2,
                0,
                currentPosition.z + Math.cos(currentAngle) * segment.length / 2
            );
            mesh.rotation.y = currentAngle;
            mesh.receiveShadow = true;
            trackGroup.add(mesh);
            currentPosition.add(new THREE.Vector3(
                Math.sin(currentAngle) * segment.length,
                0,
                Math.cos(currentAngle) * segment.length
            ));
        } else if (segment.type === 'curve') {
            const geometry = new THREE.RingGeometry(
                segment.radius - segment.width / 2,
                segment.radius + segment.width / 2,
                32,
                1,
                0,
                segment.angle
            );
            const mesh = new THREE.Mesh(geometry, trackMaterial);
            mesh.rotation.x = -Math.PI / 2;
            mesh.position.copy(currentPosition);
            mesh.rotation.y = currentAngle;
            mesh.receiveShadow = true;
            trackGroup.add(mesh);
            currentAngle += segment.angle;
            currentPosition.add(new THREE.Vector3(
                Math.sin(currentAngle) * segment.radius * (1 - Math.cos(segment.angle)),
                0,
                Math.cos(currentAngle) * segment.radius * (1 - Math.cos(segment.angle))
            ));
        }
    });

    const grassGeometry = new THREE.PlaneGeometry(1000, 1000, 10, 10);
    const grassMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x228822,
        roughness: 1,
        metalness: 0
    });
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    grass.rotation.x = -Math.PI / 2;
    grass.position.y = -0.1;
    grass.receiveShadow = true;
    trackGroup.add(grass);

    scene.add(trackGroup);
    track = trackGroup;
}

// Criar carro local
function createLocalCar() {
    const carData = cars.find(c => c.id === gameConfig.carId);
    const carGroup = new THREE.Group();

    const bodyGeometry = new THREE.BoxGeometry(3, 1, 5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: gameConfig.carColor });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    carGroup.add(body);

    const hoodGeometry = new THREE.BoxGeometry(2.8, 0.5, 2);
    const hoodMaterial = new THREE.MeshStandardMaterial({ color: carData.hoodColor });
    const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
    hood.position.set(0, 0.75, 1);
    hood.castShadow = true;
    carGroup.add(hood);

    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.8, 16);
    wheelGeometry.rotateZ(Math.PI / 2);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });

    const wheelPositions = [
        { x: -1.5, y: 0.5, z: 2 },
        { x: 1.5, y: 0.5, z: 2 },
        { x: -1.5, y: 0.5, z: -2 },
        { x: 1.5, y: 0.5, z: -2 }
    ];

    const wheels = [];
    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(pos.x, pos.y, pos.z);
        wheel.castShadow = true;
        carGroup.add(wheel);
        wheels.push(wheel);
    });

    const lightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const lightMaterial = new THREE.MeshStandardMaterial({ color: 0xffff00, emissive: 0xffff00 });

    const frontLight1 = new THREE.Mesh(lightGeometry, lightMaterial);
    frontLight1.position.set(-0.8, 0.7, 2.5);
    carGroup.add(frontLight1);

    const frontLight2 = new THREE.Mesh(lightGeometry, lightMaterial);
    frontLight2.position.set(0.8, 0.7, 2.5);
    carGroup.add(frontLight2);

    scene.add(carGroup);
    localCar = {
        group: carGroup,
        wheels: wheels,
        position: new THREE.Vector3(100, 0.5, 0),
        rotation: 0,
        targetRotation: 0
    };

    localCar.group.position.copy(localCar.position);
    players[gameConfig.playerId] = {
        x: localCar.position.x,
        z: localCar.position.z,
        rotation: localCar.rotation,
        name: gameConfig.playerName
    };
}

// Criar carro remoto
function createRemoteCar() {
    const carGroup = new THREE.Group();

    const bodyGeometry = new THREE.BoxGeometry(3, 1, 5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0xff3366 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    carGroup.add(body);

    const hoodGeometry = new THREE.BoxGeometry(2.8, 0.5, 2);
    const hoodMaterial = new THREE.MeshStandardMaterial({ color: 0xcc2244 });
    const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
    hood.position.set(0, 0.75, 1);
    hood.castShadow = true;
    carGroup.add(hood);

    const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.8, 16);
    wheelGeometry.rotateZ(Math.PI / 2);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });

    const wheelPositions = [
        { x: -1.5, y: 0.5, z: 2 },
        { x: 1.5, y: 0.5, z: 2 },
        { x: -1.5, y: 0.5, z: -2 },
        { x: 1.5, y: 0.5, z: -2 }
    ];

    const wheels = [];
    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.position.set(pos.x, pos.y, pos.z);
        wheel.castShadow = true;
        carGroup.add(wheel);
        wheels.push(wheel);
    });

    scene.add(carGroup);
    remoteCar = {
        group: carGroup,
        wheels: wheels,
        position: new THREE.Vector3(90, 0.5, 0),
        rotation: 0
    };

    remoteCar.group.position.copy(remoteCar.position);
    const opponentId = gameConfig.playerId === 0 ? 1 : 0;
    players[opponentId] = {
        x: remoteCar.position.x,
        z: remoteCar.position.z,
        rotation: remoteCar.rotation,
        name: 'Oponente'
    };
}

// Configurar controles
function setupControls() {
    const keys = {};

    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'KeyW' || e.code === 'ArrowUp') {
            shiftGearUp();
            playSound(gearShiftSound);
        }
        if (e.code === 'KeyS' || e.code === 'ArrowDown') {
            shiftGearDown();
            playSound(gearShiftSound);
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    accelerateBtn.addEventListener('touchstart', () => {
        keys['Space'] = true;
        accelerateBtn.style.background = 'rgba(0, 255, 234, 0.5)';
        playSound(accelerationSound, true);
    });

    accelerateBtn.addEventListener('touchend', () => {
        keys['Space'] = false;
        accelerateBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });

    brakeBtn.addEventListener('touchstart', () => {
        keys['KeyS'] = keys['ArrowDown'] = true;
        brakeBtn.style.background = 'rgba(0, 255, 234, 0.5)';
    });

    brakeBtn.addEventListener('touchend', () => {
        keys['KeyS'] = keys['ArrowDown'] = false;
        brakeBtn.style.background = 'rgba(255, 255, 255, 0.2)';
    });

    gearUpBtn.addEventListener('click', () => {
        shiftGearUp();
        playSound(gearShiftSound);
    });

    gearDownBtn.addEventListener('click', () => {
        shiftGearDown();
        playSound(gearShiftSound);
    });

    const dpadButtons = document.querySelectorAll('.dpad-btn');
    dpadButtons.forEach(btn => {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const direction = btn.textContent;
            if (direction === '↑') keys['KeyW'] = keys['ArrowUp'] = true;
            if (direction === '↓') keys['KeyS'] = keys['ArrowDown'] = true;
            if (direction === '←') {
                keys['KeyA'] = keys['ArrowLeft'] = true;
                if (Math.abs(gameConfig.speed) > 30) playSound(driftSound);
            }
            if (direction === '→') {
                keys['KeyD'] = keys['ArrowRight'] = true;
                if (Math.abs(gameConfig.speed) > 30) playSound(driftSound);
            }
            btn.style.background = 'rgba(0, 255, 234, 0.5)';
        });

        btn.addEventListener('touchend', (e) => {
            e.preventDefault();
            const direction = btn.textContent;
            if (direction === '↑') keys['KeyW'] = keys['ArrowUp'] = false;
            if (direction === '↓') keys['KeyS'] = keys['ArrowDown'] = false;
            if (direction === '←') keys['KeyA'] = keys['ArrowLeft'] = false;
            if (direction === '→') keys['KeyD'] = keys['ArrowRight'] = false;
            btn.style.background = 'rgba(255, 255, 255, 0.2)';
        });
    });

    function updateControls() {
        gameConfig.acceleration = keys['Space'] ? 1 : 0;
        if (keys['KeyS'] || keys['ArrowDown']) gameConfig.acceleration = -0.5;
        gameConfig.steering = 0;
        if (keys['KeyA'] || keys['ArrowLeft']) gameConfig.steering = 1;
        if (keys['KeyD'] || keys['ArrowRight']) gameConfig.steering = -1;
        updatePhysics();
    }

    setInterval(updateControls, 16);
}

// Gerar ID de sala
function generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let id = '';
    for (let i = 0; i < 5; i++) {
        id += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return id;
}

// Conectar ao servidor WebSocket
function connectToServer() {
    if (!gameConfig.roomId) {
        statusDisplay.textContent = 'Por favor, insira um ID de sala';
        return;
    }
    if (!gameConfig.playerName) {
        statusDisplay.textContent = 'Por favor, insira seu nome';
        return;
    }

    statusDisplay.textContent = 'Conectando ao servidor...';
    loadingOverlay.style.display = 'flex';

    ws = new WebSocket(SERVER_URL);

    ws.onopen = () => {
        statusDisplay.textContent = 'Aguardando oponente...';
        ws.send(JSON.stringify({ 
            type: 'join', 
            roomId: gameConfig.roomId,
            playerName: gameConfig.playerName
        }));
    };

    ws.onerror = (error) => {
        statusDisplay.textContent = 'Erro na conexão. Tente novamente.';
        loadingOverlay.style.display = 'none';
        console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
        statusDisplay.textContent = 'Conexão fechada.';
        loadingOverlay.style.display = 'none';
        gameConfig.status = 'waiting';
    };

    ws.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'start') {
                gameConfig.playerId = data.playerId;
                statusDisplay.textContent = `Você é ${gameConfig.playerName} (Jogador ${gameConfig.playerId + 1})`;
                initPeerConnection();
                if (gameConfig.playerId === 0) {
                    dataChannel = peerConnection.createDataChannel('gameData');
                    setupDataChannel();
                    const offer = await peerConnection.createOffer();
                    await peerConnection.setLocalDescription(offer);
                    ws.send(JSON.stringify({ type: 'offer', sdp: offer }));
                }
            } else if (data.type === 'offer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                const answer = await peerConnection.createAnswer();
                await peerConnection.setLocalDescription(answer);
                ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
            } else if (data.type === 'answer') {
                await peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            } else if (data.type === 'ice') {
                await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else if (data.type === 'trackVote') {
                const opponentId = gameConfig.playerId === 0 ? 1 : 0;
                players[opponentId].trackVote = data.trackId;
                selectTrack();
            } else if (data.type === 'error') {
                statusDisplay.textContent = `Erro: ${data.message}`;
                loadingOverlay.style.display = 'none';
            }
        } catch (error) {
            console.error('Error processing message:', error);
            statusDisplay.textContent = 'Erro no processamento';
            loadingOverlay.style.display = 'none';
        }
    };
}

// Configurar WebRTC
function initPeerConnection() {
    peerConnection = new RTCPeerConnection(rtcConfig);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            ws.send(JSON.stringify({ type: 'ice', candidate: event.candidate }));
        }
    };

    peerConnection.oniceconnectionstatechange = () => {
        const state = peerConnection.iceConnectionState;
        statusDisplay.textContent = `Estado: ${state}`;
        if (state === 'failed') {
            statusDisplay.textContent = 'Conexão falhou. Tente novamente.';
            loadingOverlay.style.display = 'none';
        }
    };

    peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        setupDataChannel();
    };
}

// Configurar canal de dados
function setupDataChannel() {
    dataChannel.onopen = () => {
        statusDisplay.textContent = 'Conexão P2P estabelecida!';
        startSelectionPhase();
    };

    dataChannel.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'move') {
                const opponentId = gameConfig.playerId === 0 ? 1 : 0;
                if (players[opponentId] && remoteCar) {
                    players[opponentId].x = data.position.x;
                    players[opponentId].z = data.position.z;
                    players[opponentId].rotation = data.position.rotation;
                    players[opponentId].name = data.playerName;
                    remoteCar.position.set(data.position.x, 0.5, data.position.z);
                    remoteCar.group.position.copy(remoteCar.position);
                    remoteCar.rotation = data.position.rotation;
                    remoteCar.group.rotation.y = data.position.rotation;
                    const wheelRotation = data.speed * deltaTime * 2;
                    remoteCar.wheels.forEach(wheel => {
                        wheel.rotation.x += wheelRotation;
                    });
                    if (data.speed > 30 && Math.random() < 0.3) {
                        createSmoke(data.position.x, data.position.z, data.position.rotation, 0xff3366);
                    }
                }
            } else if (data.type === 'lap') {
                const opponentId = gameConfig.playerId === 0 ? 1 : 0;
                players[opponentId].lap = data.lapCount;
                if (data.lapCount >= 3 && !gameConfig.status.includes('finished')) {
                    finishTimes[opponentId] = Date.now() - startTime;
                    gameConfig.status = 'opponent_finished';
                    showEndGameScreen(`${players[opponentId].name} venceu!`);
                }
            } else if (data.type === 'restart') {
                restartGame();
            } else if (data.type === 'selection') {
                const opponentId = gameConfig.playerId === 0 ? 1 : 0;
                players[opponentId].carId = data.carId;
                players[opponentId].carColor = data.carColor;
                players[opponentId].trackVote = data.trackId;
                if (data.ready) {
                    players[opponentId].ready = true;
                    checkSelections();
                }
            }
        } catch (error) {
            console.error('DataChannel error:', error);
        }
    };
}

// Fase de seleção
function startSelectionPhase() {
    stopMusic();
    playMusic(selectionMusic);
    loadingOverlay.style.display = 'none';
    startScreen.classList.add('hidden');
    selectionScreen.classList.remove('hidden');
    moneyDisplay.textContent = `Dinheiro: $${gameConfig.money}`;

    let timeLeft = 30;
    timeDisplay.textContent = `Tempo restante: ${timeLeft}s`;
    confirmSelectionButton.disabled = true;

    const timer = setInterval(() => {
        timeLeft--;
        timeDisplay.textContent = `Tempo restante: ${timeLeft}s`;
        if (timeLeft <= 0) {
            clearInterval(timer);
            confirmSelections();
        }
    }, 1000);

    carSelect.addEventListener('change', () => {
        gameConfig.carId = carSelect.value;
        confirmSelectionButton.disabled = false;
    });

    colorSelect.addEventListener('change', () => {
        gameConfig.carColor = parseInt(colorSelect.value);
    });

    trackSelect.addEventListener('change', () => {
        gameConfig.trackVote = trackSelect.value;
    });

    document.querySelectorAll('.buy-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const upgradeType = e.target.dataset.upgrade;
            const cost = upgradeType === 'torque' ? 100 : upgradeType === 'speed' ? 150 : 200;
            if (gameConfig.money >= cost) {
                gameConfig.money -= cost;
                gameConfig.upgrades[upgradeType]++;
                moneyDisplay.textContent = `Dinheiro: $${gameConfig.money}`;
                e.target.textContent = 'COMPRADO!';
                e.target.disabled = true;
                document.querySelectorAll('.buy-button').forEach(btn => {
                    const btnCost = btn.dataset.upgrade === 'torque' ? 100 : btn.dataset.upgrade === 'speed' ? 150 : 200;
                    btn.disabled = gameConfig.money < btnCost;
                });
                confirmSelectionButton.disabled = false;
            }
        });
    });
}

// Confirmar seleções
function confirmSelections() {
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({
            type: 'selection',
            playerId: gameConfig.playerId,
            carId: gameConfig.carId,
            carColor: gameConfig.carColor,
            trackId: gameConfig.trackVote,
            ready: true
        }));
    }
    players[gameConfig.playerId].ready = true;
    checkSelections();
}

// Verificar seleções
function checkSelections() {
    const opponentId = gameConfig.playerId === 0 ? 1 : 0;
    if (players[opponentId]?.ready || gameConfig.isOffline) {
        selectTrack();
        startCountdown();
    }
}

// Selecionar pista
function selectTrack() {
    const opponentId = gameConfig.playerId === 0 ? 1 : 0;
    const opponentTrack = players[opponentId]?.trackVote;
    if (opponentTrack && opponentTrack === gameConfig.trackVote) {
        gameConfig.trackId = gameConfig.trackVote;
    } else if (opponentTrack) {
        gameConfig.trackId = Math.random() < 0.5 ? gameConfig.trackVote : opponentTrack;
    } else {
        gameConfig.trackId = gameConfig.trackVote;
    }
    raceMusic = new Audio(tracks.find(t => t.id === gameConfig.trackId).music);
    raceMusic.loop = true;
    raceMusic.volume = 0.5;
}

// Iniciar contagem regressiva
function startCountdown() {
    stopMusic();
    selectionScreen.classList.add('hidden');
    countdownScreen.classList.remove('hidden');
    let countdown = 3;
    countdownDisplay.textContent = countdown;
    const countdownTimer = setInterval(() => {
        countdown--;
        if (countdown > 0) {
            countdownDisplay.textContent = countdown;
        } else if (countdown === 0) {
            countdownDisplay.textContent = 'GO!';
        } else {
            clearInterval(countdownTimer);
            countdownScreen.classList.add('hidden');
            startGame();
        }
    }, 1000);
}

// Iniciar jogo
function startGame() {
    scene.clear();
    initGame();
    stopMusic();
    playMusic(raceMusic);
    gameScreen.classList.remove('hidden');
    gameConfig.lap = 0;
    gameConfig.status = 'playing';
    startTime = Date.now();
    finishTimes = {};

    players[gameConfig.playerId] = {
        x: 100,
        z: 0,
        rotation: 0,
        lap: 0,
        lastCheckpoint: 0,
        name: gameConfig.playerName
    };

    localCar.position.set(100, 0.5, 0);
    localCar.rotation = 0;
    localCar.targetRotation = 0;
    localCar.group.position.copy(localCar.position);
    localCar.group.rotation.y = localCar.rotation;

    if (!gameConfig.isOffline) {
        const opponentId = gameConfig.playerId === 0 ? 1 : 0;
        players[opponentId] = {
            x: 90,
            z: 0,
            rotation: 0,
            lap: 0,
            name: players[opponentId]?.name || 'Oponente'
        };
        remoteCar.position.set(90, 0.5, 0);
        remoteCar.rotation = 0;
        remoteCar.group.position.copy(remoteCar.position);
        remoteCar.group.rotation.y = remoteCar.rotation;
    }

    lapCounter.textContent = 'VOLTA: 0/3';
    positionDisplay.textContent = 'POSIÇÃO: 1°';
    speedDisplay.textContent = '0 km/h';
    gearDisplay.textContent = 'N';
    mobileGearDisplay.textContent = 'N';
    torqueFill.style.width = '0%';
}

// Reiniciar jogo
function restartGame() {
    stopMusic();
    playMusic(selectionMusic);
    gameConfig.lap = 0;
    gameConfig.status = 'waiting';
    gameConfig.money = 300;
    gameConfig.upgrades = { torque: 0, speed: 0, gears: 0 };
    gameConfig.carId = 'car1';
    gameConfig.carColor = 0x3366ff;
    gameConfig.trackVote = 'hockenheimring';
    players = {};
    finishTimes = {};
    scene.clear();
    initGame();
    selectionScreen.classList.remove('hidden');
    gameScreen.classList.add('hidden');
    endGameScreen.style.display = 'none';
    startSelectionPhase();
}

// Atualizar física do carro
function updatePhysics() {
    const gear = gearSettings[gameConfig.gear];
    const speed = Math.abs(gameConfig.speed);
    const carData = cars.find(c => c.id === gameConfig.carId);

    let torqueEfficiency = 0.1;
    if (gameConfig.gear === 'N') {
        torqueEfficiency = gear.torqueMultiplier;
    } else if (gameConfig.gear === 'R') {
        if (gameConfig.speed >= gear.optimalMin && gameConfig.speed <= gear.optimalMax) {
            torqueEfficiency = gear.torqueMultiplier;
        } else {
            const distance = Math.min(
                Math.abs(gameConfig.speed - gear.optimalMin),
                Math.abs(gameConfig.speed - gear.optimalMax)
            );
            torqueEfficiency = gear.torqueMultiplier * Math.max(0.1, 1 - (distance / 10));
        }
    } else {
        if (speed >= gear.optimalMin && speed <= gear.optimalMax) {
            torqueEfficiency = gear.torqueMultiplier;
        } else {
            const distance = Math.min(
                Math.abs(speed - gear.optimalMin),
                Math.abs(speed - gear.optimalMax)
            );
            torqueEfficiency = gear.torqueMultiplier * Math.max(0.1, 1 - (distance / 10));
        }
    }

    const torqueMultiplier = carData.baseStats.torque + (gameConfig.upgrades.torque * 0.2);
    const speedMultiplier = carData.baseStats.speed + (gameConfig.upgrades.speed * 0.15);
    const gearMultiplier = carData.baseStats.gears + (gameConfig.upgrades.gears * 0.25);

    let acceleration = gameConfig.acceleration * torqueEfficiency * torqueMultiplier;
    if (gameConfig.gear === 'N') {
        acceleration *= 0.1;
    }

    gameConfig.speed += acceleration * deltaTime * 20;
    if (gameConfig.gear === 'R') {
        gameConfig.speed = Math.max(-gear.maxSpeed * speedMultiplier, Math.min(0, gameConfig.speed));
    } else if (gameConfig.gear === 'N') {
        gameConfig.speed *= 0.95;
    } else {
        gameConfig.speed = Math.max(0, Math.min(gear.maxSpeed * speedMultiplier, gameConfig.speed));
    }

    gameConfig.speed *= 0.999;
    gameConfig.torque = Math.round(torqueEfficiency * 100);

    const steeringAmount = gameConfig.steering * deltaTime * 1.5;
    if (Math.abs(gameConfig.speed) > 5) {
        localCar.targetRotation += steeringAmount * Math.sign(gameConfig.speed);
    }

    localCar.rotation += (localCar.targetRotation - localCar.rotation) * 0.1;

    const direction = new THREE.Vector3(
        Math.sin(localCar.rotation),
        0,
        Math.cos(localCar.rotation)
    );

    localCar.position.add(direction.multiplyScalar(gameConfig.speed * deltaTime));
    players[gameConfig.playerId].x = localCar.position.x;
    players[gameConfig.playerId].z = localCar.position.z;
    players[gameConfig.playerId].rotation = localCar.rotation;

    checkLapCompletion();

    localCar.group.position.copy(localCar.position);
    localCar.group.rotation.y = localCar.rotation;

    const wheelRotation = gameConfig.speed * deltaTime * 2;
    localCar.wheels.forEach(wheel => {
        wheel.rotation.x += wheelRotation;
    });

    if (gameConfig.acceleration > 0 && gameConfig.speed > 30 && Math.random() < 0.3) {
        createSmoke(localCar.position.x, localCar.position.z, localCar.rotation, gameConfig.carColor);
    }

    updateCamera();
    updateUI();

    const now = Date.now();
    if (now - lastMoveSent > 50 && dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({ 
            type: 'move', 
            playerId: gameConfig.playerId, 
            position: {
                x: localCar.position.x,
                z: localCar.position.z,
                rotation: localCar.rotation
            },
            speed: gameConfig.speed,
            lapCount: gameConfig.lap,
            playerName: gameConfig.playerName
        }));
        lastMoveSent = now;
    }
}

// Verificar se completou uma volta
function checkLapCompletion() {
    if (localCar.position.z > -1 && localCar.position.z < 1 && localCar.position.x > 80 && localCar.position.x < 120) {
        if (gameConfig.lastCheckpoint === 1) {
            gameConfig.lap++;
            gameConfig.lastCheckpoint = 0;
            lapCounter.textContent = `VOLTA: ${gameConfig.lap}/3`;
            players[gameConfig.playerId].lap = gameConfig.lap;

            if (dataChannel && dataChannel.readyState === 'open') {
                dataChannel.send(JSON.stringify({ 
                    type: 'lap', 
                    playerId: gameConfig.playerId,
                    lapCount: gameConfig.lap
                }));
            }

            if (gameConfig.lap >= 3 && !gameConfig.status.includes('finished')) {
                finishTimes[gameConfig.playerId] = Date.now() - startTime;
                gameConfig.status = 'finished';
                showEndGameScreen(`${gameConfig.playerName} venceu!`);
                if (dataChannel && dataChannel.readyState === 'open') {
                    dataChannel.send(JSON.stringify({ 
                        type: 'raceOver', 
                        winnerId: gameConfig.playerId
                    }));
                }
            }
        }
    } else if (localCar.position.z > 45 || localCar.position.z < -45) {
        gameConfig.lastCheckpoint = 1;
    }
}

// Atualizar posição da câmera
function updateCamera() {
    const carPosition = localCar.position.clone();
    const offset = new THREE.Vector3(
        Math.sin(localCar.rotation) * 15,
        -15,
        Math.cos(localCar.rotation) * 15
    );

    camera.position.copy(carPosition.sub(offset));
    camera.lookAt(localCar.position.x, localCar.position.y + 2, localCar.position.z);
}

// Atualizar interface do usuário
function updateUI() {
    speedDisplay.textContent = Math.abs(Math.round(gameConfig.speed));
    gearDisplay.textContent = gameConfig.gear;
    mobileGearDisplay.textContent = gameConfig.gear;
    torqueFill.style.width = `${gameConfig.torque}%`;
    positionDisplay.textContent = `POSIÇÃO: ${calculatePosition()}°`;
}

// Calcular posição na corrida
function calculatePosition() {
    const opponentId = gameConfig.playerId === 0 ? 1 : 0;
    const playerLaps = gameConfig.lap;
    const opponentLaps = players[opponentId]?.lap || 0;
    if (playerLaps > opponentLaps) return 1;
    if (playerLaps < opponentLaps) return 2;
    return 1;
}

// Criar efeito de fumaça
function createSmoke(x, z, rotation, color) {
    const smoke = document.createElement('div');
    smoke.className = 'smoke-particle';
    smoke.style.left = `${50 + (x / 4)}%`;
    smoke.style.top = `${50 - (z / 4)}%`;
    smoke.style.backgroundColor = `rgba(${(color >> 16) & 0xff}, ${(color >> 8) & 0xff}, ${color & 0xff}, 0.7)`;
    document.getElementById('gameContainer').appendChild(smoke);

    let size = 10;
    let opacity = 0.7;
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 2;

    const animateSmoke = () => {
        size += 0.5;
        opacity -= 0.01;

        if (opacity <= 0) {
            smoke.remove();
            return;
        }

        smoke.style.width = `${size}px`;
        smoke.style.height = `${size}px`;
        smoke.style.opacity = opacity;
        smoke.style.transform = `translate(${Math.cos(angle) * speed}px, ${Math.sin(angle) * speed}px)`;

        requestAnimationFrame(animateSmoke);
    };

    animateSmoke();
}

// Trocar marcha para cima
function shiftGearUp() {
    const gears = ['R', 'N', '1', '2', '3', '4', '5'];
    const currentIndex = gears.indexOf(gameConfig.gear);
    if (currentIndex < gears.length - 1) {
        gameConfig.gear = gears[currentIndex + 1];
    }
}

// Trocar marcha para baixo
function shiftGearDown() {
    const gears = ['R', 'N', '1', '2', '3', '4', '5'];
    const currentIndex = gears.indexOf(gameConfig.gear);
    if (currentIndex > 0) {
        gameConfig.gear = gears[currentIndex - 1];
    }
}

// Redimensionar a cena
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Exibir tela de fim de jogo
function showEndGameScreen(message) {
    stopMusic();
    endGameScreen.style.display = 'block';
    endGameMessage.textContent = message;

    let resultsHTML = '<h3>Resultados:</h3>';
    Object.keys(finishTimes).sort((a, b) => finishTimes[a] - finishTimes[b]).forEach(id => {
        const time = (finishTimes[id] / 1000).toFixed(2);
        resultsHTML += `<p>${players[id].name}: ${time}s</p>`;
    });

    raceResults.innerHTML = resultsHTML;
    gameConfig.status = 'finished';
}

// Fechar conexões
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
}

// Loop de animação
function animate() {
    requestAnimationFrame(animate);
    deltaTime = clock.getDelta();

    if (gameConfig.status === 'playing') {
        updatePhysics();
    }

    renderer.render(scene, camera);
}

// Eventos de interface
generateIdButton.addEventListener('click', () => {
    gameConfig.roomId = generateRoomId();
    roomInput.value = gameConfig.roomId;
    statusDisplay.textContent = 'ID gerado!';
});

copyIdButton.addEventListener('click', () => {
    roomInput.select();
    document.execCommand('copy');
    statusDisplay.textContent = 'ID copiado!';
});

startButton.addEventListener('click', () => {
    gameConfig.playerName = nameInput.value.trim();
    gameConfig.isOffline = false;
    gameConfig.roomId = roomInput.value.trim();
    if (!gameConfig.roomId || !gameConfig.playerName) {
        statusDisplay.textContent = 'Por favor, insira o ID da sala e seu nome';
        return;
    }
    connectToServer();
});

offlineButton.addEventListener('click', () => {
    gameConfig.playerName = nameInput.value.trim() || 'Jogador';
    gameConfig.isOffline = true;
    startSelectionPhase();
});

confirmSelectionButton.addEventListener('click', confirmSelections);

rematchBtn.addEventListener('click', () => {
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(JSON.stringify({ type: 'restart' }));
        restartGame();
    } else {
        statusDisplay.textContent = 'Reconectando...';
        gameConfig.roomId = roomInput.value.trim();
        if (gameConfig.roomId && gameConfig.playerName) {
            connectToServer();
            restartGame();
        }
    }
});

exitBtn.addEventListener('click', () => {
    closeConnections();
    gameConfig.status = 'waiting';
    endGameScreen.style.display = 'none';
    startScreen.classList.remove('hidden');
    playMusic(menuMusic);
    statusDisplay.textContent = 'Pronto para jogar novamente';
});

window.addEventListener('load', initGame);