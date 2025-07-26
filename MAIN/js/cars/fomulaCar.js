// js/cars/formulaCar.js
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

export class FormulaCar {
    constructor() {
        this.id = 'formulaCar';
        this.name = "Fórmula Racer";
        this.color = 0xff3366; // Pink/Red
        this.accelerationFactor = 0.22; // Very high acceleration
        this.maxSpeedBase = 220; // Very high top speed
        this.torqueMultiplierBase = 0.9; // Lower torque but high RPM
        this.handlingFactor = 1.3; // Excellent handling
    }

    createModel() {
        const carGroup = new THREE.Group();

        // Main body - sleek, narrow
        const bodyGeometry = new THREE.BoxGeometry(1.8, 0.6, 4.5);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: this.color });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.3;
        body.castShadow = true;
        carGroup.add(body);

        // Cockpit
        const cockpitGeometry = new THREE.BoxGeometry(0.8, 0.4, 1.2);
        const cockpitMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff }); // Blue cockpit
        const cockpit = new THREE.Mesh(cockpitGeometry, cockpitMaterial);
        cockpit.position.set(0, 0.6, 0.5);
        cockpit.castShadow = true;
        carGroup.add(cockpit);

        // Front wing
        const frontWingGeometry = new THREE.BoxGeometry(2.5, 0.1, 0.6);
        const frontWingMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const frontWing = new THREE.Mesh(frontWingGeometry, frontWingMaterial);
        frontWing.position.set(0, 0.2, 2.5);
        frontWing.castShadow = true;
        carGroup.add(frontWing);

        // Rear wing
        const rearWingGeometry = new THREE.BoxGeometry(2.8, 0.1, 0.5);
        const rearWingMaterial = new THREE.MeshStandardMaterial({ color: 0x222222 });
        const rearWing = new THREE.Mesh(rearWingGeometry, rearWingMaterial);
        rearWing.position.set(0, 0.8, -2.2);
        rearWing.castShadow = true;
        carGroup.add(rearWing);
        
        const rearWingSupportGeometry = new THREE.BoxGeometry(0.1, 0.5, 0.1);
        const rearWingSupportMaterial = new THREE.MeshStandardMaterial({ color: 0x444444 });
        const rearWingSupport1 = new THREE.Mesh(rearWingSupportGeometry, rearWingSupportMaterial);
        rearWingSupport1.position.set(-0.8, 0.5, -2.2);
        carGroup.add(rearWingSupport1);
        const rearWingSupport2 = new THREE.Mesh(rearWingSupportGeometry, rearWingSupportMaterial);
        rearWingSupport2.position.set(0.8, 0.5, -2.2);
        carGroup.add(rearWingSupport2);

        // Wheels - open-wheel style, larger diameter
        const wheelGeometry = new THREE.CylinderGeometry(0.8, 0.8, 0.5, 16);
        wheelGeometry.rotateZ(Math.PI / 2);
        const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });

        const wheelPositions = [
            { x: -1.4, y: 0.3, z: 1.5 },
            { x: 1.4, y: 0.3, z: 1.5 },
            { x: -1.4, y: 0.3, z: -1.5 },
            { x: 1.4, y: 0.3, z: -1.5 }
        ];

        const wheels = [];
        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
            wheel.position.set(pos.x, pos.y, pos.z);
            wheel.castShadow = true;
            carGroup.add(wheel);
            wheels.push(wheel);
        });

        return { group: carGroup, wheels: wheels };
    }
}