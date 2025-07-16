const track1 = {
    name: 'Oval Circuit',
    isOnTrack: function(position) {
        const distance = Math.sqrt(position.x * position.x + position.z * position.z);
        return distance >= 80 && distance <= 120;
    },
    checkCheckpoint: function(position, lastCheckpoint) {
        if (lastCheckpoint === 0 && position.z > -1 && position.z < 1 && position.x > 80 && position.x < 120) {
            return true;
        } else if (lastCheckpoint === 1 && (position.z > 45 || position.z < -45)) {
            return true;
        }
        return false;
    },
    createTrack: function(scene) {
        const trackGroup = new THREE.Group();
        const trackGeometry = new THREE.RingGeometry(80, 120, 64, 8);
        const trackMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
        const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
        trackMesh.rotation.x = -Math.PI / 2;
        trackMesh.receiveShadow = true;
        trackGroup.add(trackMesh);

        const borderGeometry = new THREE.TorusGeometry(120, 2, 16, 64);
        const borderMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
        const outerBorder = new THREE.Mesh(borderGeometry, borderMaterial);
        outerBorder.rotation.x = Math.PI / 2;
        outerBorder.position.y = 0.1;
        trackGroup.add(outerBorder);

        const innerBorder = new THREE.Mesh(new THREE.TorusGeometry(80, 2, 16, 64), borderMaterial);
        innerBorder.rotation.x = Math.PI / 2;
        innerBorder.position.y = 0.1;
        trackGroup.add(innerBorder);

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