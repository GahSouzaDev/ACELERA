// Lista pra guardar as partículas de fumaça (efeito visual do nitro)
    window.smokeParticles = [];

    // Função que cria o modelo do carro em 3D
    function createCarModel(config) {
        // Cria um grupo pra juntar todas as partes do carro
        const car = new THREE.Group();

        // Cria a forma do corpo do carro (um retângulo 3D)
        const bodyGeometry = new THREE.BoxGeometry(2, 0.8, 4);

        // Define o material do corpo (cor, brilho, etc.)
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: new THREE.Color(config.color), // Pega a cor do config (ex.: vermelho)
            roughness: 0.7, // Deixa a superfície meio fosca
            metalness: 0.7 // Dá um leve toque metálico
        });

        // Cria o corpo do carro com a forma e o material
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);

        // Levanta o corpo um pouco (pra não ficar no chão)
        body.position.y = 0.4;

        // Faz o corpo lançar sombra
        body.castShadow = true;

        // Adiciona o corpo ao grupo do carro
        car.add(body);

        // Cria a forma da cabine (parte de cima do carro)
        const cabinGeometry = new THREE.BoxGeometry(1.5, 0.7, 1.5);

        // Material da cabine (cor cinza escura)
        const cabinMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });

        // Cria a cabine
        const cabin = new THREE.Mesh(cabinGeometry, cabinMaterial);

        // Posiciona a cabine em cima do corpo, um pouco pra frente
        cabin.position.set(0, 0.9, 0.5);

        // Faz a cabine lançar sombra
        cabin.castShadow = true;

        // Adiciona a cabine ao grupo do carro
        car.add(cabin);

        // Cria a forma das rodas (um cilindro achatado)
        const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);

        // Gira o cilindro pra ficar como roda
        wheelGeometry.rotateZ(Math.PI / 2);

        // Material das rodas (preto, meio fosco)
        const wheelMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x111111, // Cor preta
            roughness: 0.8, // Bem fosco
            metalness: 0.2 // Pouco metálico
        });

        // Define as posições das quatro rodas
        const wheelPositions = [
            { x: -1.2, z: -1.5, front: true }, // Roda dianteira esquerda
            { x: 1.2, z: -1.5, front: true },  // Roda dianteira direita
            { x: -1.2, z: 1.5, front: false }, // Roda traseira esquerda
            { x: 1.2, z: 1.5, front: false }   // Roda traseira direita
        ];

        // Lista pra guardar as rodas
        const wheels = [];

        // Pra cada posição, cria uma roda
        wheelPositions.forEach(pos => {
            // Cria a roda com a forma e o material
            const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);

            // Coloca a roda na posição certa
            wheel.position.set(pos.x, 0.3, pos.z);

            // Faz a roda lançar sombra
            wheel.castShadow = true;

            // Adiciona a roda ao grupo do carro
            car.add(wheel);

            // Guarda a roda na lista com suas infos
            wheels.push({
                mesh: wheel, // A roda em si
                front: pos.front, // É roda da frente ou não
                originalPosition: { x: pos.x, z: pos.z } // Posição inicial
            });
        });

        // Adiciona a lista de rodas ao carro
        car.wheels = wheels;

        // Ângulo inicial de virar as rodas
        car.steerAngle = 0;

        // Rotação inicial das rodas (pra girar quando o carro anda)
        car.wheelRotation = 0;

        // Retorna o carro completo
        return car;
    }

    // Função que atualiza as rodas do carro (visual de movimento)
    function updateCarWheels(car, rotation, speed) {
        // Faz as rodas girarem com base na velocidade
        car.wheelRotation += speed * 0.5;

       

        // Atualiza cada roda
        car.wheels.forEach(wheel => {
            // Se for roda da frente, vira pro lado certo
            if (wheel.front) {
                wheel.mesh.rotation.y = car.steerAngle;
            }
            // Faz a roda girar pra frente ou pra trás
            wheel.mesh.rotation.x = car.wheelRotation;
        });
    }

    // Função que cria fumaça pro nitro (efeito visual)
    function createSmoke(x, z, rotation) {
        // Cria um grupo pra juntar as partículas de fumaça
        const smoke = new THREE.Group();

        // Quantidade de partículas na fumaça
        const particleCount = 5;

        // Tamanho de cada partícula
        const size = 0.3;

        // Cria cada partícula
        for (let i = 0; i < particleCount; i++) {
            // Forma da partícula (esfera pequena)
            const particleGeometry = new THREE.SphereGeometry(size, 8, 8);

            // Material da partícula (cinza, meio transparente)
            const particleMaterial = new THREE.MeshBasicMaterial({
                color: 0xaaaaaa, // Cor cinza
                transparent: true, // Permite transparência
                opacity: 0.8 // Meio transparente
            });

            // Cria a partícula
            const particle = new THREE.Mesh(particleGeometry, particleMaterial);

            // Coloca a partícula em uma posição aleatória ao redor
            const angle = Math.random() * Math.PI * 2; // Ângulo aleatório
            const radius = Math.random() * 0.5; // Distância aleatória
            particle.position.set(
                Math.cos(angle) * radius, // Posição X
                Math.random() * 0.1, // Altura aleatória
                Math.sin(angle) * radius // Posição Z
            );

            // Adiciona a partícula ao grupo de fumaça
            smoke.add(particle);
        }

        // Define a posição inicial da fumaça (atrás do carro)
        const offset = new THREE.Vector3(0, 0.5, 1.5);

        // Ajusta a posição com base na rotação do carro
        offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);

        // Coloca a fumaça na posição certa
        smoke.position.set(x + offset.x, 0, z + offset.z);

        // Adiciona infos pra controlar a fumaça
        smoke.userData = {
            life: 1.0, // Tempo de vida da fumaça
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.1, // Velocidade aleatória em X
                Math.random() * 0.1 + 0.1, // Velocidade pra cima
                (Math.random() - 0.5) * 0.1 // Velocidade aleatória em Z
            )
        };

        // Adiciona a fumaça na cena do jogo
        window.scene.add(smoke);

        // Guarda a fumaça na lista de partículas
        window.smokeParticles.push(smoke);
    }

    // Função que atualiza as partículas de fumaça a cada frame
    function updateSmoke(delta) {
        // Passa por todas as partículas de fumaça, de trás pra frente
        for (let i = window.smokeParticles.length - 1; i >= 0; i--) {
            const smoke = window.smokeParticles[i];

            // Reduz o tempo de vida da fumaça
            smoke.userData.life -= delta * 0.5;

            // Se a fumaça "morreu", remove ela
            if (smoke.userData.life <= 0) {
                window.scene.remove(smoke); // Tira da cena
                window.smokeParticles.splice(i, 1); // Tira da lista
                continue;
            }

            // Move a fumaça com base na velocidade
            smoke.position.x += smoke.userData.velocity.x;
            smoke.position.y += smoke.userData.velocity.y;
            smoke.position.z += smoke.userData.velocity.z;

            // Aumenta o tamanho da fumaça conforme ela "envelhece"
            const scale = 1 + (1 - smoke.userData.life) * 2;
            smoke.scale.set(scale, scale, scale);

            // Atualiza a transparência de cada partícula
            smoke.children.forEach(particle => {
                particle.material.opacity = smoke.userData.life * 0.6;
            });
        }
    }

    // Associa as funções ao objeto window pra usar em outros lugares
    window.createCarModel = createCarModel;
    window.updateCarWheels = updateCarWheels;
    window.createSmoke = createSmoke;
    window.updateSmoke = updateSmoke;