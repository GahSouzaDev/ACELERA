// js/cars/basicSportsCar.js
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

export class BasicSportsCar {
    constructor() {
        this.id = 'basicSportsCar';
        this.name = "Esportivo Básico";
        this.color = 0x3366ff; // Blue
        this.accelerationFactor = 0.15; // Base acceleration
        this.maxSpeedBase = 180; // Base max speed (km/h)
        this.torqueMultiplierBase = 1.0; // Base torque multiplier
        this.handlingFactor = 1.0; // Base handling/steering speed
    }

    // This method creates the Three.js model for the car
    // It returns an object containing the carGroup and an array of its wheels
    createModel() {
        const carGroup = new THREE.Group();

        // Car body
        const bodyGeometry = new THREE.BoxGeometry(3, 1, 5);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: this.color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        body.castShadow = true;
        carGroup.add(body);

        // Hood
        const hoodGeometry = new THREE.BoxGeometry(2.8, 0.5, 2);
        const hoodMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(this.color).multiplyScalar(0.8).getHex() }); // Slightly darker
        const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
        hood.position.set(0, 0.75, 1);
        hood.castShadow = true;
        carGroup.add(hood);

        // Wheels
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

        // Lights
        const lightGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const lightMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffff00, 
            emissive: 0xffff00 // Make them glow
        });

        const frontLight1 = new THREE.Mesh(lightGeometry, lightMaterial);
        frontLight1.position.set(-0.8, 0.7, 2.5);
        carGroup.add(frontLight1);

        const frontLight2 = new THREE.Mesh(lightGeometry, lightMaterial);
        frontLight2.position.set(0.8, 0.7, 2.5);
        carGroup.add(frontLight2);

        // Return the group and wheels array for physics/animation
        return { group: carGroup, wheels: wheels };
    }
}