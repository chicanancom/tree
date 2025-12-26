import * as THREE from 'three';
import './style.css';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

// --- Configuration ---
const CONFIG = {
    particleCount: 80000,
    treeHeight: 14,
    baseRadius: 9,
    layers: 3,
    rotationSpeed: 0.002,
    color1: new THREE.Color(0x11ff55),
    color2: new THREE.Color(0xffaa00),
    color3: new THREE.Color(0xff2200),
    snowParticleCount: 30000,
};

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.FogExp2(0x020205, 0.05);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 10, 20);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.getElementById('app')?.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.5;

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

const pointLight1 = new THREE.PointLight(0xffaa00, 2, 20);
pointLight1.position.set(5, 5, 5);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x00ff88, 1.5, 15);
pointLight2.position.set(-5, 8, -5);
scene.add(pointLight2);

// --- Post-Processing (Bloom) ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.2,  // Hơi giảm cường độ sáng
    0.5,  // Tăng bán kính nhòe
    1.5   // Tăng ngưỡng (threshold) để chỉ những hạt thật sáng mới tỏa sáng
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- Particle Texture ---
function createParticleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const context = canvas.getContext('2d')!;

    const gradient = context.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    context.fillStyle = gradient;
    context.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// --- Particle Generation ---
function createTreeParticles(t1: number = 0.33, t2: number = 0.66) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(CONFIG.particleCount * 3);
    const colors = new Float32Array(CONFIG.particleCount * 3);
    const sizes = new Float32Array(CONFIG.particleCount);
    const phases = new Float32Array(CONFIG.particleCount);
    const intensities = new Float32Array(CONFIG.particleCount);

    for (let i = 0; i < CONFIG.particleCount; i++) {
        const p = Math.random();
        phases[i] = Math.random() * Math.PI * 2;
        intensities[i] = 1.0; // Default intensity

        if (p > 0.35) {

            // Phân bố thành 5 tầng
            // Sử dụng t1 và t2 để chia nhóm:
            // - Nhóm Dưới (Layers 0, 1): Từ 0 đến t1
            // - Nhóm Giữa (Layer 2): Từ t1 đến t2
            // - Nhóm Trên (Layers 3, 4): Từ t2 đến 1.0

            let layerIdx;
            const rand = Math.random(); // Need to define rand here
            if (rand < t1) {
                // Chia đôi vùng dưới cho Layer 0 và 1
                layerIdx = (rand < t1 * 0.5) ? 0 : 1;
            } else if (rand < t2) {
                layerIdx = 2;
            } else {
                // Chia đôi vùng trên cho Layer 3 và 4
                const upperRel = (rand - t2) / (1.0 - t2);
                layerIdx = (upperRel < 0.5) ? 3 : 4;
            }

            let y, progress, layerMaxRadius, yStart, yEnd;
            const h = CONFIG.treeHeight;

            switch (layerIdx) {
                case 0: // Tầng 1 (Gốc)
                    yStart = h * 0.15;
                    yEnd = h * 0.50; // Increased overlap
                    layerMaxRadius = CONFIG.baseRadius;
                    break;
                case 1: // Tầng 2
                    yStart = h * 0.30; // Lowered start
                    yEnd = h * 0.65; // Increased end
                    layerMaxRadius = CONFIG.baseRadius * 0.85;
                    break;
                case 2: // Tầng 3
                    yStart = h * 0.45; // Lowered start
                    yEnd = h * 0.80; // Increased end
                    layerMaxRadius = CONFIG.baseRadius * 0.70;
                    break;
                case 3: // Tầng 4
                    yStart = h * 0.60; // Lowered start
                    yEnd = h * 0.95; // Increased end
                    layerMaxRadius = CONFIG.baseRadius * 0.50;
                    break;
                case 4: // Tầng 5 (Ngọn)
                    yStart = h * 0.75; // Lowered start
                    yEnd = h * 1.10; // Increased end
                    layerMaxRadius = CONFIG.baseRadius * 0.30;
                    break;
                default: // Fallback safety
                    yStart = h * 0.15;
                    yEnd = h * 0.50;
                    layerMaxRadius = CONFIG.baseRadius;
                    break;
            }

            // Sinh tọa độ Y trong từng tầng (giữ nguyên logic cũ)
            // Mật độ hạt tăng dần theo CẤP SỐ NHÂN từ đỉnh xuống đáy
            const randY = Math.log(1 + (Math.exp(4.0) - 1) * Math.random()) / 4.0;
            y = yStart + (1.0 - randY) * (yEnd - yStart);

            // Tiến trình trong tầng: 0 ở đáy tầng, 1 ở đỉnh tầng
            progress = (y - yStart) / (yEnd - yStart);

            // HÌNH DÁNG ĐƯỜNG SINH
            // y = sqrt(x)
            const d = 1.0 - progress;
            const silhouette = Math.pow(d, 2.2);

            // đẩy hạt ra gần mép để tạo viền tán
            const edgeBias = 0.7 + 0.3 * Math.pow(Math.random(), 0.15);

            // Bán kính ngọn
            const minRadiusAtTop = 0;

            // Bán kính cuối cùng của hạt tại độ cao y
            const radius =
                (silhouette * (layerMaxRadius - minRadiusAtTop) + minRadiusAtTop) *
                edgeBias;

            // Phân bố ngẫu nhiên quanh trục Y
            const angle = Math.random() * Math.PI * 2;
            const noise = (Math.random() - 0.5) * 0.3;

            positions[i * 3 + 0] = Math.cos(angle) * (radius + noise);
            positions[i * 3 + 1] = y + (Math.random() - 0.5) * 0.1;
            positions[i * 3 + 2] = Math.sin(angle) * (radius + noise);
            const globalProgress = y / CONFIG.treeHeight;
            let col = new THREE.Color();

            if (Math.random() > 0.985) {
                col = CONFIG.color3;
                intensities[i] = 4.0;
            } else if (Math.random() > 0.96) {
                col = CONFIG.color2;
                intensities[i] = 2.0;
            } else {
                col.copy(CONFIG.color1)
                    .offsetHSL(0, 0, (1.0 - globalProgress) * 0.2 - 0.1);
            }

            colors[i * 3 + 0] = col.r;
            colors[i * 3 + 1] = col.g;
            colors[i * 3 + 2] = col.b;
            const localSizeFactor = 7 - progress * 1;
            const globalSizeFactor = 1.1 - globalProgress * 0.5;

            sizes[i] =
                (Math.random() * 0.08 + 0.05) *
                localSizeFactor *
                globalSizeFactor;
            if (intensities[i] > 1.0) sizes[i] *= 1.3;

        } else if (p > 0.0008) {
            const radius = Math.random() * CONFIG.baseRadius * 10;
            const angle = Math.random() * Math.PI * 2;

            positions[i * 3 + 0] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
            positions[i * 3 + 2] = Math.sin(angle) * radius;

            colors[i * 3 + 0] = 0.8;
            colors[i * 3 + 1] = 0.9;
            colors[i * 3 + 2] = 1.0;

            sizes[i] = Math.random() * 0.9;
            intensities[i] = 2.5;

        } else {
            const angle = Math.random() * Math.PI * 2;
            const starPoints = 5;
            const innerRadius = 0.4;
            const outerRadius = 1.1;

            const section = (angle / (Math.PI * 2)) * starPoints;
            const interpolation = (section - Math.floor(section)) * 2;
            const rBase = interpolation < 1
                ? THREE.MathUtils.lerp(outerRadius, innerRadius, interpolation)
                : THREE.MathUtils.lerp(innerRadius, outerRadius, interpolation - 1);

            const radius = rBase * (0.95 + Math.random() * 0.1);

            if (Math.random() > 0.5) {
                positions[i * 3 + 0] = Math.cos(angle) * radius;
                positions[i * 3 + 1] = CONFIG.treeHeight + Math.sin(angle) * radius + 0.6;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
            } else {
                positions[i * 3 + 0] = (Math.random() - 0.5) * 0.15;
                positions[i * 3 + 1] = CONFIG.treeHeight + Math.sin(angle) * radius + 0.6;
                positions[i * 3 + 2] = Math.cos(angle) * radius;
            }

            colors[i * 3 + 0] = 1.0;
            colors[i * 3 + 1] = 0.85;
            colors[i * 3 + 2] = 0.2;

            sizes[i] = 0.6 + Math.random() * 0.8;
            intensities[i] = 6.0;
        }
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('phase', new THREE.BufferAttribute(phases, 1));
    geometry.setAttribute('intensity', new THREE.BufferAttribute(intensities, 1));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uTexture: { value: createParticleTexture() }
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexShader: `
            uniform float uTime;
            attribute float size;
            attribute float phase;
            attribute float intensity;
            attribute vec3 color;
            varying vec3 vColor;
            varying float vOpacity;
            varying float vIntensity;

            void main() {
                vColor = color;
                vIntensity = intensity;
                float twinkle = sin(uTime * 3.0 + phase) * 0.5 + 0.5;
                vOpacity = 0.4 + 0.6 * twinkle;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z) * (0.8 + 0.4 * twinkle);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform sampler2D uTexture;
            varying vec3 vColor;
            varying float vOpacity;
            varying float vIntensity;
            void main() {
                vec4 texColor = texture2D(uTexture, gl_PointCoord);
                if (texColor.a < 0.2) discard;
                gl_FragColor = vec4(vColor * vIntensity, vOpacity * texColor.a);
            }
        `
    });

    return new THREE.Points(geometry, material);
}

