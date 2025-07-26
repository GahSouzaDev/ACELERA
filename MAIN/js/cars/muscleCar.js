// js/cars/muscleCar.js
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

export class MuscleCar {
    constructor() {
        this.id = 'muscleCar';
        this.name = "Muscle Car";
        this.color = 0xff5500; // Orange
        this.accelerationFactor = 0.18; // Higher acceleration
        this.maxSpeedBase = 160; // Lower top speed
        this.torqueMultiplierBase = 1.3; // Very high torque
        this.handlingFactor = 0.8; // Slower handling
    }

    createModel() {
        const carGroup = new THREE.Group();

        // Car body - wider, more robust
        const bodyGeometry = new THREE.BoxGeometry(3.5, 1.2, 6);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: this.color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        body.castShadow = true;
        carGroup.add(body);

        // Hood - extended
        const hoodGeometry = new THREE.BoxGeometry(3.3, 0.6, 2.5);
        const hoodMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(this.color).multiplyScalar(0.8).getHex() });
        const hood = new THREE.Mesh(hoodGeometry, hoodMaterial);
        hood.position.set(0, 0.9, 1.5);
        hood.castShadow = true;
        carGroup.add(hood);

        // Wheels - wider
        const wheelGeometry = new THREE.CylinderGeometry(0.6, 0.6, 1.0, 16);
        wheelGeometry.rotateZ(Math.PI / 2);
        const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });

        const wheelPositions = [
            { x: -1.7, y: 0.6, z: 2.5 },
            { x: 1.7, y: 0.6, z: 2.5 },
            { x: -1.7, y: 0.6, z: -2.5 },
            { x: 1.7, y: 0.6, z: -2.5 }
        ];

        const wheels = [];
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.castShadow = true;
            carGroup.add(wheel);
            wheels.push(wheel);
        });

        // Side exhaust pipes (decorative)
        const exhaustGeometry = new THREE.CylinderGeometry(0.15, 0.15, 1.5, 8);
        const exhaustMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        
        const exhaust1 = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
        exhaust1.position.set(-1.9, 0.7, -1);
        exhaust1.rotation.z = Math.PI / 2;
        carGroup.add(exhaust1);
        
        const exhaust2 = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
        exhaust2.position.set(1.9, 0.7, -1);
        exhaust2.rotation.z = -Math.PI / 2;
        carGroup.add(exhaust2);

        return { group: carGroup, wheels: wheels };
    }
}