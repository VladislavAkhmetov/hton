import * as THREE from 'three';

export class RetroRenderer {
  public renderer: THREE.WebGLRenderer;
  private renderTarget: THREE.WebGLRenderTarget;
  private quadScene: THREE.Scene;
  private quadCamera: THREE.OrthographicCamera;
  private quadMaterial: THREE.ShaderMaterial;
  private quadMesh: THREE.Mesh;

  // Retro resolution settings
  // 640x360 provides the iconic crisp PS2 / 90s console widescreen pixelation
  public internalWidth: number = 640;
  public internalHeight: number = 360;
  public isRetroPixelMode: boolean = true;

  constructor(container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(1.0); // Keep 1.0 for true retro pixel scaling
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.BasicShadowMap; // PS2 hard low-poly shadows
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    container.appendChild(this.renderer.domElement);

    // Off-screen render target with NearestFilter
    this.renderTarget = new THREE.WebGLRenderTarget(this.internalWidth, this.internalHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      format: THREE.RGBAFormat,
      depthBuffer: true,
      stencilBuffer: false,
    });

    // Screen-space quad setup
    this.quadScene = new THREE.Scene();
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    // Custom PS2 CRT & Dithering shader
    this.quadMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.renderTarget.texture },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        scanlinesEnabled: { value: 0.0 }, // Disabled heavy scanlines for clear crisp view
        ditherIntensity: { value: 0.02 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 resolution;
        uniform float scanlinesEnabled;
        uniform float ditherIntensity;
        varying vec2 vUv;

        // PS2 4x4 Bayer Dithering Matrix
        float ditherMatrix(vec2 uv) {
          int x = int(mod(uv.x * resolution.x, 4.0));
          int y = int(mod(uv.y * resolution.y, 4.0));
          if (x == 0 && y == 0) return 0.0 / 16.0;
          if (x == 2 && y == 0) return 8.0 / 16.0;
          if (x == 0 && y == 2) return 12.0 / 16.0;
          if (x == 2 && y == 2) return 4.0 / 16.0;
          if (x == 1 && y == 0) return 2.0 / 16.0;
          if (x == 3 && y == 0) return 10.0 / 16.0;
          if (x == 1 && y == 2) return 14.0 / 16.0;
          if (x == 3 && y == 2) return 6.0 / 16.0;
          if (x == 0 && y == 1) return 3.0 / 16.0;
          if (x == 2 && y == 1) return 11.0 / 16.0;
          if (x == 0 && y == 3) return 15.0 / 16.0;
          if (x == 2 && y == 3) return 7.0 / 16.0;
          if (x == 1 && y == 1) return 1.0 / 16.0;
          if (x == 3 && y == 1) return 9.0 / 16.0;
          if (x == 1 && y == 3) return 13.0 / 16.0;
          return 5.0 / 16.0;
        }

        void main() {
          vec3 color = texture2D(tDiffuse, vUv).rgb;

          // Subtle dithering for authentic retro gradient breakup
          if (ditherIntensity > 0.001) {
            float dither = (ditherMatrix(vUv) - 0.5) * ditherIntensity;
            color += dither;
          }

          if (scanlinesEnabled > 0.5) {
            float scanline = sin(vUv.y * resolution.y * 1.5) * 0.02;
            color -= scanline;
          }

          gl_FragColor = vec4(color, 1.0);
        }
      `,
    });

    const quadGeom = new THREE.PlaneGeometry(2, 2);
    this.quadMesh = new THREE.Mesh(quadGeom, this.quadMaterial);
    this.quadScene.add(this.quadMesh);

    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h);
    this.quadMaterial.uniforms.resolution.value.set(w, h);
  }

  public render(scene: THREE.Scene, camera: THREE.Camera, hudScene?: THREE.Scene, hudCamera?: THREE.Camera) {
    if (this.isRetroPixelMode) {
      // 1. Render main 3D scene to low-res NearestFilter render target
      this.renderer.setRenderTarget(this.renderTarget);
      this.renderer.clear();
      this.renderer.render(scene, camera);

      // 2. Render cabin HUD layer over the 3D scene
      if (hudScene && hudCamera) {
        this.renderer.autoClear = false;
        this.renderer.render(hudScene, hudCamera);
        this.renderer.autoClear = true;
      }

      // 3. Render screen quad to canvas with PS2 dither/scanline post-processing
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.quadScene, this.quadCamera);
    } else {
      // Direct native resolution render
      this.renderer.setRenderTarget(null);
      this.renderer.render(scene, camera);
      if (hudScene && hudCamera) {
        this.renderer.autoClear = false;
        this.renderer.render(hudScene, hudCamera);
        this.renderer.autoClear = true;
      }
    }
  }

  public toggleRetroMode(): boolean {
    this.isRetroPixelMode = !this.isRetroPixelMode;
    return this.isRetroPixelMode;
  }
}
