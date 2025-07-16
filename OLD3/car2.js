const car2 = {
    name: 'Red Storm',
    color: 0xff3366,
    mass: 1200,
    acceleration: 18,
    steering: 1.3,
    gearSettings: {
        'R': { minSpeed: -25, maxSpeed: 0, optimalMin: -18, optimalMax: -8, torqueMultiplier: 0.6 },
        'N': { minSpeed: -10, maxSpeed: 10, optimalMin: 0, optimalMax: 0, torqueMultiplier: 0.1 },
        '1': { minSpeed: 0, maxSpeed: 45, optimalMin: 15, optimalMax: 35, torqueMultiplier: 0.95 },
        '2': { minSpeed: 25, maxSpeed: 75, optimalMin: 45, optimalMax: 65, torqueMultiplier: 0.85 },
        '3': { minSpeed: 55, maxSpeed: 105, optimalMin: 75, optimalMax: 95, torqueMultiplier: 0.75 },
        '4': { minSpeed: 85, maxSpeed: 135, optimalMin: 105, optimalMax: 125, torqueMultiplier: 0.65 },
        '5': { minSpeed: 115, maxSpeed: 165, optimalMin: 135, optimalMax: 155, torqueMultiplier: 0.55 }
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
        const hoodMaterial = new THREE.MeshStandardMaterial({ color: 0xcc2244 });
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
        return { group: carGroup, wheels, color: this.color, position: new THREE.Vector3(90, 0.5, 0), rotation: 0, targetRotation: 0 };
    }
};