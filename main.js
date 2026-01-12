import * as THREE from 'three';

// --- Configuration ---
const CONFIG = {
    colors: {
        background: 0x0a0a0a,
        wireframe: 0xff7315, // Porsche Lava Orange
        particles: 0x00e5ff // Cyan
    },
    camera: {
        fov: 75,
        near: 0.1,
        far: 1000,
        posZ: 5
    }
};

// --- State ---
const state = {
    mouseX: 0,
    mouseY: 0,
    targetRotationX: 0,
    targetRotationY: 0,
    // Camera State
    isIntroComplete: false,
    targetCameraPos: { x: 0, y: 0, z: 5 },
    currentCameraPos: { x: 0, y: 0, z: 5 }
};

// --- Three.js Setup ---
const canvas = document.querySelector('#webgl-canvas');
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.colors.background);
scene.fog = new THREE.FogExp2(CONFIG.colors.background, 0.05);

const camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, window.innerWidth / window.innerHeight, CONFIG.camera.near, CONFIG.camera.far);
camera.position.z = CONFIG.camera.posZ;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// --- Objects ---
// 1. Main Abstract Form (The "Engine")
const geometry = new THREE.IcosahedronGeometry(1.5, 1);
const material = new THREE.MeshBasicMaterial({
    color: CONFIG.colors.wireframe,
    wireframe: true,
    transparent: true,
    opacity: 0.8
});
const mainMesh = new THREE.Mesh(geometry, material);
scene.add(mainMesh);

// 2. Particle Field (The "Data Stream")
const particlesGeometry = new THREE.BufferGeometry();
const particlesCount = 2000;
const posArray = new Float32Array(particlesCount * 3);

for (let i = 0; i < particlesCount * 3; i++) {
    posArray[i] = (Math.random() - 0.5) * 20;
}

particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const particlesMaterial = new THREE.PointsMaterial({
    size: 0.02,
    color: CONFIG.colors.particles,
    transparent: true,
    opacity: 0.5
});
const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
scene.add(particlesMesh);

