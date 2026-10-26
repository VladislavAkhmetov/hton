import * as THREE from 'three';

export type WeatherType = 'clear_day' | 'golden' | 'overcast' | 'rain' | 'fog';

export interface WeatherPreset {
  name: string;
  skyColor: THREE.Color;
  fogColor: THREE.Color;
  fogDensity: number;
  sunColor: THREE.Color;
  sunIntensity: number;
  ambientColor: THREE.Color;
  ambientIntensity: number;
  rainIntensity: number; // 0 to 1
  windSpeed: number;
}

export class WeatherSystem {
  public currentWeather: WeatherType = 'clear_day';
  public rainIntensity: number = 0.0; // Clear day by default
  public fog!: THREE.FogExp2;
  public dirLight!: THREE.DirectionalLight;
  public ambientLight!: THREE.AmbientLight;

  private rainParticles!: THREE.Points;
  private rainGeometry!: THREE.BufferGeometry;
  private rainCoords!: Float32Array;
  private readonly RAIN_COUNT = 1500;

  private presets: Record<WeatherType, WeatherPreset> = {
    clear_day: {
      name: 'Деревенский день (Реф)',
      skyColor: new THREE.Color('#b2bec7'),
      fogColor: new THREE.Color('#bcc7d1'),
      fogDensity: 0.0028,
      sunColor: new THREE.Color('#fff9ea'),
      sunIntensity: 1.4,
      ambientColor: new THREE.Color('#8fa0ad'),
      ambientIntensity: 0.9,
      rainIntensity: 0.0,
      windSpeed: 1.5,
    },
    golden: {
      name: 'Золотая осень',
      skyColor: new THREE.Color('#d4a373'),
      fogColor: new THREE.Color('#e0b178'),
      fogDensity: 0.005,
      sunColor: new THREE.Color('#fff2cc'),
      sunIntensity: 1.5,
      ambientColor: new THREE.Color('#8c775a'),
      ambientIntensity: 0.7,
      rainIntensity: 0.0,
      windSpeed: 2.5,
    },
    overcast: {
      name: 'Осенняя хтонь',
      skyColor: new THREE.Color('#5c646b'),
      fogColor: new THREE.Color('#687077'),
      fogDensity: 0.008,
      sunColor: new THREE.Color('#a8b0b8'),
      sunIntensity: 0.8,
      ambientColor: new THREE.Color('#4c545c'),
      ambientIntensity: 0.6,
      rainIntensity: 0.35,
      windSpeed: 4.0,
    },
    rain: {
      name: 'Ливень с грязью',
      skyColor: new THREE.Color('#2d3439'),
      fogColor: new THREE.Color('#384147'),
      fogDensity: 0.018,
      sunColor: new THREE.Color('#4d555c'),
      sunIntensity: 0.45,
      ambientColor: new THREE.Color('#22282c'),
      ambientIntensity: 0.45,
      rainIntensity: 1.0,
      windSpeed: 8.0,
    },
    fog: {
      name: 'Речной туман',
      skyColor: new THREE.Color('#8a959e'),
      fogColor: new THREE.Color('#949fa8'),
      fogDensity: 0.022,
      sunColor: new THREE.Color('#b8c2cc'),
      sunIntensity: 0.5,
      ambientColor: new THREE.Color('#556069'),
      ambientIntensity: 0.55,
      rainIntensity: 0.1,
      windSpeed: 1.2,
    },
  };

  private currentPreset: WeatherPreset;
  private targetPreset: WeatherPreset;
  private transitionAlpha: number = 1.0;

  constructor(private scene: THREE.Scene) {
    this.currentPreset = { ...this.presets.clear_day };
    this.targetPreset = { ...this.presets.clear_day };

    this.setupLighting();
    this.setupRain();
  }

  private setupLighting() {
    this.fog = new THREE.FogExp2(this.currentPreset.fogColor.getHex(), this.currentPreset.fogDensity);
    this.scene.fog = this.fog;
    this.scene.background = this.currentPreset.skyColor;

    this.ambientLight = new THREE.AmbientLight(this.currentPreset.ambientColor, this.currentPreset.ambientIntensity);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(this.currentPreset.sunColor, this.currentPreset.sunIntensity);
    this.dirLight.position.set(60, 100, 40);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 250;
    const shadowD = 60;
    this.dirLight.shadow.camera.left = -shadowD;
    this.dirLight.shadow.camera.right = shadowD;
    this.dirLight.shadow.camera.top = shadowD;
    this.dirLight.shadow.camera.bottom = -shadowD;
    this.scene.add(this.dirLight);
  }

