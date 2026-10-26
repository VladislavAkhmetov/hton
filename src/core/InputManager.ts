import * as THREE from 'three';
import { VehiclePhysics } from '../physics/VehiclePhysics';
import { CabinView, InteractiveCockpitHotspot } from '../cabin/CabinView';

export class InputManager {
  private keys: Record<string, boolean> = {};

  // Callbacks for events
  public onHorn?: () => void;
  public onToggleWipers?: () => void;
  public onToggle4WD?: () => void;
  public onToggleLowRange?: () => void;
  public onToggleHandbrake?: () => void;
  public onToggleMap?: () => void;
  public onNextTrack?: () => void;
  public onNextWeather?: () => void;
  public onToggleRetroMode?: () => void;
  public onShiftGear?: (gear: number) => void;

  public hoveredHotspot: InteractiveCockpitHotspot | null = null;

  constructor(private domElement: HTMLElement, private cabinView: CabinView) {
    this.setupListeners();
  }

  private setupListeners() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;

      switch (e.code) {
        case 'KeyH':
          this.cabinView.triggerHornPress();
          this.onHorn?.();
          break;
        case 'Space':
          e.preventDefault();
          this.onToggleHandbrake?.();
          break;
        case 'KeyP':
          this.onToggleWipers?.();
          break;
        case 'Digit1':
          this.onShiftGear?.(1);
          break;
        case 'Digit2':
          this.onShiftGear?.(2);
          break;
        case 'Digit3':
          this.onShiftGear?.(3);
          break;
        case 'Digit4':
          this.onToggle4WD?.();
          break;
        case 'KeyL':
          this.onToggleLowRange?.();
          break;
        case 'KeyM':
          this.onToggleMap?.();
          break;
        case 'KeyC':
          this.onNextTrack?.();
          break;
        case 'F2':
          e.preventDefault();
          this.onNextWeather?.();
          break;
        case 'F3':
          e.preventDefault();
          this.onToggleRetroMode?.();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    this.domElement.addEventListener('mousemove', (e) => {
      const rect = this.domElement.getBoundingClientRect();
      const normX = (e.clientX - rect.left) / rect.width;
      const normY = (e.clientY - rect.top) / rect.height;

      this.checkHotspotHover(normX, normY);
    });

    this.domElement.addEventListener('mousedown', (e) => {
      if (e.button === 0 && this.hoveredHotspot) {
        this.triggerHotspot(this.hoveredHotspot);
      }
    });
  }

  private checkHotspotHover(normX: number, normY: number) {
    for (const hs of this.cabinView.hotspots) {
      if (normX >= hs.screenArea.xMin && normX <= hs.screenArea.xMax &&
          normY >= hs.screenArea.yMin && normY <= hs.screenArea.yMax) {
        this.hoveredHotspot = hs;
        this.domElement.style.cursor = 'pointer';
        return;
      }
    }
    this.hoveredHotspot = null;
    this.domElement.style.cursor = 'default';
  }

  private triggerHotspot(hs: InteractiveCockpitHotspot) {
    switch (hs.id) {
      case 'horn':
        this.cabinView.triggerHornPress();
        this.onHorn?.();
        break;
      case 'lever_4wd':
        this.onToggle4WD?.();
        break;
      case 'lever_low':
        this.onToggleLowRange?.();
        break;
      case 'handbrake':
        this.onToggleHandbrake?.();
        break;
      case 'wipers':
      case 'switch_wipers':
        this.onToggleWipers?.();
        break;
      case 'radio':
        this.onNextTrack?.();
        break;
      case 'map':
        this.onToggleMap?.();
        break;
    }
  }

  public update(dt: number, physics: VehiclePhysics) {
    // 1. Throttle / Accelerator
    if (this.keys['KeyW'] || this.keys['ArrowUp']) {
      physics.throttleInput = THREE.MathUtils.lerp(physics.throttleInput, 1.0, dt * 8.0);
    } else {
      physics.throttleInput = THREE.MathUtils.lerp(physics.throttleInput, 0.0, dt * 10.0);
    }

    // 2. Brake / Reverse
    if (this.keys['KeyS'] || this.keys['ArrowDown']) {
      if (physics.speedKmh > 2.0) {
        physics.brakeInput = THREE.MathUtils.lerp(physics.brakeInput, 1.0, dt * 10.0);
      } else {
        physics.brakeInput = 0;
        physics.shiftGear(-1);
        physics.throttleInput = THREE.MathUtils.lerp(physics.throttleInput, 0.8, dt * 6.0);
      }
    } else {
      physics.brakeInput = THREE.MathUtils.lerp(physics.brakeInput, 0.0, dt * 12.0);
      if (physics.currentGear === -1 && !this.keys['KeyS'] && !this.keys['ArrowDown']) {
        physics.shiftGear(1); // Return to 1st gear
      }
    }

    // 3. Steering with worm-gear steering inertia
    const steerSpeed = 2.4;
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) {
      physics.steerAngle = Math.max(-1.0, physics.steerAngle - steerSpeed * dt);
    } else if (this.keys['KeyD'] || this.keys['ArrowRight']) {
      physics.steerAngle = Math.min(1.0, physics.steerAngle + steerSpeed * dt);
    } else {
      // Caster returning to center
      const returnRate = Math.max(1.8, Math.abs(physics.speedKmh) * 0.12);
      physics.steerAngle = THREE.MathUtils.lerp(physics.steerAngle, 0, dt * returnRate);
    }
  }
}
