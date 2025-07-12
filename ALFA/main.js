document.addEventListener('DOMContentLoaded', () => {
    window.initThreeJS();
    window.loadCarConfig();
    window.loadGameData();
    
    const engineSlider = document.getElementById('engineLevel');
    const engineLevelValue = document.getElementById('engineLevelValue');
    const tireSlider = document.getElementById('tireLevel');
    const tireLevelValue = document.getElementById('tireLevelValue');
    
    engineSlider.addEventListener('input', () => {
        engineLevelValue.textContent = engineSlider.value;
    });
    
    tireSlider.addEventListener('input', () => {
        tireLevelValue.textContent = tireSlider.value;
    });
    
    document.getElementById('rematchBtn').addEventListener('click', window.restartGame);
    
    document.getElementById('exitBtn').addEventListener('click', () => {
        window.closeConnections();
        window.gameActive = false;
        document.getElementById('endGameScreen').style.display = 'none';
        window.updateStatus('PRONTO PARA JOGAR NOVAMENTE');
    });
    
    document.getElementById('copyIdBtn').addEventListener('click', () => {
        document.getElementById('roomId').select();
        document.execCommand('copy');
        window.updateStatus('ID COPIADO!');
    });
    
    document.addEventListener('keydown', (e) => {
        window.keys[e.code] = true;
    });
    
    document.addEventListener('keyup', (e) => {
        window.keys[e.code] = false;
    });
});