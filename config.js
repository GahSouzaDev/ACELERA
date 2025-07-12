// Endereço do servidor pra conectar o jogo em tempo real, tipo um chat
    const SERVER_URL = 'wss://heroic-hope-production-bbdc.up.railway.app';

    // Configuração pra conectar a internet do jeito certo, pro jogo funcionar
    const rtcConfig = {
        // Lista de servidores que ajudam a conectar os jogadores
        iceServers: [
            // Servidor do Google pra ajudar a encontrar o caminho da conexão
            { urls: 'stun:stun.l.google.com:19302' },
            // Outro servidor do Google, caso o primeiro não funcione
            { urls: 'stun:stun1.l.google.com:19302' },
            // Mais um servidor do Google, pra garantir
            { urls: 'stun:stun2.l.google.com:19302' },
            // Servidor da Cloudflare que ajuda quando a conexão tá difícil
            {
                urls: 'turn:turn.speed.cloudflare.com:50000',
                // Nome de usuário pra entrar nesse servidor
                username: 'd1a7f09155fb30285724a3a056ca2edf17956674aff12909ff133dcec42994b2614cdd0a380a1b65124def1e3d0208543050d14b77d1a7533f9da35893ee2ed9',
                // Senha pra entrar nesse servidor
                credential: 'aba9b169546eb6dcc7bfb1cdf34544cf95b5161d602e3b5fa7c8342b2e9802fb',
            },
            // Servidor reserva, caso os outros não deem certo
            {
                urls: 'turn:openrelay.metered.ca:80',
                // Nome de usuário pro servidor reserva
                username: 'openrelayproject',
                // Senha pro servidor reserva
                credential: 'openrelayproject',
            },
        ],
    };

    // Configuração do carro que o jogador usa no jogo
    window.carConfig = {
        // Tipo do carro, como se fosse o modelo
        model: 'car1',
        // Cor do carro, aqui é vermelho
        color: '#ff0000',
        // Nível do motor, quanto maior, mais rápido o carro
        engineLevel: 3,
        // Nível dos pneus, quanto maior, melhor o carro gruda na pista
        tireLevel: 2
    };

    // Dinheiro que o jogador tem no jogo, começa com 1000
    window.playerMoney = 1000;