// --- Interaction ---
document.addEventListener('mousemove', (event) => {
    state.mouseX = (event.clientX / window.innerWidth) * 2 - 1;
    state.mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
    const elapsedTime = clock.getElapsedTime();

    // Rotate Main Mesh
    mainMesh.rotation.y = elapsedTime * 0.2;
    mainMesh.rotation.x = elapsedTime * 0.1;

    // Parallax Effect
    state.targetRotationX = state.mouseY * 0.5;
    state.targetRotationY = state.mouseX * 0.5;

    mainMesh.rotation.x += 0.05 * (state.targetRotationX - mainMesh.rotation.x);
    mainMesh.rotation.y += 0.05 * (state.targetRotationY - mainMesh.rotation.y);

    // Particle Wave
    particlesMesh.rotation.y = -elapsedTime * 0.05;
    particlesMesh.rotation.x = state.mouseY * 0.1;

    // --- Camera Interpolation (Scroll) ---
    if (state.isIntroComplete) {
        // Smoothly move camera towards target position
        state.currentCameraPos.x += (state.targetCameraPos.x - state.currentCameraPos.x) * 0.05;
        state.currentCameraPos.y += (state.targetCameraPos.y - state.currentCameraPos.y) * 0.05;
        state.currentCameraPos.z += (state.targetCameraPos.z - state.currentCameraPos.z) * 0.05;

        camera.position.set(
            state.currentCameraPos.x,
            state.currentCameraPos.y,
            state.currentCameraPos.z
        );
        camera.lookAt(0, 0, 0);
    }

    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

animate();

// --- GSAP: Ignition Sequence ---
window.addEventListener('load', () => {
    // --- Animation Sequence (Ignition) ---
    const hasVisited = sessionStorage.getItem('visited');
    const loader = document.querySelector('.loader');
    const heroContent = document.querySelector('.hero-content');
    const hudNav = document.querySelector('.hud-nav');

    if (hasVisited) {
        // Skip animation
        if (loader) loader.style.display = 'none';

        // Set camera to final position immediately
        camera.position.set(0, 0, 5);
        camera.lookAt(0, 0, 0);

        // Show content
        if (heroContent) {
            gsap.set(heroContent, { opacity: 1, y: 0 });
        }
        if (hudNav) {
            gsap.set(hudNav, { opacity: 1, y: 0 });
        }

        // Start idle animation
        gsap.to(camera.position, {
            y: 0.5,
            duration: 4,
            yoyo: true,
            repeat: -1,
            ease: "sine.inOut"
        });

    } else {
        // Run full animation
        const tl = gsap.timeline({
            onComplete: () => {
                sessionStorage.setItem('visited', 'true');
                state.isIntroComplete = true; // Enable scroll control
            }
        });

        tl.to('.needle', {
            rotation: 180,
            duration: 1.5,
            ease: "power2.inOut",
            onUpdate: function () {
                const progress = this.progress();
                const rpm = Math.floor(progress * 8000);
                document.querySelector('.rpm-text').textContent = `${rpm} RPM`;
            }
        })
            .to('.needle', {
                rotation: 180, // Idle RPM (approx 1000)
                duration: 0.5,
                ease: "elastic.out(0.5, 0.3)"
            })
            .to('.loader', {
                opacity: 0,
                duration: 0.5,
                onComplete: () => {
                    if (loader) loader.style.display = 'none';
                }
            })
            .to(camera.position, {
                z: 5,
                duration: 2,
                ease: "power3.out"
            }, "-=0.5")
            .from('.hero-content', {
                opacity: 0,
                y: 50,
                duration: 1
            }, "-=1.5")
            .from('.hud-nav', {
                opacity: 0,
                y: -20,
                duration: 1
            }, "-=1.5");
    }

    // --- HUD Time Update ---
    function updateTime() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour12: false });
        const timeElement = document.getElementById('time-display');
        if (timeElement) {
            timeElement.textContent = timeString;
        }
    }
    setInterval(updateTime, 1000);
    updateTime();

    // --- Resize Handler ---
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // --- Horizontal Scroll Interactions (Gallery) ---
    const galleryContainer = document.querySelector('.gallery-container');

    if (galleryContainer) {
        // 1. Wheel to Horizontal Scroll
        galleryContainer.addEventListener('wheel', (evt) => {
            evt.preventDefault();
            galleryContainer.scrollLeft += evt.deltaY;
        });

        // 2. Drag to Scroll
        let isDown = false;
        let startX;
        let scrollLeft;

        galleryContainer.addEventListener('mousedown', (e) => {
            isDown = true;
            galleryContainer.classList.add('active'); // Add class for 'grabbing' cursor
            startX = e.pageX - galleryContainer.offsetLeft;
            scrollLeft = galleryContainer.scrollLeft;
            galleryContainer.style.cursor = 'grabbing';
        });

        galleryContainer.addEventListener('mouseleave', () => {
            isDown = false;
            galleryContainer.classList.remove('active');
            galleryContainer.style.cursor = 'grab';
        });

        galleryContainer.addEventListener('mouseup', () => {
            isDown = false;
            galleryContainer.classList.remove('active');
            galleryContainer.style.cursor = 'grab';
        });

        galleryContainer.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - galleryContainer.offsetLeft;
            const walk = (x - startX) * 2; // Scroll-fast
            galleryContainer.scrollLeft = scrollLeft - walk;
        });

        // Set initial cursor
        galleryContainer.style.cursor = 'grab';
    }

    // --- Phase 3: Glovebox Interaction ---
    const gloveboxToggle = document.getElementById('glovebox-toggle');
    const gloveboxClose = document.getElementById('glovebox-close');
    const gloveboxOverlay = document.getElementById('glovebox');

    if (gloveboxToggle && gloveboxOverlay) {
        gloveboxToggle.addEventListener('click', () => {
            gloveboxOverlay.classList.add('active');
            if (canvas) canvas.classList.add('blur-bg');
        });
    }

    if (gloveboxClose && gloveboxOverlay) {
        gloveboxClose.addEventListener('click', () => {
            gloveboxOverlay.classList.remove('active');
            if (canvas) canvas.classList.remove('blur-bg');
        });
    }

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && gloveboxOverlay && gloveboxOverlay.classList.contains('active')) {
            gloveboxOverlay.classList.remove('active');
            if (canvas) canvas.classList.remove('blur-bg');
        }
    });

    // --- Phase 4: Scroll-Linked Camera Movement ---
    function updateCameraOnScroll() {
        if (!state.isIntroComplete) return; // Don't interfere with intro

        const scrollY = window.scrollY;
        const maxScroll = document.body.scrollHeight - window.innerHeight;
        const scrollProgress = Math.min(Math.max(scrollY / maxScroll, 0), 1);

        // Define Camera States
        const startPos = { x: 0, y: 0, z: 5 }; // Hero: Chase View
        const endPos = { x: 4, y: 2, z: 4 };   // Bottom: Side Profile

        // Interpolate
        state.targetCameraPos.x = startPos.x + (endPos.x - startPos.x) * scrollProgress;
        state.targetCameraPos.y = startPos.y + (endPos.y - startPos.y) * scrollProgress;
        state.targetCameraPos.z = startPos.z + (endPos.z - startPos.z) * scrollProgress;
    }

    window.addEventListener('scroll', updateCameraOnScroll);

    // Initial call to set state based on current scroll (in case of reload)
    // We delay this slightly to ensure intro flag is respected
    setTimeout(updateCameraOnScroll, 100);
});
