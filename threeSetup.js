window.scene = null;
window.camera = null;
window.renderer = null;

function initThreeJS() {
    window.scene = new THREE.Scene();
    window.scene.background = new THREE.Color(0x222222);
    window.scene.fog = new THREE.Fog(0x222222, 20, 100);
    
    window.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    window.camera.position.set(0, 5, -10);
    
    window.renderer = new THREE.WebGLRenderer({ antialias: true });
    window.renderer.setSize(window.innerWidth, window.innerHeight);
    window.renderer.shadowMap.enabled = true;
    document.getElementById('gameContainer').appendChild(window.renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    window.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 15);
    directionalLight.castShadow = true;
    window.scene.add(directionalLight);
    
    createTrack();
    window.addEventListener('resize', onWindowResize, false);
}

function createTrack() {
    const trackGeometry = new THREE.BoxGeometry(30, 0.5, 100);
    const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const track = new THREE.Mesh(trackGeometry, trackMaterial);
    track.position.y = -1;
    track.receiveShadow = true;
    window.scene.add(track);
    
    const grassGeometry = new THREE.BoxGeometry(100, 0.5, 140);
    const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x226622 });
    const grass = new THREE.Mesh(grassGeometry, grassMaterial);
    grass.position.y = -1.1;
    grass.receiveShadow = true;
    window.scene.add(grass);
    
    const lineMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    for (let i = -40; i <= 40; i += 10) {
        const lineGeometry = new THREE.BoxGeometry(1, 0.1, 3);
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.position.z = i;
        line.position.y = -0.75;
        line.receiveShadow = true;
        window.scene.add(line);
    }
    
    const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    for (let i = 0; i < 5; i++) {
        const obstacleGeometry = new THREE.BoxGeometry(2, 1, 1);
        const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
        obstacle.position.set(
            (Math.random() - 0.5) * 20,
            0,
            (Math.random() - 0.5) * 80
        );
        obstacle.castShadow = true;
        window.scene.add(obstacle);
    }
}

function onWindowResize() {
    window.camera.aspect = window.innerWidth / window.innerHeight;
    window.camera.updateProjectionMatrix();
    window.renderer.setSize(window.innerWidth, window.innerHeight);
}

window.initThreeJS = initThreeJS;