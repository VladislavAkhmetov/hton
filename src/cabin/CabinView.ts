import * as THREE from 'three';
import { VehiclePhysics } from '../physics/VehiclePhysics';

export interface InteractiveCockpitHotspot {
  id: string;
  name: string;
  screenArea: { xMin: number; xMax: number; yMin: number; yMax: number };
  action: () => void;
  tooltip: string;
}

export class CabinView {
  public hudScene: THREE.Scene;
  public hudCamera: THREE.OrthographicCamera;

  // Unified Rigid Cabin Group
  public cabinRoot: THREE.Group;

  // Cockpit base plane using the exact reference art from image2
  private cabinPlane: THREE.Mesh;
  private cabinTexture: THREE.Texture;

  // Rotating Steering Wheel & Hand Layer
  private wheelGroup: THREE.Group;
  private wheelMesh: THREE.Mesh;
  private hornPressZ: number = 0;

  // Working Speedometer Needle (centered on left dial)
  private speedoNeedle: THREE.Mesh;

  // Working Secondary Gauge Needle (centered on right dial)
  private tempNeedle: THREE.Mesh;

  // Dashboard Toggle Switches
  private switchWipers: THREE.Mesh;
  private switch4WD: THREE.Mesh;
  private switchLowRange: THREE.Mesh;
  private switchHandbrake: THREE.Mesh;

  // Dashboard Indicator Lamps (Светосигнальные лампы приборки)
  private lamp4WD: THREE.Mesh;
  private lampHandbrake: THREE.Mesh;
  private lampLowRange: THREE.Mesh;
  private lampHighBeam: THREE.Mesh;

  // Wiper blade on windshield
  public wipersActive: boolean = false;
  private wiperMesh: THREE.Mesh;
  private wiperAngle: number = 0;
  private wiperDirection: number = 1;

  // Headlights
  public headlightsOn: boolean = false;

  // Rain Drops on Windshield glass
  private rainCanvas: HTMLCanvasElement;
  private rainCtx: CanvasRenderingContext2D;
  private rainTexture: THREE.CanvasTexture;
  private rainPlane: THREE.Mesh;
  private rainDrops: { x: number; y: number; size: number; speed: number }[] = [];

  // Clickable Hotspots
  public hotspots: InteractiveCockpitHotspot[] = [];

