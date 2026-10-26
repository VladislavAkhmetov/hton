import * as THREE from 'three';
import { RetroRenderer } from './core/Renderer';
import { VehiclePhysics } from './physics/VehiclePhysics';
import { RoadNetwork } from './world/RoadNetwork';
import { Environment } from './world/Environment';
import { WeatherSystem } from './world/WeatherSystem';
import { CabinView } from './cabin/CabinView';
import { SoundEngine } from './audio/SoundEngine';
import { MissionManager } from './game/MissionManager';
import { InputManager } from './core/InputManager';
import { MapOverlay } from './game/MapOverlay';

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private retroRenderer: RetroRenderer;

  private physics: VehiclePhysics;
  private roadNetwork: RoadNetwork;
  private environment: Environment;
  private weather: WeatherSystem;
  private cabinView: CabinView;
  private soundEngine: SoundEngine;
  private mission: MissionManager;
  private input: InputManager;
  private mapOverlay: MapOverlay;

  private clock: THREE.Clock;
  private audioInitialized: boolean = false;

  constructor() {
    const appEl = document.getElementById('app') || document.body;

    // 1. Scene & Camera setup - 52 deg FOV matches the focal length of reference image2
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 900);

    // 2. Retro Renderer
    this.retroRenderer = new RetroRenderer(appEl);

    // 3. World & Road Network
    this.roadNetwork = new RoadNetwork();
    this.scene.add(this.roadNetwork.roadGroup);

    // 4. Vegetation & Telegraph Poles
    this.environment = new Environment(this.roadNetwork);
    this.scene.add(this.environment.group);

    // 5. Weather & Lighting (Defaults to clear bright daylight)
    this.weather = new WeatherSystem(this.scene);

    // 6. Bukhanka Physics Model
    this.physics = new VehiclePhysics();
    // Spawn vehicle at Zarechye facing along the road (yaw = 0)
    this.physics.setPosition(0, 0.68, 5, 0);

    // 7. Interactive Cockpit & Cabin View
    this.cabinView = new CabinView();

    // 8. Audio Synthesizer Engine
    this.soundEngine = new SoundEngine();

    // 9. Postal Delivery Mission Manager
    this.mission = new MissionManager(this.roadNetwork);

    // 10. Paper Map & HUD UI
    this.mapOverlay = new MapOverlay();

    // 11. Input Manager
    this.input = new InputManager(this.retroRenderer.renderer.domElement, this.cabinView);
    this.setupInputHandlers();

    this.clock = new THREE.Clock();

    // Unlock Web Audio on first user interaction
    const unlockAudio = () => {
      if (!this.audioInitialized) {
        this.soundEngine.init();
        this.audioInitialized = true;
      }
    };
    window.addEventListener('keydown', unlockAudio, { once: true });
    window.addEventListener('mousedown', unlockAudio, { once: true });

    // Window resize handler
    window.addEventListener('resize', this.onResize.bind(this));

    // Start main game loop
    this.animate();
  }

  private setupInputHandlers() {
    this.input.onHorn = () => {
      this.soundEngine.playHorn();
      this.mission.registerHornPress();

      const completedStop = this.mission.checkRitual(this.physics);
      if (completedStop) {
        this.soundEngine.playTapeClick();
        this.mapOverlay.renderPaperMap(this.mission.stops);
      }
    };

    this.input.onToggleHandbrake = () => {
      this.physics.toggleHandbrake();
      this.soundEngine.playGearClunk();

      const completedStop = this.mission.checkRitual(this.physics);
      if (completedStop) {
        this.mapOverlay.renderPaperMap(this.mission.stops);
      }
    };

    this.input.onToggle4WD = () => {
      this.physics.toggle4WD();
      this.soundEngine.playGearClunk();
    };

    this.input.onToggleLowRange = () => {
      this.physics.toggleLowRange();
      this.soundEngine.playGearClunk();
    };

    this.input.onToggleWipers = () => {
      this.cabinView.toggleWipers();
      this.soundEngine.playTapeClick();
    };

    this.input.onNextTrack = () => {
      this.soundEngine.nextTrack();
    };

    this.input.onToggleMap = () => {
      this.mapOverlay.toggleMap();
    };

    this.input.onNextWeather = () => {
      this.weather.nextWeather();
    };

    this.input.onToggleRetroMode = () => {
      this.retroRenderer.toggleRetroMode();
    };

    this.input.onShiftGear = (gear: number) => {
      this.physics.shiftGear(gear);
      this.soundEngine.playGearClunk();
    };
  }

  private onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.cabinView.onResize(this.camera.aspect);
  }

  private animate() {
    requestAnimationFrame(this.animate.bind(this));

    const dt = Math.min(this.clock.getDelta(), 0.05);

    // 1. Process user driving inputs
    this.input.update(dt, this.physics);

    // 2. Physics simulation step
    this.physics.update(dt, (x, z) => this.roadNetwork.querySurface(x, z));

    // 3. Update Weather and particles
    this.weather.update(dt, this.physics.position);

    // 4. Orient Vehicle & Camera (Driver's eye view from Bukhanka cabin)
    const chassisQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(this.physics.pitch, this.physics.yaw, this.physics.roll, 'YXZ')
    );

    // Driver's eye position in vehicle space (left seat, above front axle)
    const driverSeatOffset = new THREE.Vector3(-0.35, 1.42, 0.35);
    const cameraWorldPos = driverSeatOffset.clone().applyQuaternion(chassisQuat).add(this.physics.position);

    // Dynamic head bobbing and bump shock
    cameraWorldPos.add(this.physics.headOffset.clone().applyQuaternion(chassisQuat));
    this.camera.position.copy(cameraWorldPos);

    // Camera rotation matches vehicle chassis + slight forward pitch looking down onto the road
    const totalEuler = new THREE.Euler(
      this.physics.pitch + this.physics.headRot.x - 0.035,
      this.physics.yaw,
      this.physics.roll + this.physics.headRot.z,
      'YXZ'
    );
    this.camera.quaternion.setFromEuler(totalEuler);

    // 5. Update Cabin Instruments, Wipers & Windshield Rain
    this.cabinView.update(dt, this.physics, this.weather.rainIntensity);

    // 6. Update Real-time Procedural Audio
    if (this.audioInitialized) {
      this.soundEngine.update(
        this.physics.engineRpm,
        this.physics.speedKmh,
        this.physics.engineLoad,
        this.physics.currentSurface.surfaceType,
        this.weather.rainIntensity,
        this.physics.bumpShock
      );
    }

    // 7. Update Mission system & Dialogue
    this.mission.update(dt);

    // 8. Update UI Overlays
    const tooltipText = this.input.hoveredHotspot ? this.input.hoveredHotspot.tooltip : null;
    this.mapOverlay.update(this.mission, this.physics, tooltipText);

    // 9. Update Billboard foliage facing camera
    this.environment.update(this.camera);

    // 10. Render Scene (3D World + Bukhanka Cabin HUD Layer)
    this.retroRenderer.render(this.scene, this.camera, this.cabinView.hudScene, this.cabinView.hudCamera);
  }
}

// Start game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
