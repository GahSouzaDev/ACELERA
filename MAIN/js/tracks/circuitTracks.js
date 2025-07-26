// js/tracks/circuitTrack.js
import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
// Importação local dos módulos Three.js JSM
import { CatmullRomCurve3 } from '../three-modules/CatmullRomCurve3.js';
import { TubeGeometry } from '../three-modules/TubeGeometry.js';

export class CircuitTrack {
    constructor() {
        this.id = 'circuitTrack';
        this.name = "Circuito Desafiador";
        this.startPosition = new THREE.Vector3(0, 0.5, 0); // Adjust as needed for your circuit

        // Control points to define the circuit shape (example for a simple figure-8 or complex loop)
        this.pathPoints = [
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(100, 0, 0),
            new THREE.Vector3(120, 0, 50),
            new THREE.Vector3(80, 0, 120),
            new THREE.Vector3(0, 0, 150),
            new THREE.Vector3(-80, 0, 120),
            new THREE.Vector3(-120, 0, 50),
            new THREE.Vector3(-100, 0, 0),
            new THREE.Vector3(-120, 0, -50),
            new THREE.Vector3(-80, 0, -120),
            new THREE.Vector3(0, 0, -150),
            new THREE.Vector3(80, 0, -120),
            new THREE.Vector3(120, 0, -50),
            new THREE.Vector3(100, 0, 0) // Loop back to start (approx)
        ];
        // Create a smooth curve from the points
        // Agora usando a classe importada CatmullRomCurve3
        this.curve = new CatmullRomCurve3(this.pathPoints, true); // 'true' makes it a closed loop

        // Checkpoints (approximate positions along the curve)
        // For a real game, you'd calculate these precisely along the curve length
        this.checkpoints = [
            { position: new THREE.Vector3(0, 0, 0), radius: 15, isStartFinish: true, nextCheckpointIndex: 1 },
            { position: new THREE.Vector3(80, 0, 80), radius: 15, isStartFinish: false, nextCheckpointIndex: 2 },
            { position: new THREE.Vector3(0, 0, 150), radius: 15, isStartFinish: false, nextCheckpointIndex: 3 },
            { position: new THREE.Vector3(-80, 0, 80), radius: 15, isStartFinish: false, nextCheckpointIndex: 4 },
            { position: new THREE.Vector3(-80, 0, -80), radius: 15, isStartFinish: false, nextCheckpointIndex: 5 },
            { position: new THREE.Vector3(0, 0, -150), radius: 15, isStartFinish: false, nextCheckpointIndex: 6 },
            { position: new THREE.Vector3(80, 0, -80), radius: 15, isStartFinish: false, nextCheckpointIndex: 0 },
        ];
        this.startPosition = this.checkpoints[0].position.clone();
        this.startPosition.y = 0.5; // Adjust Y position for car
    }

    createModel() {
        const trackGroup = new THREE.Group();
        const roadWidth = 20; // Width of the road
        const borderHeight = 1; // Height of the track borders

        // Generate track geometry using ExtrudeGeometry along the curve
        const tubularSegments = 500; // More segments for smoother curve
        const radiusSegments = 8;
        const closed = true;

        // Agora usando a classe importada TubeGeometry
        const trackGeometry = new TubeGeometry(this.curve, tubularSegments, roadWidth / 2, radiusSegments, closed);
        const trackMaterial = new THREE.MeshStandardMaterial({
            color: 0x333333,
            roughness: 0.7,
            metalness: 0.1,
            side: THREE.DoubleSide // Important for tubes
        });
        const trackMesh = new THREE.Mesh(trackGeometry, trackMaterial);
        trackMesh.receiveShadow = true;
        trackGroup.add(trackMesh);

        // Create inner and outer borders by extruding along the curve again, but offset
        const borderMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 }); // Red border

        // Inner Border
        const innerBorderOffsetCurve = new CatmullRomCurve3( // Usando CatmullRomCurve3
            this.curve.getPoints(tubularSegments).map(p => {
                const tangent = this.curve.getTangent(this.curve.getU(p)).normalize();
                const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0,1,0)).normalize();
                return new THREE.Vector3().addVectors(p, normal.multiplyScalar(roadWidth / 2 + 1)); // Offset inward
            }), true
        );
        const innerBorderGeometry = new TubeGeometry(innerBorderOffsetCurve, tubularSegments, 0.5, radiusSegments, closed); // Usando TubeGeometry
        const innerBorderMesh = new THREE.Mesh(innerBorderGeometry, borderMaterial);
        innerBorderMesh.position.y = borderHeight / 2 + 0.1; // Adjust height above track
        innerBorderMesh.receiveShadow = true;
        trackGroup.add(innerBorderMesh);

        // Outer Border
        const outerBorderOffsetCurve = new CatmullRomCurve3( // Usando CatmullRomCurve3
            this.curve.getPoints(tubularSegments).map(p => {
                const tangent = this.curve.getTangent(this.curve.getU(p)).normalize();
                const normal = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(0,1,0)).normalize().negate(); // Invert normal for outer
                return new THREE.Vector3().addVectors(p, normal.multiplyScalar(roadWidth / 2 + 1)); // Offset outward
            }), true
        );
        const outerBorderGeometry = new TubeGeometry(outerBorderOffsetCurve, tubularSegments, 0.5, radiusSegments, closed); // Usando TubeGeometry
        const outerBorderMesh = new THREE.Mesh(outerBorderGeometry, borderMaterial);
        outerBorderMesh.position.y = borderHeight / 2 + 0.1; // Adjust height above track
        outerBorderMesh.receiveShadow = true;
        trackGroup.add(outerBorderMesh);

        // Start/Finish Line (a simple plane across the track at the start point)
        const startLineGeometry = new THREE.PlaneGeometry(roadWidth + 2, 1);
        const startLineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
        const startLineMesh = new THREE.Mesh(startLineGeometry, startLineMaterial);
        startLineMesh.rotation.x = -Math.PI / 2;
        startLineMesh.position.copy(this.curve.getPointAt(0)); // Position at the start of the curve
        startLineMesh.position.y = 0.06; // Slightly above track
        const startTangent = this.curve.getTangentAt(0);
        const startAngle = Math.atan2(startTangent.x, startTangent.z);
        startLineMesh.rotation.z = startAngle; // Rotate to be perpendicular to the track
        trackGroup.add(startLineMesh);


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

        // Friction zones for grass
        this.frictionZones = [
            // Define an approximate "outside the track" and "inside the track" area for friction
            // This is simplified and would need more sophisticated collision mesh for a precise circuit
            { type: 'curve_proximity', curve: this.curve, roadWidth: roadWidth, frictionMultiplier: 0.3 }
        ];

        return trackGroup;
    }
}