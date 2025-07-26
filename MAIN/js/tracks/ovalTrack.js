// js/tracks/ovalTrack.js
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';

export class OvalTrack {
    constructor() {
        this.id = 'ovalTrack';
        this.name = "Pista Oval Clássica";
        this.startPosition = new THREE.Vector3(100, 0.5, 0); // Where cars start
        this.frictionZones = [
            // Example: An outer "grass" area where friction increases
            // These values are for conceptual zones, actual friction check will be in main.js
            // { type: 'ring', innerRadius: 120, outerRadius: 500, frictionFactor: 0.2, color: 0x228822 }, // Grass outside track
            // { type: 'circle', radius: 80, frictionFactor: 0.2, color: 0x228822 } // Grass inside track
        ];
        this.checkpoints = [
            // Checkpoints are defined relative to the track's coordinate system
            // For a simple oval, the start/finish line is enough
            // You'd typically need more for complex circuits to ensure proper lap validation
            { x: 100, z: 0, radius: 20, isStartFinish: true }, // Start/finish line (entry point for lap)
            { x: -100, z: 0, radius: 20, isStartFinish: false } // Checkpoint on the opposite side
        ];
    }

    createModel() {
        const trackGroup = new THREE.Group();

        // Track surface (asphalt) - RingGeometry for the oval shape
        const trackGeometry = new THREE.RingGeometry(80, 120, 64); // Inner radius, outer radius, segments
        const trackMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x333333, // Dark grey for asphalt
            roughness: 0.7,
            metalness: 0.1
        });
        const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
        trackMesh.rotation.x = -Math.PI / 2; // Rotate to lie flat
        trackMesh.receiveShadow = true;
        trackGroup.add(trackMesh);

        // Track borders (red and white)
        const borderMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red for borders
        const innerBorderGeometry = new THREE.TorusGeometry(80, 0.5, 16, 64); // Thin inner border
        const innerBorder = new THREE.Mesh(innerBorderGeometry, borderMaterial);
        innerBorder.rotation.x = Math.PI / 2;
        innerBorder.position.y = 0.05; // Slightly above track
        trackGroup.add(innerBorder);

        const outerBorderGeometry = new THREE.TorusGeometry(120, 0.5, 16, 64); // Thin outer border
        const outerBorder = new THREE.Mesh(outerBorderGeometry, borderMaterial);
        outerBorder.rotation.x = Math.PI / 2;
        outerBorder.position.y = 0.05; // Slightly above track
        trackGroup.add(outerBorder);

        // Start/Finish Line - a simple white strip across the track
        const startLineGeometry = new THREE.BoxGeometry(40, 0.1, 2); // width, height, depth
        const startLineMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
        const startLine = new THREE.Mesh(startLineGeometry, startLineMaterial);
        startLine.position.set(100, 0.06, 0); // Position at the start of the track segment
        startLine.receiveShadow = true;
        trackGroup.add(startLine);

        // Grass/Terrain surrounding the track
        const grassGeometry = new THREE.PlaneGeometry(1000, 1000); // Large plane for the ground
        const grassMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x228822, // Green for grass
            roughness: 1, // Rough surface
            metalness: 0
        });
        const grass = new THREE.Mesh(grassGeometry, grassMaterial);
        grass.rotation.x = -Math.PI / 2;
        grass.position.y = -0.1; // Below the track
        grass.receiveShadow = true;
        trackGroup.add(grass);
        
        // Define actual friction zones for collision detection.
        // These are more for the physics engine to check if the car is "off-road".
        // The track model itself doesn't inherently have "friction zones" visually.
        this.frictionZones = [
            // Grass outside the track
            { type: 'circular_band', innerRadius: 120.5, outerRadius: 500, frictionMultiplier: 0.3 }, // Adjusted radius slightly
            // Grass inside the track
            { type: 'circle', radius: 79.5, frictionMultiplier: 0.3 } // Adjusted radius slightly
        ];


        return trackGroup;
    }
}