  constructor() {
    this.hudScene = new THREE.Scene();

    const aspect = window.innerWidth / window.innerHeight;
    this.hudCamera = new THREE.OrthographicCamera(-aspect, aspect, 1, -1, 0.1, 25);
    this.hudCamera.position.set(0, 0, 5);
    this.hudCamera.lookAt(0, 0, 0);

    const loader = new THREE.TextureLoader();

    // 1. Rain Layer on Windshield (at z = -0.5, behind cabin frame)
    this.rainCanvas = document.createElement('canvas');
    this.rainCanvas.width = 512;
    this.rainCanvas.height = 256;
    this.rainCtx = this.rainCanvas.getContext('2d')!;

    this.rainTexture = new THREE.CanvasTexture(this.rainCanvas);
    this.rainTexture.magFilter = THREE.NearestFilter;
    this.rainTexture.minFilter = THREE.NearestFilter;

    const rainMat = new THREE.MeshBasicMaterial({
      map: this.rainTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
    this.rainPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.0 * aspect, 1.4), rainMat);
    this.rainPlane.position.set(0, 0.25, -0.5);
    this.hudScene.add(this.rainPlane);

    // 2. Unified Rigid Cabin Root Group (so all elements sway in unison)
    this.cabinRoot = new THREE.Group();
    this.hudScene.add(this.cabinRoot);

    // Exact Pixel-Art Bukhanka Cockpit from Image2 (at z = 0)
    const cabinCacheBust = Date.now();
    this.cabinTexture = loader.load(`/textures/cabin_ref.png?v=${cabinCacheBust}`);
    this.cabinTexture.magFilter = THREE.NearestFilter;
    this.cabinTexture.minFilter = THREE.NearestFilter;

    const cabinMat = new THREE.MeshBasicMaterial({
      map: this.cabinTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const cabinScale = Math.max(aspect, 1.25);
    this.cabinPlane = new THREE.Mesh(new THREE.PlaneGeometry(2.0 * cabinScale, 2.0 * cabinScale), cabinMat);
    this.cabinPlane.position.set(0, -0.05, 0);
    this.cabinRoot.add(this.cabinPlane);

    // 3. Rotating Steering Wheel & Hand Layer (at z = 1.0)
    this.wheelGroup = new THREE.Group();
    this.wheelGroup.position.set(-0.09, -0.71, 1.0);

    const wheelTex = loader.load(`/textures/wheel_hand.png?v=${cabinCacheBust}`);
    wheelTex.magFilter = THREE.NearestFilter;
    wheelTex.minFilter = THREE.NearestFilter;

    const wheelMat = new THREE.MeshBasicMaterial({
      map: wheelTex,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    const wheelW = (770 / 1024) * 2.0 * cabinScale;
    const wheelH = (404 / 1024) * 2.0 * cabinScale;

    const wheelGeom = new THREE.PlaneGeometry(wheelW, wheelH);
    // Pivot centered at steering column hub:
    const pivotOffsetX = (0.5 - 465 / 770) * wheelW;
    const pivotOffsetY = (255 / 404 - 0.5) * wheelH;
    wheelGeom.translate(pivotOffsetX, pivotOffsetY, 0);

    this.wheelMesh = new THREE.Mesh(wheelGeom, wheelMat);
    this.wheelGroup.add(this.wheelMesh);
    this.cabinRoot.add(this.wheelGroup);

    // 4. Working Speedometer Needle (centered on left dial at x = -0.258, y = -0.535, z = 0.8)
    const needleGeom = new THREE.PlaneGeometry(0.010, 0.088);
    needleGeom.translate(0, 0.044, 0);
    const needleMat = new THREE.MeshBasicMaterial({ color: 0xff3818, depthTest: false, depthWrite: false });
    this.speedoNeedle = new THREE.Mesh(needleGeom, needleMat);
    this.speedoNeedle.position.set(-0.258, -0.535, 0.8);
    this.cabinRoot.add(this.speedoNeedle);

    // 5. Working Secondary Gauge Needle (centered on right dial at x = +0.093, y = -0.535, z = 0.8)
    this.tempNeedle = new THREE.Mesh(needleGeom.clone().scale(0.85, 0.85, 0.85), needleMat);
    this.tempNeedle.position.set(0.093, -0.535, 0.8);
    this.cabinRoot.add(this.tempNeedle);

    // 6. Interactive Mechanical Toggle Switches on Dashboard (at z = 0.8)
    const switchGeom = new THREE.PlaneGeometry(0.024, 0.045);
    const switchMat = new THREE.MeshBasicMaterial({ color: 0xccd2d5, depthTest: false, depthWrite: false });

    // Wipers switch
    this.switchWipers = new THREE.Mesh(switchGeom, switchMat);
    this.switchWipers.position.set(0.28, -0.74, 0.8);
    this.cabinRoot.add(this.switchWipers);

    // 4WD switch
    this.switch4WD = new THREE.Mesh(switchGeom, switchMat.clone());
    this.switch4WD.position.set(0.36, -0.74, 0.8);
    this.cabinRoot.add(this.switch4WD);

    // Low Range switch
    this.switchLowRange = new THREE.Mesh(switchGeom, switchMat.clone());
    this.switchLowRange.position.set(0.44, -0.74, 0.8);
    this.cabinRoot.add(this.switchLowRange);

    // Handbrake lever
    this.switchHandbrake = new THREE.Mesh(new THREE.PlaneGeometry(0.032, 0.075), new THREE.MeshBasicMaterial({ color: 0x992211, depthTest: false, depthWrite: false }));
    this.switchHandbrake.position.set(0.52, -0.80, 0.8);
    this.cabinRoot.add(this.switchHandbrake);

    // 7. Soviet Indicator Lamps above switches (Round glowing jewel lenses)
    const lampGeom = new THREE.CircleGeometry(0.012, 12);
    
    // High-beam lamp (Blue)
    this.lampHighBeam = new THREE.Mesh(lampGeom, new THREE.MeshBasicMaterial({ color: 0x0a2235, depthTest: false, depthWrite: false }));
    this.lampHighBeam.position.set(0.28, -0.70, 0.82);
    this.cabinRoot.add(this.lampHighBeam);

    // 4x4 engaged lamp (Emerald Green)
    this.lamp4WD = new THREE.Mesh(lampGeom, new THREE.MeshBasicMaterial({ color: 0x0a3310, depthTest: false, depthWrite: false }));
    this.lamp4WD.position.set(0.36, -0.70, 0.82);
    this.cabinRoot.add(this.lamp4WD);

    // 4L Low-range lamp (Warm Amber)
    this.lampLowRange = new THREE.Mesh(lampGeom, new THREE.MeshBasicMaterial({ color: 0x331c0a, depthTest: false, depthWrite: false }));
    this.lampLowRange.position.set(0.44, -0.70, 0.82);
    this.cabinRoot.add(this.lampLowRange);

    // Handbrake warning lamp (Crimson Red)
    this.lampHandbrake = new THREE.Mesh(lampGeom, new THREE.MeshBasicMaterial({ color: 0x330a08, depthTest: false, depthWrite: false }));
    this.lampHandbrake.position.set(0.52, -0.73, 0.82);
    this.cabinRoot.add(this.lampHandbrake);

    // 8. Wiper blade on windshield
    const wiperMat = new THREE.MeshBasicMaterial({ color: 0x1e2022, depthTest: false, depthWrite: false });
    const wiperGeom = new THREE.PlaneGeometry(0.022, 0.65);
    wiperGeom.translate(0, 0.325, 0);

    this.wiperMesh = new THREE.Mesh(wiperGeom, wiperMat);
    this.wiperMesh.position.set(0.18, -0.24, 0.5);
    this.wiperMesh.rotation.z = Math.PI / 2.2;
    this.cabinRoot.add(this.wiperMesh);

    this.setupHotspots();
  }

  public onResize(aspect: number) {
    this.hudCamera.left = -aspect;
    this.hudCamera.right = aspect;
    this.hudCamera.updateProjectionMatrix();

    const cabinScale = Math.max(aspect, 1.25);
    this.cabinPlane.geometry.dispose();
    this.cabinPlane.geometry = new THREE.PlaneGeometry(2.0 * cabinScale, 2.0 * cabinScale);

    this.rainPlane.geometry.dispose();
    this.rainPlane.geometry = new THREE.PlaneGeometry(2.0 * aspect, 1.4);

    const wheelW = (770 / 1024) * 2.0 * cabinScale;
    const wheelH = (404 / 1024) * 2.0 * cabinScale;
    this.wheelMesh.geometry.dispose();
    const wheelGeom = new THREE.PlaneGeometry(wheelW, wheelH);
    const pivotOffsetX = (0.5 - 465 / 770) * wheelW;
    const pivotOffsetY = (255 / 404 - 0.5) * wheelH;
    wheelGeom.translate(pivotOffsetX, pivotOffsetY, 0);
    this.wheelMesh.geometry = wheelGeom;
  }

  private setupHotspots() {
    this.hotspots.push({
      id: 'horn',
      name: 'Клаксон («Би-бип!»)',
      screenArea: { xMin: 0.36, xMax: 0.52, yMin: 0.72, yMax: 0.94 },
      action: () => { this.triggerHornPress(); },
      tooltip: 'Клаксон (Клавиша H или клик по центру руля)',
    });

    this.hotspots.push({
      id: 'switch_wipers',
      name: 'Тумблер дворников',
      screenArea: { xMin: 0.60, xMax: 0.66, yMin: 0.80, yMax: 0.92 },
      action: () => { this.toggleWipers(); },
      tooltip: 'Стеклоочистители (Клавиша P или клик)',
    });

    this.hotspots.push({
      id: 'wipers',
      name: 'Тумблер дворников',
      screenArea: { xMin: 0.60, xMax: 0.66, yMin: 0.80, yMax: 0.92 },
      action: () => { this.toggleWipers(); },
      tooltip: 'Стеклоочистители (Клавиша P или клик)',
    });

    this.hotspots.push({
      id: 'lever_4wd',
      name: 'Полный привод 4х4',
      screenArea: { xMin: 0.66, xMax: 0.72, yMin: 0.80, yMax: 0.92 },
      action: () => {},
      tooltip: 'Подключение переднего моста 4х4 (Клавиша 4)',
    });

    this.hotspots.push({
      id: 'lever_low',
      name: 'Понижающая передача (4L)',
      screenArea: { xMin: 0.72, xMax: 0.78, yMin: 0.80, yMax: 0.92 },
      action: () => {},
      tooltip: 'Понижайка 4L для топкой грязи (Клавиша L)',
    });

    this.hotspots.push({
      id: 'handbrake',
      name: 'Стояночный тормоз',
      screenArea: { xMin: 0.78, xMax: 0.88, yMin: 0.84, yMax: 0.98 },
      action: () => {},
      tooltip: 'Ручной тормоз (ПРОБЕЛ)',
    });

    this.hotspots.push({
      id: 'speedo',
      name: 'Спидометр УАЗ',
      screenArea: { xMin: 0.28, xMax: 0.44, yMin: 0.68, yMax: 0.86 },
      action: () => {},
      tooltip: 'Спидометр УАЗ (0-120 км/ч)',
    });

    this.hotspots.push({
      id: 'mirror',
      name: 'Зеркало заднего вида',
      screenArea: { xMin: 0.72, xMax: 0.98, yMin: 0.05, yMax: 0.32 },
      action: () => {},
      tooltip: 'Салонное зеркало заднего вида',
    });
  }

  public triggerHornPress() {
    this.hornPressZ = 0.025; // Tactile compression
  }

  public toggleWipers(): boolean {
    this.wipersActive = !this.wipersActive;
    return this.wipersActive;
  }

  public toggleHeadlights(): boolean {
    this.headlightsOn = !this.headlightsOn;
    return this.headlightsOn;
  }

  public update(dt: number, physics: VehiclePhysics, rainIntensity: number) {
    // 1. Steering Wheel Rotation & Dynamic Hand Re-grip ("перекладывание руки")
    const wheelAngle = -physics.steerAngle * Math.PI * 1.35;
    this.wheelGroup.rotation.z = wheelAngle;

    // Tactile Horn compression recovery
    if (this.hornPressZ > 0) {
      this.hornPressZ = Math.max(0, this.hornPressZ - dt * 0.15);
    }
    this.wheelGroup.position.z = 1.0 - this.hornPressZ;

    // Driver hand repositioning / grip shift ("перекладывание руки")
    const steer = physics.steerAngle;
    const steerAbs = Math.abs(steer);
    let handGripShift = 0;
    let handPivotX = 0;
    let handPivotY = 0;

    if (steerAbs > 0.28) {
      // When steering hard, driver's hand subtly rotates & shifts along the rim
      handGripShift = Math.sin((steerAbs - 0.28) * 3.6) * 0.18 * Math.sign(steer);
      handPivotX = Math.sin(wheelAngle) * 0.016;
      handPivotY = -Math.abs(Math.sin(wheelAngle)) * 0.014;
    }

    this.wheelMesh.rotation.z = THREE.MathUtils.lerp(this.wheelMesh.rotation.z, handGripShift, dt * 14.0);
    this.wheelMesh.position.x = THREE.MathUtils.lerp(this.wheelMesh.position.x, handPivotX, dt * 14.0);
    this.wheelMesh.position.y = THREE.MathUtils.lerp(this.wheelMesh.position.y, handPivotY, dt * 14.0);

    // 2. Speedometer Needle Rotation (0 to 120 km/h)
    const speedRatio = THREE.MathUtils.clamp(physics.speedKmh / 120.0, 0, 1);
    const speedoAngle = (135 - speedRatio * 270) * (Math.PI / 180);
    const engineJitter = (Math.random() - 0.5) * (physics.bumpShock * 0.14 + (physics.engineRpm / 4200) * 0.035);
    this.speedoNeedle.rotation.z = speedoAngle + engineJitter;

    // 3. Temp Needle reacting to RPM, Mud resistance and Load
    const engineHeat = THREE.MathUtils.clamp((physics.engineRpm / 4500) * 0.5 + physics.engineLoad * 0.35 + (physics.rutResistance * 0.3), 0, 1);
    const tempAngle = (50 - engineHeat * 95) * (Math.PI / 180);
    this.tempNeedle.rotation.z = tempAngle + engineJitter * 0.4;

    // 4. Dashboard Toggle Switches (visual flips)
    this.switchWipers.scale.y = this.wipersActive ? -1 : 1;
    (this.switchWipers.material as THREE.MeshBasicMaterial).color.setHex(this.wipersActive ? 0x4caf50 : 0xccd2d5);

    this.switch4WD.scale.y = physics.is4WdEngaged ? -1 : 1;
    (this.switch4WD.material as THREE.MeshBasicMaterial).color.setHex(physics.is4WdEngaged ? 0x4caf50 : 0xccd2d5);

    this.switchLowRange.scale.y = physics.isLowRangeEngaged ? -1 : 1;
    (this.switchLowRange.material as THREE.MeshBasicMaterial).color.setHex(physics.isLowRangeEngaged ? 0xff9800 : 0xccd2d5);

    this.switchHandbrake.scale.y = physics.handbrake ? 1.3 : 0.7;
    (this.switchHandbrake.material as THREE.MeshBasicMaterial).color.setHex(physics.handbrake ? 0xff2211 : 0x661108);

    // 5. Glowing Soviet Dashboard Indicator Lamps
    (this.lamp4WD.material as THREE.MeshBasicMaterial).color.setHex(physics.is4WdEngaged ? 0x15e638 : 0x0a3310);
    (this.lampHandbrake.material as THREE.MeshBasicMaterial).color.setHex(physics.handbrake ? 0xff2200 : 0x330a08);
    (this.lampLowRange.material as THREE.MeshBasicMaterial).color.setHex(physics.isLowRangeEngaged ? 0xffaa00 : 0x331c0a);
    (this.lampHighBeam.material as THREE.MeshBasicMaterial).color.setHex(this.headlightsOn ? 0x15b5ff : 0x0a2235);

    // 6. Rigid Cabin Body Sway on bumps, ruts, and turns (entire cabin moves in unison)
    const swayX = -physics.yawRate * 0.012 + (physics.headOffset.x * 0.10);
    const swayY = (physics.headOffset.y * 0.15);
    const tiltZ = -physics.roll * 0.08;

    this.cabinRoot.position.x = THREE.MathUtils.lerp(this.cabinRoot.position.x, swayX, dt * 10.0);
    this.cabinRoot.position.y = THREE.MathUtils.lerp(this.cabinRoot.position.y, swayY, dt * 10.0);
    this.cabinRoot.rotation.z = THREE.MathUtils.lerp(this.cabinRoot.rotation.z, tiltZ, dt * 8.0);

    // 7. Wiper Sweep Animation
    if (this.wipersActive) {
      this.wiperAngle += this.wiperDirection * 3.8 * dt;
      if (this.wiperAngle >= 1.6) {
        this.wiperAngle = 1.6;
        this.wiperDirection = -1;
      } else if (this.wiperAngle <= 0.0) {
        this.wiperAngle = 0.0;
        this.wiperDirection = 1;
      }
      this.wiperMesh.rotation.z = Math.PI / 2.2 - this.wiperAngle;
    } else {
      this.wiperAngle = THREE.MathUtils.lerp(this.wiperAngle, 0, dt * 4.0);
      this.wiperMesh.rotation.z = Math.PI / 2.2 - this.wiperAngle;
    }

    // 8. Rain simulation on glass
    this.updateWindshieldRain(dt, rainIntensity);
  }

  private updateWindshieldRain(dt: number, rainIntensity: number) {
    const ctx = this.rainCtx;
    const w = this.rainCanvas.width;
    const h = this.rainCanvas.height;

    ctx.clearRect(0, 0, w, h);

    if (rainIntensity <= 0.02 && this.rainDrops.length === 0) {
      this.rainTexture.needsUpdate = true;
      return;
    }

    if (rainIntensity > 0.05 && this.rainDrops.length < 240) {
      const count = Math.floor(rainIntensity * 10);
      for (let i = 0; i < count; i++) {
        this.rainDrops.push({
          x: Math.random() * w,
          y: Math.random() * (h * 0.3),
          size: 1.5 + Math.random() * 3.0,
          speed: 15 + Math.random() * 35,
        });
      }
    }

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';

    for (let i = this.rainDrops.length - 1; i >= 0; i--) {
      const drop = this.rainDrops[i];
      drop.y += drop.speed * dt;

      if (this.wipersActive && this.wiperAngle > 0.1) {
        if (Math.abs(drop.x - (w * 0.5)) < 160 && drop.y > 60) {
          this.rainDrops.splice(i, 1);
          continue;
        }
      }

      ctx.beginPath();
      ctx.arc(drop.x, drop.y, drop.size, 0, Math.PI * 2);
      ctx.fill();

      if (drop.y > h + 10) {
        this.rainDrops.splice(i, 1);
      }
    }

    this.rainTexture.needsUpdate = true;
  }
}
