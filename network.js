window.ws = null;
window.peerConnection = null;
window.dataChannel = null;
window.playerId = null;
window.currentRoomId = null;

function joinRoom() {
    const roomId = document.getElementById('roomId').value.trim();
    if (!roomId) {
        window.updateStatus('POR FAVOR, INSIRA UM ID DE SALA');
        return;
    }
    
    window.currentRoomId = roomId;
    window.updateStatus('CONECTANDO AO SERVIDOR...');
    document.getElementById('loadingOverlay').style.display = 'flex';
    window.ws = new WebSocket(SERVER_URL);
    
    window.ws.onopen = () => {
        window.updateStatus('AGUARDANDO OPONENTE...');
        window.ws.send(JSON.stringify({ 
            type: 'join', 
            roomId,
            carConfig: window.carConfig
        }));
    };
    
    window.ws.onerror = (error) => {
        window.updateStatus('ERRO NA CONEXÃO');
        document.getElementById('loadingOverlay').style.display = 'none';
    };
    
    window.ws.onclose = (event) => {
        window.updateStatus('CONEXÃO FECHADA');
        document.getElementById('loadingOverlay').style.display = 'none';
    };
    
    window.ws.onmessage = async (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'start') {
                window.playerId = data.playerId;
                window.updateStatus(`VOCÊ É O JOGADOR ${window.playerId + 1}`);
                initPeerConnection();
                
                if (window.playerId === 0) {
                    window.dataChannel = window.peerConnection.createDataChannel('game');
                    setupDataChannel();
                    const offer = await window.peerConnection.createOffer();
                    await window.peerConnection.setLocalDescription(offer);
                    window.ws.send(JSON.stringify({ type: 'offer', sdp: offer }));
                }
            } 
            else if (data.type === 'offer') {
                await window.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
                const answer = await window.peerConnection.createAnswer();
                await window.peerConnection.setLocalDescription(answer);
                window.ws.send(JSON.stringify({ type: 'answer', sdp: answer }));
            } 
            else if (data.type === 'answer') {
                await window.peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
            } 
            else if (data.type === 'ice') {
                await window.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
            } 
            else if (data.type === 'error') {
                window.updateStatus(`ERRO: ${data.message}`);
                document.getElementById('loadingOverlay').style.display = 'none';
            }
        } catch (error) {
            window.updateStatus('ERRO NO PROCESSAMENTO');
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    };
}

function initPeerConnection() {
    window.peerConnection = new RTCPeerConnection(rtcConfig);
    
    window.peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            window.ws.send(JSON.stringify({ type: 'ice', candidate: event.candidate }));
        }
    };
    
    window.peerConnection.oniceconnectionstatechange = () => {
        const state = window.peerConnection.iceConnectionState;
        window.updateStatus(`ESTADO: ${state}`);
        
        if (state === 'failed') {
            window.updateStatus('FALHA NA CONEXÃO');
            document.getElementById('loadingOverlay').style.display = 'none';
        }
    };
    
    window.peerConnection.ondatachannel = (event) => {
        window.dataChannel = event.channel;
        setupDataChannel();
    };
}

function setupDataChannel() {
    window.dataChannel.onopen = () => {
        window.updateStatus('CONEXÃO P2P ESTABELECIDA!');
        window.startGame();
    };
    
    window.dataChannel.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'move') {
                window.updateOpponent(data);
            } 
            else if (data.type === 'lap') {
                window.handleLapUpdate(data);
            } 
            else if (data.type === 'raceOver') {
                window.showEndGameScreen(`JOGADOR ${parseInt(data.winnerId) + 1} VENCEU!`);
            } 
            else if (data.type === 'restart') {
                window.performGameRestart();
            }
        } catch (error) {
            console.error('Erro no DataChannel:', error);
        }
    };
}

function closeConnections() {
    if (window.dataChannel) {
        window.dataChannel.close();
        window.dataChannel = null;
    }
    if (window.peerConnection) {
        window.peerConnection.close();
        window.peerConnection = null;
    }
    if (window.ws) {
        window.ws.close();
        window.ws = null;
    }
}

window.joinRoom = joinRoom;
window.closeConnections = closeConnections;