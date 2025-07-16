const car1 = {
    name: 'Blue Racer',
    color: 0x3366ff,
    mass: 1000,
    acceleration: 20,
    steering: 1.5,
    gearSettings: {
        'R': { minSpeed: -30, maxSpeed: 0, optimalMin: -20, optimalMax: -10, torqueMultiplier: 0.7 },
        'N': { minSpeed: -10, maxSpeed: 10, optimalMin: 0, optimalMax: 0, torqueMultiplier: 0.1 },
        '1': { minSpeed: 0, maxSpeed: 50, optimalMin: 20, optimalMax: 40, torqueMultiplier: 1.0 },
        '2': { minSpeed: 30, maxSpeed: 80, optimalMin: 50, optimalMax: 70, torqueMultiplier: 0.9 },
        '3': { minSpeed: 60, maxSpeed: 110, optimalMin: 80, optimalMax: 100, torqueMultiplier: 0.8 },
        '4': { minSpeed: 90, maxSpeed: 140, optimalMin: 110, optimalMax: 130, torqueMultiplier: 0.7 },
        '5': { minSpeed: 120, maxSpeed: 170, optimalMin: 140, optimalMax: 160, torqueMultiplier: 0.6 }
    },
    createCar: function(scene) {
        const carGroup = new THREE.Group();
        const bodyGeometry = new THREE.BoxGeometry(3, 1, 5);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: this.color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        body.castShadow = true;
        carGroup.add(body);

        const hoodGeometry = new THREE.BoxGeometry(2.8, 0.5, 2);
        const hoodMaterial = new THREE.MeshStandardMaterial({ color: 0x2244cc });
        const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
        hood.position.set(0, 0.75, 1);
        hood.castShadow = true;
        carGroup.add(hood);

        const wheelGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.8, 16);
        wheelGeometry.rotateZ(Math.PI / 2);
        const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const wheels = [];
        const wheelPositions = [
            { x: -1.5, y: 0.5, z: 2 },
            { x: 1.5, y: 0.5, z: 2 },
            { x: -1.5, y: 0.5, z: -2 },
            { x: 1.5, y: 0.5, z: -2 }
        ];
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.castShadow = true;
            carGroup.add(wheel);
            wheels.push(wheel);
        });

        scene.add(carGroup);
        return { group: carGroup, wheels, color: this.color, position: new THREE.Vector3(100, 0.5, 0), rotation: 0, targetRotation: 0 };
    }
};