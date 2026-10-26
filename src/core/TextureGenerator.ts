import * as THREE from 'three';

/**
 * Procedural PS2-style pixel art texture generator for authentic low-res aesthetics.
 */
export class TextureGenerator {
  private static cache: Map<string, THREE.CanvasTexture> = new Map();

  private static makeTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void, key?: string): THREE.CanvasTexture {
    if (key && this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    draw(ctx);

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;

    if (key) {
      this.cache.set(key, texture);
    }
    return texture;
  }

  /**
   * Handcrafted pixel art sitting village dog (как на референсе image2).
   */
  public static createDogSprite(): THREE.CanvasTexture {
    return this.makeTexture(48, 56, (ctx) => {
      ctx.clearRect(0, 0, 48, 56);

      // Sitting dog silhouette (warm rich brown)
      ctx.fillStyle = '#6f4a2f'; // Primary coat
      // Body
      ctx.fillRect(16, 22, 16, 26);
      ctx.fillRect(12, 34, 20, 16);
      // Haunches (sitting hind legs)
      ctx.fillRect(8, 38, 10, 14);
      // Front paws
      ctx.fillRect(26, 42, 6, 12);
      ctx.fillRect(22, 44, 4, 10);
      // Tail resting on ground
      ctx.fillRect(4, 46, 8, 4);
      ctx.fillRect(2, 42, 4, 6);

      // Neck and head
      ctx.fillRect(20, 14, 14, 12);
      ctx.fillRect(24, 6, 14, 12);
      // Snout
      ctx.fillRect(36, 12, 8, 6);
      // Nose
      ctx.fillStyle = '#1b120c';
      ctx.fillRect(42, 12, 3, 3);
      // Eye
      ctx.fillRect(32, 9, 2, 2);

      // Drooping ear
      ctx.fillStyle = '#4a2e1b';
      ctx.fillRect(24, 8, 5, 10);

      // Shading / darker fur
      ctx.fillStyle = '#55361e';
      ctx.fillRect(16, 32, 4, 16);
      ctx.fillRect(10, 46, 14, 4);

      // Highlights / warm fur
      ctx.fillStyle = '#8f6542';
      ctx.fillRect(22, 18, 6, 14);
      ctx.fillRect(26, 8, 6, 4);
    }, 'pixel_dog');
  }

  /**
   * Handcrafted pixel art spotted Russian cow (как на референсе image2).
   */
  public static createCowSprite(): THREE.CanvasTexture {
    return this.makeTexture(80, 64, (ctx) => {
      ctx.clearRect(0, 0, 80, 64);

      // Cow body (spotted brown & white)
      // Base reddish brown
      ctx.fillStyle = '#7a3c22';
      ctx.fillRect(18, 16, 44, 28);
      ctx.fillRect(12, 20, 10, 20); // Rump

      // White patches (пятнистая корова)
      ctx.fillStyle = '#eae7dd';
      ctx.fillRect(28, 18, 16, 22);
      ctx.fillRect(22, 24, 10, 12);
      ctx.fillRect(48, 22, 10, 14);

      // Legs
      ctx.fillStyle = '#632e18';
      ctx.fillRect(16, 40, 5, 20); // Back leg left
      ctx.fillRect(23, 38, 5, 22); // Back leg right
      ctx.fillStyle = '#eae7dd';
      ctx.fillRect(50, 40, 5, 20); // Front leg left
      ctx.fillStyle = '#632e18';
      ctx.fillRect(57, 38, 5, 22); // Front leg right
      // Dark hooves
      ctx.fillStyle = '#1a1410';
      ctx.fillRect(16, 58, 5, 4);
      ctx.fillRect(23, 58, 5, 4);
      ctx.fillRect(50, 58, 5, 4);
      ctx.fillRect(57, 58, 5, 4);

      // Head & Neck
      ctx.fillStyle = '#7a3c22';
      ctx.fillRect(58, 10, 14, 18);
      ctx.fillRect(66, 12, 10, 14);
      // White blaze on forehead
      ctx.fillStyle = '#eae7dd';
      ctx.fillRect(66, 12, 4, 10);
      // Pink muzzle
      ctx.fillStyle = '#d49b8a';
      ctx.fillRect(72, 18, 6, 8);
      ctx.fillStyle = '#221510';
      ctx.fillRect(75, 22, 2, 2); // Nostril

      // Horns
      ctx.fillStyle = '#e8d8b5';
      ctx.fillRect(64, 4, 3, 7);
      ctx.fillRect(62, 3, 3, 3);

      // Eye
      ctx.fillStyle = '#111';
      ctx.fillRect(68, 14, 2, 2);

      // Tail with brush
      ctx.fillStyle = '#632e18';
      ctx.fillRect(10, 22, 3, 18);
      ctx.fillStyle = '#221510';
      ctx.fillRect(9, 38, 5, 6);
    }, 'pixel_cow');
  }

  /**
   * Uneven muddy road with puddles reflecting the soft sky (референс image2).
   */
  public static createMudPuddleRoadTexture(): THREE.CanvasTexture {
    return this.makeTexture(128, 128, (ctx) => {
      // Base muddy earth
      ctx.fillStyle = '#5c4632';
      ctx.fillRect(0, 0, 128, 128);

      // Soil texture variations
      for (let y = 0; y < 128; y += 4) {
        for (let x = 0; x < 128; x += 4) {
          const n = Math.sin(x * 0.2) * Math.cos(y * 0.18);
          ctx.fillStyle = n > 0.2 ? '#6e543c' : (n < -0.2 ? '#483524' : '#5c4632');
          ctx.fillRect(x, y, 4, 4);
        }
      }

      // Left wheel rut (глубокая колея слева)
      ctx.fillStyle = '#3a2b1c';
      ctx.fillRect(20, 0, 28, 128);

      // Right wheel rut (глубокая колея справа)
      ctx.fillStyle = '#3a2b1c';
      ctx.fillRect(80, 0, 28, 128);

      // Water puddles reflecting pale overcast sky (зеркало воды)
      ctx.fillStyle = '#9fb0bc'; // Pale sky reflection
      // Left puddle
      ctx.beginPath();
      ctx.ellipse(34, 40, 10, 32, 0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b8c9d4';
      ctx.beginPath();
      ctx.ellipse(34, 40, 6, 22, 0.05, 0, Math.PI * 2);
      ctx.fill();

      // Right puddle
      ctx.fillStyle = '#9fb0bc';
      ctx.beginPath();
      ctx.ellipse(94, 85, 9, 28, -0.05, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b8c9d4';
      ctx.beginPath();
      ctx.ellipse(94, 85, 5, 18, -0.05, 0, Math.PI * 2);
      ctx.fill();

      // Raised center hump grass (трава на межколейном гребне)
      ctx.fillStyle = '#5d7534';
      for (let y = 4; y < 128; y += 8) {
        const gx = 60 + Math.floor(Math.sin(y * 0.4) * 4);
        ctx.fillRect(gx, y, 6, 6);
      }
    }, 'mud_puddle_road_tex');
  }

  public static createAsphaltTexture(): THREE.CanvasTexture {
    return this.makeTexture(64, 64, (ctx) => {
      ctx.fillStyle = '#393c40';
      ctx.fillRect(0, 0, 64, 64);
      for (let y = 0; y < 64; y += 4) {
        for (let x = 0; x < 64; x += 4) {
          if ((x + y * 3) % 7 === 0) {
            ctx.fillStyle = '#494d52';
            ctx.fillRect(x, y, 3, 3);
          }
        }
      }
    }, 'asphalt_road');
  }

  public static createLogWallTexture(): THREE.CanvasTexture {
    return this.makeTexture(64, 64, (ctx) => {
      ctx.fillStyle = '#5a422d';
      ctx.fillRect(0, 0, 64, 64);

      for (let y = 0; y < 64; y += 16) {
        ctx.fillStyle = '#3d2b1c';
        ctx.fillRect(0, y, 64, 2);
        ctx.fillStyle = '#7a5a3d';
        ctx.fillRect(0, y + 2, 64, 3);
        ctx.fillStyle = '#332316';
        ctx.fillRect(0, y + 14, 64, 2);
      }
    }, 'log_wall');
  }

  public static createWindowTexture(): THREE.CanvasTexture {
    return this.makeTexture(64, 64, (ctx) => {
      ctx.fillStyle = '#4a331e';
      ctx.fillRect(0, 0, 64, 64);

      // White carved frame (белые резные наличники как на референсе)
      ctx.fillStyle = '#edece8';
      ctx.fillRect(10, 6, 44, 52);

      // Glass panes (soft overcast reflection)
      ctx.fillStyle = '#4c5f6e';
      ctx.fillRect(16, 12, 32, 40);

      // Window cross
      ctx.fillStyle = '#edece8';
      ctx.fillRect(31, 12, 2, 40);
      ctx.fillRect(16, 28, 32, 2);
    }, 'window_facade');
  }

  public static createRoofTexture(): THREE.CanvasTexture {
    return this.makeTexture(64, 64, (ctx) => {
      ctx.fillStyle = '#454a4f';
      ctx.fillRect(0, 0, 64, 64);

      for (let y = 0; y < 64; y += 8) {
        ctx.fillStyle = '#33373b';
        ctx.fillRect(0, y, 64, 2);
        ctx.fillStyle = '#5c6369';
        ctx.fillRect(0, y + 2, 64, 6);
      }
    }, 'roof_shingle');
  }

  public static createRoadSignTexture(text: string, arrow: string = 'none', distKm?: string): THREE.CanvasTexture {
    return this.makeTexture(128, 64, (ctx) => {
      ctx.fillStyle = '#0b5394';
      ctx.fillRect(0, 0, 128, 64);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, 120, 56);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text.toUpperCase(), 64, 26);
      if (distKm) {
        ctx.font = 'bold 13px monospace';
        ctx.fillText(`${distKm} км`, 64, 46);
      }
    }, `sign_${text}_${distKm}`);
  }
}
