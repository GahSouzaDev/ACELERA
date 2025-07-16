const track2 = {
    name: 'Twist Valley',
    isOnTrack: function(position) {
        const path = new THREE.Path();
        path.moveTo(100, 0);
        path.quadraticCurveTo(50, 50, 0, 100);
        path.quadraticCurveTo(-50, 50, -100, 0);
        path.quadraticCurveTo(-50, -50, 0, -100);
        path.quadraticCurveTo(50, -50, 100, 0);
        const points = path.getPoints(100);
        let minDist = Infinity;
        for (let i = 0; i < points.length; i++) {
            const point = points[i];
            const dist = Math.sqrt((position.x - point.x) ** 2 + (position.z - point.y) ** 2);
            minDist = Math.min(minDist, dist);
        }
        return minDist <= 20;
    },
    checkCheckpoint: function(position, lastCheckpoint) {
        if (lastCheckpoint === 0 && position.z > -1 && position.z < 1 && position.x > 80 && position.x < 120) {
            return true;
        } else if (lastCheckpoint === 1 && position.x > -10 && position.x < 10 && position.z > -100 && position.z < -80) {
            return true;
        }
        return false;
    },
    createTrack: function(scene) {
        const trackGroup = new THREE.Group();
        const path = new THREE.Path();
        path.moveTo(100, 0);
        path.quadraticCurveTo(50, 50, 0, 100);
        path.quadraticCurveTo(-50, 50, -100, 0);
        path.quadraticCurveTo(-50, -50, 0, -100);
        path.quadraticCurveTo(50, -50, 100, 0);
        const points = path.getPoints(100);
        const shape = new THREE.Shape();
        points.forEach((point, i) => {
            if (i === 0) shape.moveTo(point.x, point.y);
            else shape.lineTo(point.x, point.y);
        });
        const extrudeSettings = { depth: 0.2, bevelEnabled: false };
        const trackGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
        const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
        trackMesh.rotation.x = -Math.PI / 2;
        trackMesh.position.y = 0.1;
        trackGroup.add(trackMesh);

        const grassGeometry = new THREE.PlaneGeometry(1000, 1000);
        const grassMaterial = new THREE.MeshStandardMaterial({ color: 0x228822 });
        const grass = new THREE.Mesh(grassGeometry, grassMaterial);
        grass.rotation.x = -Math.PI / 2;
        grass.position.y = -0.1;
        trackGroup.add(grass);

        scene.add(trackGroup);
        return trackGroup;
    }
};