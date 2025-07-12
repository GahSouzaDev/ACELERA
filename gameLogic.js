// Guarda os jogadores do jogo, tipo um dicionário com as infos de cada um
    window.players = {};

    // Guarda os modelos dos carros, tipo qual carro é de quem
    window.carModels = {};

    // O carro do jogador atual, começa como nulo
    window.playerCar = null;

    // Diz se o jogo tá rolando ou não
    window.gameActive = false;

    // Conta as voltas dos jogadores (jogador 0 e 1, começa com 0 voltas)
    window.laps = { 0: 0, 1: 0 };

    // Posição dos jogadores na corrida (começa com ambos em 1º)
    window.positions = { 0: 1, 1: 1 };

    // Diz se a corrida terminou
    window.raceFinished = false;

    // Guarda quando a corrida começou
    window.startTime = null;

    // Guarda o tempo que cada jogador terminou a corrida
    window.finishTimes = {};

    // Posição que o carro do adversário tá tentando chegar
    window.opponentTargetPosition = {};

    // Rotação que o carro do adversário tá tentando alcançar
    window.opponentTargetRotation = {};

    // Controla a suavidade dos movimentos do adversário (0.2 é tipo um ajuste fino)
    window.interpolationFactor = 0.2;

    // Guarda a última vez que o jogador mandou um movimento pro servidor
    window.lastMoveSent = 0;

    // Guarda quais teclas o jogador tá apertando
    window.keys = {};

    // Função que começa o jogo do zero
    function startGame() {
        // Zera a lista de jogadores
        window.players = {};

        // Zera as voltas dos jogadores
        window.laps = { 0: 0, 1: 0 };

        // Coloca ambos os jogadores em 1º lugar
        window.positions = { 0: 1, 1: 1 };

        // Marca que a corrida ainda não terminou
        window.raceFinished = false;

        // Guarda o momento exato que o jogo começou
        window.startTime = Date.now();

        // Zera os tempos de finalização
        window.finishTimes = {};

        // Zera as posições alvo do adversário
        window.opponentTargetPosition = {};

        // Zera as rotações alvo do adversário
        window.opponentTargetRotation = {};

        // Zera as partículas de fumaça (efeito visual)
        window.smokeParticles = [];

        // Configura o jogador atual (0 ou 1) com posição inicial e características
        window.players[window.playerId] = {
            x: window.playerId === 0 ? -5 : 5, // Jogador 0 começa à esquerda, jogador 1 à direita
            z: 0, // Posição inicial no eixo Z
            rotation: 0, // Rotação inicial do carro (olhando reto)
            speed: 0, // Velocidade começa em 0
            maxSpeed: 0.15 + (window.carConfig.engineLevel * 0.03), // Velocidade máxima depende do nível do motor
            acceleration: 0.003 + (window.carConfig.engineLevel * 0.001), // Aceleração depende do motor
            handling: 0.02 + (window.carConfig.tireLevel * 0.01), // Manuseio depende dos pneus
            nitro: 100, // Começa com 100% de nitro
            lap: 0, // Começa na volta 0
            lastCheckpoint: 0 // Último checkpoint passado
        };

        // Cria o carro do jogador com base nas configs (modelo, cor, etc.)
        window.playerCar = window.createCarModel(window.carConfig);

        // Coloca o carro do jogador na posição inicial
        window.playerCar.position.set(window.players[window.playerId].x, 0, window.players[window.playerId].z);

        // Adiciona o carro do jogador na cena do jogo
        window.scene.add(window.playerCar);

        // Guarda o carro do jogador na lista de modelos
        window.carModels[`player${window.playerId}`] = window.playerCar;

        // Define quem é o adversário (se jogador é 0, adversário é 1, e vice-versa)
        const opponentId = window.playerId === 0 ? 1 : 0;

        // Define a posição inicial do adversário (10 unidades pro lado do jogador)
        const opponentPositionX = window.players[window.playerId].x + (window.playerId === 0 ? 10 : -10);

        // Cria o carro do adversário
        const opponentCar = window.createCarModel(window.carConfig);

        // Coloca o carro do adversário na posição inicial
        opponentCar.position.set(opponentPositionX, 0, window.players[window.playerId].z);

        // Adiciona o carro do adversário na cena
        window.scene.add(opponentCar);

        // Guarda o carro do adversário na lista de modelos
        window.carModels[`player${opponentId}`] = opponentCar;

        // Configura as infos do adversário
        window.players[opponentId] = {
            x: opponentPositionX, // Posição inicial X
            z: window.players[window.playerId].z, // Mesma posição Z do jogador
            rotation: 0 // Rotação inicial (olhando reto)
        };

        // Define a posição alvo inicial do adversário
        window.opponentTargetPosition[opponentId] = { x: opponentPositionX, z: window.players[window.playerId].z };

        // Define a rotação alvo inicial do adversário
        window.opponentTargetRotation[opponentId] = 0;

        // Esconde a tela de carregamento
        document.getElementById('loadingOverlay').style.display = 'none';

        // Marca que o jogo tá rolando
        window.gameActive = true;

        // Começa o loop principal do jogo
        gameLoop();
    }

    // Função pra reiniciar o jogo (parecida com startGame, mas reaproveita coisas)
    function performGameRestart() {
        // Zera a lista de jogadores
        window.players = {};

        // Zera as voltas
        window.laps = { 0: 0, 1: 0 };

        // Coloca ambos em 1º lugar
        window.positions = { 0: 1, 1: 1 };

        // Marca que a corrida ainda não terminou
        window.raceFinished = false;

        // Guarda o momento do reinício
        window.startTime = Date.now();

        // Zera os tempos de finalização
        window.finishTimes = {};

        // Zera as posições alvo do adversário
        window.opponentTargetPosition = {};

        // Zera as rotações alvo do adversário
        window.opponentTargetRotation = {};

        // Zera as partículas de fumaça
        window.smokeParticles = [];

        // Configura o jogador atual novamente
        window.players[window.playerId] = {
            x: window.playerId === 0 ? -5 : 5, // Posição inicial (esquerda ou direita)
            z: 0, // Posição Z inicial
            rotation: 0, // Rotação inicial
            speed: 0, // Velocidade começa em 0
            maxSpeed: 0.15 + (window.carConfig.engineLevel * 0.03), // Velocidade máxima
            acceleration: 0.003 + (window.carConfig.engineLevel * 0.001), // Aceleração
            handling: 0.02 + (window.carConfig.tireLevel * 0.01), // Manuseio
            nitro: 100, // Nitro cheio
            lap: 0, // Volta 0
            lastCheckpoint: 0 // Último checkpoint
        };

        // Reposiciona o carro do jogador
        window.playerCar.position.set(window.players[window.playerId].x, 0, window.players[window.playerId].z);

        // Ajusta a rotação do carro do jogador
        window.playerCar.rotation.y = window.players[window.playerId].rotation;

        // Define o adversário
        const opponentId = window.playerId === 0 ? 1 : 0;

        // Reposiciona o carro do adversário
        window.carModels[`player${opponentId}`].position.set(window.players[window.playerId].x + (window.playerId === 0 ? 10 : -10), 0, window.players[window.playerId].z);

        // Zera a rotação do carro do adversário
        window.carModels[`player${opponentId}`].rotation.y = 0;

        // Configura as infos do adversário
        window.players[opponentId] = {
            x: window.players[window.playerId].x + (window.playerId === 0 ? 10 : -10), // Posição X
            z: window.players[window.playerId].z, // Posição Z
            rotation: 0 // Rotação inicial
        };

        // Define a posição alvo do adversário
        window.opponentTargetPosition[opponentId] = { x: window.players[window.playerId].x + (window.playerId === 0 ? 10 : -10), z: window.players[window.playerId].z };

        // Define a rotação alvo do adversário
        window.opponentTargetRotation[opponentId] = 0;

        // Esconde a tela de fim de jogo
        document.getElementById('endGameScreen').style.display = 'none';

        // Atualiza a interface com volta, posição, velocidade e nitro
        document.getElementById('lapCounter').textContent = 'VOLTA: 0/3';
        document.getElementById('positionDisplay').textContent = 'POSIÇÃO: 1°';
        document.getElementById('speedDisplay').textContent = 'VELOCIDADE: 0 KM/H';
        document.getElementById('nitroAmount').textContent = '100%';

        // Marca que o jogo tá ativo
        window.gameActive = true;

        // Começa o loop do jogo
        gameLoop();
    }

    // Função principal que roda o jogo a cada frame
    function gameLoop() {
        // Se o jogo não tá ativo ou o jogador não existe, para tudo
        if (!window.gameActive || !window.players[window.playerId]) return;

        // Pega as infos do jogador atual
        const player = window.players[window.playerId];

        // Se apertar pra cima ou W, acelera o carro
        if (window.keys['ArrowUp'] || window.keys['KeyW']) {
            player.speed += player.acceleration; // Aumenta a velocidade
            if (player.speed > player.maxSpeed) player.speed = player.maxSpeed; // Não passa do limite
        }

        // Se apertar pra baixo ou S, freia ou vai de ré
        if (window.keys['ArrowDown'] || window.keys['KeyS']) {
            player.speed -= player.acceleration * 0.7; // Freia mais devagar
            if (player.speed < -player.maxSpeed * 0.5) player.speed = -player.maxSpeed * 0.5; // Limite de ré
        }

        // Se apertar pra esquerda ou A, vira o carro pra esquerda
        if (window.keys['ArrowLeft'] || window.keys['KeyA']) {
            player.rotation += player.handling * (player.speed > 0 ? 1 : -1); // Vira com base na direção
        }

        // Se apertar pra direita ou D, vira o carro pra direita
        if (window.keys['ArrowRight'] || window.keys['KeyD']) {
            player.rotation -= player.handling * (player.speed > 0 ? 1 : -1); // Vira pro outro lado
        }

        // Se apertar espaço ou shift e tiver nitro, dá um turbo
        if ((window.keys['Space'] || window.keys['ShiftLeft']) && player.nitro > 0) {
            player.speed *= 1.5; // Aumenta a velocidade em 50%
            player.nitro -= 0.8; // Gasta nitro
            document.getElementById('nitroAmount').textContent = `${Math.round(player.nitro)}%`; // Atualiza a interface
            window.createSmoke(player.x, player.z, player.rotation); // Cria fumaça pro efeito visual
        }

        // Move o carro com base na rotação e velocidade
        player.x += Math.sin(player.rotation) * player.speed; // Move no eixo X
        player.z += Math.cos(player.rotation) * player.speed; // Move no eixo Z

        // Reduz a velocidade aos poucos (atrito)
        player.speed *= 0.97;
        if (Math.abs(player.speed) < 0.005) player.speed = 0; // Para se for muito lento

        // Atualiza a posição do carro do jogador na cena
        window.playerCar.position.set(player.x, 0, player.z);

        // Atualiza a rotação do carro
        window.playerCar.rotation.y = player.rotation;

        // Atualiza as rodas do carro (efeito visual)
        window.updateCarWheels(window.playerCar, player.rotation, player.speed);

        // Mostra a velocidade na tela (convertida pra km/h)
        document.getElementById('speedDisplay').textContent = `VELOCIDADE: ${Math.abs(Math.round(player.speed * 500))} KM/H`;

        // Mostra o nitro na tela
        document.getElementById('nitroAmount').textContent = `${Math.round(player.nitro)}%`;

        // Se o jogador passar do checkpoint (z > 40) e não passou antes
        if (player.z > 40 && player.lastCheckpoint === 0) {
            player.lap++; // Aumenta a volta
            player.lastCheckpoint = 1; // Marca que passou o checkpoint

            // Atualiza as voltas do jogador
            window.laps[window.playerId] = player.lap;

            // Mostra a volta atual na tela
            document.getElementById('lapCounter').textContent = `VOLTA: ${player.lap}/3`;

            // Se tiver conexão com o servidor, manda a info da volta
            if (window.dataChannel && window.dataChannel.readyState === 'open') {
                window.dataChannel.send(JSON.stringify({ 
                    type: 'lap', 
                    playerId: window.playerId,
                    lapCount: player.lap,
                    position: window.positions[window.playerId]
                }));
            }

            // Se completou 3 voltas e a corrida não terminou
            if (player.lap >= 3 && !window.raceFinished) {
                window.finishTimes[window.playerId] = Date.now() - window.startTime; // Guarda o tempo final
                window.raceFinished = true; // Marca que a corrida acabou

                window.playerMoney += 500; // Ganha 500 de dinheiro
                window.saveGameData(); // Salva o progresso

                window.showEndGameScreen('VOCÊ VENCEU!'); // Mostra a tela de vitória

                // Manda pro servidor que o jogador venceu
                if (window.dataChannel && window.dataChannel.readyState === 'open') {
                    window.dataChannel.send(JSON.stringify({ 
                        type: 'raceOver', 
                        winnerId: window.playerId
                    }));
                }
            }
        } 
        // Se voltar pro início da pista (z < -40), reseta o checkpoint
        else if (player.z < -40) {
            player.lastCheckpoint = 0;
        }

        // Define o adversário
        const opponentId = window.playerId === 0 ? 1 : 0;

        // Se o carro do adversário existe e tem uma posição alvo
        if (window.carModels[`player${opponentId}`] && window.opponentTargetPosition[opponentId]) {
            const currentPos = window.carModels[`player${opponentId}`].position; // Posição atual
            const targetPos = window.opponentTargetPosition[opponentId]; // Posição alvo
            const targetRot = window.opponentTargetRotation[opponentId]; // Rotação alvo

            // Move o carro do adversário suavemente pra posição alvo
            currentPos.x += (targetPos.x - currentPos.x) * window.interpolationFactor;
            currentPos.z += (targetPos.z - currentPos.z) * window.interpolationFactor;

            // Ajusta a rotação do carro do adversário
            const currentRot = window.carModels[`player${opponentId}`].rotation.y;
            let rotationDiff = targetRot - currentRot;

            // Corrige a rotação pra não dar voltas desnecessárias
            if (rotationDiff > Math.PI) {
                rotationDiff -= Math.PI * 2;
            } else if (rotationDiff < -Math.PI) {
                rotationDiff += Math.PI * 2;
            }

            // Aplica a rotação suavemente
            window.carModels[`player${opponentId}`].rotation.y += rotationDiff * window.interpolationFactor;
        }

        // Pega o tempo atual
        const now = Date.now();

        // Manda as infos do movimento do jogador pro servidor a cada 16ms
        if (now - window.lastMoveSent >= 16 && window.dataChannel && window.dataChannel.readyState === 'open') {
            window.dataChannel.send(JSON.stringify({ 
                type: 'move', 
                playerId: window.playerId, 
                position: {
                    x: player.x,
                    z: player.z,
                    rotation: player.rotation,
                    speed: player.speed
                } 
            }));
            window.lastMoveSent = now; // Atualiza o tempo do último envio
        }

        // Atualiza as partículas de fumaça (efeito visual)
        const delta = 0.016;
        window.updateSmoke(delta);

        // Desenha a cena do jogo na tela
        window.renderer.render(window.scene, window.camera);

        // Ajusta a câmera pra seguir o carro do jogador
        if (window.playerCar) {
            const cameraOffset = new THREE.Vector3(0, 3, -8); // Posição da câmera atrás do carro
            cameraOffset.applyQuaternion(window.playerCar.quaternion); // Ajusta com base na rotação
            window.camera.position.copy(window.playerCar.position).add(cameraOffset); // Move a câmera
            window.camera.lookAt(window.playerCar.position); // Faz a câmera olhar pro carro
        }

        // Chama o próximo frame do jogo
        requestAnimationFrame(gameLoop);
    }

    // Função pra atualizar a posição do adversário com base nos dados do servidor
    function updateOpponent(data) {
        if (window.players[data.playerId]) {
            // Atualiza a posição alvo do adversário
            window.opponentTargetPosition[data.playerId] = {
                x: data.position.x,
                z: data.position.z
            };

            // Atualiza a rotação alvo do adversário
            window.opponentTargetRotation[data.playerId] = data.position.rotation;

            // Atualiza as infos do adversário
            window.players[data.playerId].x = data.position.x;
            window.players[data.playerId].z = data.position.z;
            window.players[data.playerId].rotation = data.position.rotation;

            // Atualiza as rodas do carro do adversário (efeito visual)
            if (window.carModels[`player${data.playerId}`]) {
                window.updateCarWheels(
                    window.carModels[`player${data.playerId}`], 
                    data.position.rotation,
                    data.position.speed
                );
            }
        }
    }

    // Função pra lidar com atualizações de volta (quando alguém completa uma volta)
    function handleLapUpdate(data) {
        // Atualiza as voltas do jogador
        window.laps[data.playerId] = data.lapCount;

        // Atualiza a posição do jogador
        window.positions[data.playerId] = data.position;

        // Se for o jogador atual, atualiza a interface
        if (window.playerId.toString() === data.playerId) {
            document.getElementById('lapCounter').textContent = `VOLTA: ${data.lapCount}/3`;
            document.getElementById('positionDisplay').textContent = `POSIÇÃO: ${data.position}°`;
        }

        // Se alguém completou 3 voltas e a corrida não terminou
        if (data.lapCount >= 3 && !window.raceFinished) {
            window.finishTimes[data.playerId] = Date.now() - window.startTime; // Guarda o tempo final
            window.raceFinished = true; // Marca que a corrida acabou

            // Se não for o jogador atual, mostra que o adversário venceu
            if (data.playerId !== window.playerId) {
                window.showEndGameScreen(`JOGADOR ${parseInt(data.playerId) + 1} VENCEU!`);
            }
        }
    }

    // Associa as funções ao objeto window pra usar em outros lugares
    window.startGame = startGame;
    window.performGameRestart = performGameRestart;
    window.updateOpponent = updateOpponent;
    window.handleLapUpdate = handleLapUpdate;