function createSnowParticles() {
    const geometry = new THREE.BufferGeometry();
    const count = CONFIG.snowParticleCount;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 40;
        positions[i * 3 + 1] = Math.random() * 30;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 40;

        velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.05;
        velocities[i * 3 + 1] = -(Math.random() * 0.05 + 0.02);
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uTexture: { value: createParticleTexture() }
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexShader: `
            uniform float uTime;
            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = 0.2 * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
            uniform sampler2D uTexture;
            void main() {
                vec4 texColor = texture2D(uTexture, gl_PointCoord);
                if (texColor.a < 0.2) discard;
                // Nhân màu với 3.0 để phát sáng qua Bloom
                gl_FragColor = vec4(vec3(0.9, 0.95, 1.0) * 3.0, texColor.a * 0.8);
            }
        `
    });

    return { points: new THREE.Points(geometry, material), velocities };
}

let tree = createTreeParticles();
scene.add(tree);



const { points: snow, velocities: snowVelocities } = createSnowParticles();
snow.geometry.setDrawRange(0, 15000);
scene.add(snow);

// --- UI Integration ---
const bloomThresholdInput = document.getElementById('bloom-threshold') as HTMLInputElement;
const bloomThresholdVal = document.getElementById('bloom-threshold-val') as HTMLElement;
const snowDensityInput = document.getElementById('snow-density') as HTMLInputElement;
const snowDensityVal = document.getElementById('snow-density-val') as HTMLElement;
const cameraSpeedInput = document.getElementById('camera-speed') as HTMLInputElement;
const cameraSpeedVal = document.getElementById('camera-speed-val') as HTMLElement;