  private setupRain() {
    this.rainCoords = new Float32Array(this.RAIN_COUNT * 3);
    for (let i = 0; i < this.RAIN_COUNT; i++) {
      this.rainCoords[i * 3 + 0] = (Math.random() - 0.5) * 40;
      this.rainCoords[i * 3 + 1] = Math.random() * 25;
      this.rainCoords[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }

    this.rainGeometry = new THREE.BufferGeometry();
    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(this.rainCoords, 3));

    // Pixelated rain line particles
    const rainMat = new THREE.PointsMaterial({
      color: 0x90a4ae,
      size: 0.18,
      transparent: true,
      opacity: 0.65,
      blending: THREE.NormalBlending,
    });

    this.rainParticles = new THREE.Points(this.rainGeometry, rainMat);
    this.scene.add(this.rainParticles);
  }

  public setWeather(type: WeatherType) {
    if (this.presets[type]) {
      this.currentWeather = type;
      this.targetPreset = this.presets[type];
      this.transitionAlpha = 0.0;
    }
  }

  public nextWeather(): WeatherType {
    const types: WeatherType[] = ['clear_day', 'golden', 'overcast', 'rain', 'fog'];
    const idx = types.indexOf(this.currentWeather);
    const nextType = types[(idx + 1) % types.length];
    this.setWeather(nextType);
    return nextType;
  }

  public update(dt: number, vehiclePos: THREE.Vector3) {
    // Smooth transition between weather presets
    if (this.transitionAlpha < 1.0) {
      this.transitionAlpha = Math.min(1.0, this.transitionAlpha + dt * 0.4);

      // Lerp colors
      this.currentPreset.skyColor.lerp(this.targetPreset.skyColor, this.transitionAlpha);
      this.currentPreset.fogColor.lerp(this.targetPreset.fogColor, this.transitionAlpha);
      this.currentPreset.sunColor.lerp(this.targetPreset.sunColor, this.transitionAlpha);
      this.currentPreset.ambientColor.lerp(this.targetPreset.ambientColor, this.transitionAlpha);

      // Lerp scalars
      this.currentPreset.fogDensity = THREE.MathUtils.lerp(this.currentPreset.fogDensity, this.targetPreset.fogDensity, this.transitionAlpha);
      this.currentPreset.sunIntensity = THREE.MathUtils.lerp(this.currentPreset.sunIntensity, this.targetPreset.sunIntensity, this.transitionAlpha);
      this.currentPreset.ambientIntensity = THREE.MathUtils.lerp(this.currentPreset.ambientIntensity, this.targetPreset.ambientIntensity, this.transitionAlpha);
      this.currentPreset.rainIntensity = THREE.MathUtils.lerp(this.currentPreset.rainIntensity, this.targetPreset.rainIntensity, this.transitionAlpha);

      // Apply to Three.js elements
      this.scene.background = this.currentPreset.skyColor;
      this.fog.color.copy(this.currentPreset.fogColor);
      this.fog.density = this.currentPreset.fogDensity;

      this.dirLight.color.copy(this.currentPreset.sunColor);
      this.dirLight.intensity = this.currentPreset.sunIntensity;

      this.ambientLight.color.copy(this.currentPreset.ambientColor);
      this.ambientLight.intensity = this.currentPreset.ambientIntensity;

      this.rainIntensity = this.currentPreset.rainIntensity;
    }

    // Follow vehicle position with directional light shadow box
    this.dirLight.position.set(vehiclePos.x + 40, vehiclePos.y + 70, vehiclePos.z + 30);
    this.dirLight.target.position.copy(vehiclePos);

    // Update Rain Particles around vehicle
    if (this.rainIntensity > 0.02) {
      this.rainParticles.visible = true;
      const positions = this.rainGeometry.attributes.position.array as Float32Array;
      const fallSpeed = 22.0 * (0.8 + this.rainIntensity * 0.4);
      const windDriftX = this.currentPreset.windSpeed * 0.3;

      for (let i = 0; i < this.RAIN_COUNT; i++) {
        let px = positions[i * 3 + 0];
        let py = positions[i * 3 + 1];
        let pz = positions[i * 3 + 2];

        py -= fallSpeed * dt;
        px += windDriftX * dt;

        // Reset if fallen below ground
        if (py < vehiclePos.y - 2.0) {
          py = vehiclePos.y + 20.0 + Math.random() * 5.0;
          px = vehiclePos.x + (Math.random() - 0.5) * 35.0;
          pz = vehiclePos.z + (Math.random() - 0.5) * 35.0;
        }

        // Keep centered horizontally around car
        if (Math.abs(px - vehiclePos.x) > 20) px = vehiclePos.x + (Math.random() - 0.5) * 35.0;
        if (Math.abs(pz - vehiclePos.z) > 20) pz = vehiclePos.z + (Math.random() - 0.5) * 35.0;

        positions[i * 3 + 0] = px;
        positions[i * 3 + 1] = py;
        positions[i * 3 + 2] = pz;
      }
      this.rainGeometry.attributes.position.needsUpdate = true;
    } else {
      this.rainParticles.visible = false;
    }
  }
}