let currentSnowDensity = 15000;

bloomThresholdInput.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    bloomPass.threshold = val;
    bloomThresholdVal.innerText = val.toFixed(2);
});

snowDensityInput.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value);
    currentSnowDensity = val;
    snowDensityVal.innerText = val.toString();
    snow.geometry.setDrawRange(0, val);
});

cameraSpeedInput.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    controls.autoRotateSpeed = val;
    cameraSpeedVal.innerText = val.toFixed(1);
});



// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    const time = Date.now() * 0.001;

    // Update uniforms
    if (tree.material instanceof THREE.ShaderMaterial) {
        tree.material.uniforms.uTime.value = time;
    }

    tree.rotation.y += CONFIG.rotationSpeed;

    // Pulsing lights
    pointLight1.intensity = 2 + Math.sin(time * 2) * 0.5;
    pointLight2.intensity = 1.5 + Math.cos(time * 1.5) * 0.3;

    // Snow Animation
    const positions = snow.geometry.attributes.position.array as Float32Array;
    // Only update active snow particles
    for (let i = 0; i < currentSnowDensity; i++) {
        positions[i * 3 + 0] += snowVelocities[i * 3 + 0];
        positions[i * 3 + 1] += snowVelocities[i * 3 + 1];
        positions[i * 3 + 2] += snowVelocities[i * 3 + 2];

        // Reset snow when it falls below ground
        if (positions[i * 3 + 1] < -2) {
            positions[i * 3 + 1] = 25;
            positions[i * 3 + 0] = (Math.random() - 0.5) * 40;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
        }
    }
    snow.geometry.attributes.position.needsUpdate = true;

    controls.update();
    composer.render();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});

animate();
