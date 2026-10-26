import { MissionManager, DeliveryStop } from './MissionManager';
import { VehiclePhysics } from '../physics/VehiclePhysics';

export class MapOverlay {
  private overlayContainer!: HTMLDivElement;
  private mapCanvas!: HTMLCanvasElement;
  private mapCtx!: CanvasRenderingContext2D;
  public isMapOpen: boolean = false;

  private dialogueBox!: HTMLDivElement;
  private hudPrompt!: HTMLDivElement;
  private statusBadges!: HTMLDivElement;
  private tooltipEl!: HTMLDivElement;
  private helpPanel!: HTMLDivElement;

  constructor() {
    this.createDom();
    this.renderPaperMap();
  }

  private createDom() {
    // 1. Paper Map Modal Overlay
    this.overlayContainer = document.createElement('div');
    this.overlayContainer.id = 'map-overlay';
    this.overlayContainer.style.cssText = `
      position: absolute;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(10, 15, 20, 0.75);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      backdrop-filter: blur(3px);
      cursor: pointer;
    `;

    this.mapCanvas = document.createElement('canvas');
    this.mapCanvas.width = 680;
    this.mapCanvas.height = 800;
    this.mapCanvas.style.cssText = `
      max-width: 90vw;
      max-height: 90vh;
      box-shadow: 0 10px 40px rgba(0,0,0,0.8);
      border-radius: 4px;
      image-rendering: pixelated;
    `;
    this.mapCtx = this.mapCanvas.getContext('2d')!;

    this.overlayContainer.appendChild(this.mapCanvas);
    document.body.appendChild(this.overlayContainer);

    this.overlayContainer.addEventListener('click', () => {
      this.toggleMap();
    });

    // 2. Village Delivery Vignette / Dialogue Box
    this.dialogueBox = document.createElement('div');
    this.dialogueBox.id = 'dialogue-box';
    this.dialogueBox.style.cssText = `
      position: absolute;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      width: 720px;
      max-width: 90vw;
      background: rgba(22, 28, 34, 0.92);
      border: 2px solid #5a7282;
      border-radius: 4px;
      padding: 18px 24px;
      color: #f0ede6;
      font-family: 'Courier New', monospace;
      font-size: 16px;
      line-height: 1.5;
      box-shadow: 0 8px 30px rgba(0,0,0,0.7);
      display: none;
      z-index: 500;
      pointer-events: none;
    `;
    document.body.appendChild(this.dialogueBox);

    // 3. Contextual HUD Prompt (e.g. "Затяните ручник (Пробел)", "Посигнальте дважды")
    this.hudPrompt = document.createElement('div');
    this.hudPrompt.id = 'hud-prompt';
    this.hudPrompt.style.cssText = `
      position: absolute;
      top: 35px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(15, 30, 45, 0.85);
      border: 1px solid #3d84b8;
      border-radius: 3px;
      padding: 8px 18px;
      color: #e8f4f8;
      font-family: 'Courier New', monospace;
      font-size: 14px;
      letter-spacing: 0.5px;
      display: none;
      z-index: 400;
      pointer-events: none;
      text-shadow: 0 1px 2px #000;
    `;
    document.body.appendChild(this.hudPrompt);

    // 4. Discreet Mechanical Dashboard Status Bar
    this.statusBadges = document.createElement('div');
    this.statusBadges.id = 'status-badges';
    this.statusBadges.style.cssText = `
      position: absolute;
      top: 15px;
      left: 15px;
      display: flex;
      gap: 8px;
      z-index: 400;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      user-select: none;
    `;
    document.body.appendChild(this.statusBadges);

    // 5. Cockpit Hotspot Tooltip
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.id = 'hotspot-tooltip';
    this.tooltipEl.style.cssText = `
      position: absolute;
      bottom: 25px;
      right: 25px;
      background: rgba(18, 22, 26, 0.88);
      border: 1px solid #78909c;
      border-radius: 3px;
      padding: 6px 14px;
      color: #fff;
      font-family: 'Courier New', monospace;
      font-size: 12px;
      display: none;
      z-index: 400;
      pointer-events: none;
    `;
    document.body.appendChild(this.tooltipEl);

    // 6. Help Info Box (F1 or bottom-left badge)
    this.helpPanel = document.createElement('div');
    this.helpPanel.style.cssText = `
      position: absolute;
      bottom: 12px;
      left: 15px;
      color: rgba(220, 225, 230, 0.6);
      font-family: 'Courier New', monospace;
      font-size: 11px;
      z-index: 300;
      pointer-events: none;
    `;
    this.helpPanel.innerHTML = `[W/A/S/D] Руль/Газ/Тормоз | [ПРОБЕЛ] Ручник | [4] Полный привод 4х4 | [L] Понижайка 4L | [H] Гудок | [P] Дворники | [M] Карта | [C] Кассета | [F2] Погода | [F3] Ретро PS2`;
    document.body.appendChild(this.helpPanel);
  }

  public toggleMap(): boolean {
    this.isMapOpen = !this.isMapOpen;
    this.overlayContainer.style.display = this.isMapOpen ? 'flex' : 'none';
    return this.isMapOpen;
  }

  /**
   * Renders the authentic hand-drawn Soviet district postal map on weathered paper.
   */
  public renderPaperMap(stops?: DeliveryStop[]) {
    const ctx = this.mapCtx;
    const w = this.mapCanvas.width;
    const h = this.mapCanvas.height;

    // Weathered Soviet topo map paper background
    ctx.fillStyle = '#f2ebd9';
    ctx.fillRect(0, 0, w, h);

    // Paper stains and creases
    ctx.strokeStyle = '#e0d5be';
    ctx.lineWidth = 1.5;
    for (let y = 80; y < h; y += 80) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 80; x < w; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }

    // Header stamp
    ctx.fillStyle = '#1c3144';
    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('СХЕМА МАРШРУТА ПОЧТОВОЙ СВЯЗИ', w / 2, 45);

    ctx.font = '14px "Courier New", monospace';
    ctx.fillStyle = '#3f4e5a';
    ctx.fillText('Зареченский район • Автомобиль: УАЗ-452 «Буханка» • Рейс №14', w / 2, 70);

    // Map drawing coordinates
    // Nodes:
    // Zarechye: (w * 0.35, h * 0.80)
    // Fork North: (w * 0.42, h * 0.52)
    // Sosnovka: (w * 0.78, h * 0.38)
    // Glukhovo: (w * 0.16, h * 0.32)
    // Dubrovka: (w * 0.45, h * 0.16)

    const coords: Record<string, { x: number; y: number; label: string; sub: string }> = {
      zarechye: { x: w * 0.35, y: h * 0.80, label: 'Пос. Заречье', sub: 'Почтовое отд. (Старт)' },
      fork: { x: w * 0.42, y: h * 0.52, label: 'Развилка у вышки', sub: 'Дорожный указатель' },
      sosnovka: { x: w * 0.76, y: h * 0.40, label: 'Дер. Сосновка', sub: 'Магазин Сельпо' },
      glukhovo: { x: w * 0.18, y: h * 0.34, label: 'Урочище Глухово', sub: 'Внимание: Топкие колеи!' },
      dubrovka: { x: w * 0.46, y: h * 0.16, label: 'Село Дубровка', sub: 'Конечный пункт' },
    };

    // Draw River "Быстрянка"
    ctx.strokeStyle = '#8ab4f8';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(w * 0.10, h * 0.88);
    ctx.bezierCurveTo(w * 0.25, h * 0.75, w * 0.20, h * 0.60, w * 0.08, h * 0.45);
    ctx.bezierCurveTo(w * 0.02, h * 0.35, w * 0.05, h * 0.15, w * 0.22, h * 0.05);
    ctx.stroke();

    ctx.fillStyle = '#4a7fc2';
    ctx.font = 'italic bold 12px "Courier New", monospace';
    ctx.fillText('р. Быстрянка', w * 0.16, h * 0.70);

    // Draw Roads (Edges)
    ctx.lineWidth = 6;
    ctx.setLineDash([]);

    // 1. Zarechye -> Fork (Dirt road)
    ctx.strokeStyle = '#8d6e63';
    ctx.beginPath();
    ctx.moveTo(coords.zarechye.x, coords.zarechye.y);
    ctx.quadraticCurveTo(w * 0.36, h * 0.65, coords.fork.x, coords.fork.y);
    ctx.stroke();

    // 2. Fork -> Sosnovka (Asphalt)
    ctx.strokeStyle = '#546e7a';
    ctx.beginPath();
    ctx.moveTo(coords.fork.x, coords.fork.y);
    ctx.quadraticCurveTo(w * 0.60, h * 0.48, coords.sosnovka.x, coords.sosnovka.y);
    ctx.stroke();

    // 3. Fork -> Glukhovo (Mud Track)
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 8;
    ctx.setLineDash([8, 4]); // Muddy dotted warning
    ctx.beginPath();
    ctx.moveTo(coords.fork.x, coords.fork.y);
    ctx.quadraticCurveTo(w * 0.28, h * 0.46, coords.glukhovo.x, coords.glukhovo.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // 4. Sosnovka -> Dubrovka
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#8d6e63';
    ctx.beginPath();
    ctx.moveTo(coords.sosnovka.x, coords.sosnovka.y);
    ctx.quadraticCurveTo(w * 0.65, h * 0.25, coords.dubrovka.x, coords.dubrovka.y);
    ctx.stroke();

    // 5. Glukhovo -> Dubrovka
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 8;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(coords.glukhovo.x, coords.glukhovo.y);
    ctx.quadraticCurveTo(w * 0.28, h * 0.22, coords.dubrovka.x, coords.dubrovka.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw Forest pine clusters (елочки на карте)
    ctx.fillStyle = '#4e7055';
    ctx.font = '16px monospace';
    const trees = [
      [w * 0.52, h * 0.68], [w * 0.58, h * 0.62], [w * 0.65, h * 0.70],
      [w * 0.72, h * 0.55], [w * 0.82, h * 0.52], [w * 0.85, h * 0.25],
      [w * 0.22, h * 0.50], [w * 0.12, h * 0.22], [w * 0.35, h * 0.28],
    ];
    for (const [tx, ty] of trees) {
      ctx.fillText('▲', tx, ty);
      ctx.fillText('▲', tx + 8, ty + 6);
    }

    // Draw Destination Nodes
    for (const key of Object.keys(coords)) {
      const node = coords[key];

      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#1a252f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#111827';
      ctx.font = 'bold 13px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(node.label, node.x + 14, node.y - 4);

      ctx.fillStyle = '#4b5563';
      ctx.font = '11px "Courier New", monospace';
      ctx.fillText(node.sub, node.x + 14, node.y + 11);
    }

    // Red pencil checklist at bottom of paper
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(w * 0.08, h * 0.88, w * 0.84, 80);
    ctx.strokeStyle = '#c5a059';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.08, h * 0.88, w * 0.84, 80);

    ctx.fillStyle = '#1f2937';
    ctx.font = 'bold 12px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('ЗАДАНИЯ НА РЕЙС:', w * 0.11, h * 0.915);

    const checklist = [
      { text: '1. Сосновка: Доставить чайник и посылку в Сельпо', id: 'sosnovka' },
      { text: '2. Глухово: Передать аптечку через глинистую лощину (4L!)', id: 'glukhovo_mud' },
      { text: '3. Дубровка: Разнести свежие письма и газеты', id: 'dubrovka' },
    ];

    for (let i = 0; i < checklist.length; i++) {
      const item = checklist[i];
      const stop = stops?.find(s => s.id === item.id);
      const isDone = stop ? stop.isDelivered : false;

      ctx.fillStyle = isDone ? '#9ca3af' : '#111827';
      ctx.font = '12px "Courier New", monospace';
      ctx.fillText(item.text, w * 0.11, h * 0.945 + i * 18);

      if (isDone) {
        // Red pencil strike-through (вычеркнуто красным карандашом)
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(w * 0.10, h * 0.942 + i * 18);
        ctx.lineTo(w * 0.82, h * 0.942 + i * 18);
        ctx.stroke();

        // Red checkmark stamp
        ctx.fillStyle = '#dc2626';
        ctx.font = 'bold 14px monospace';
        ctx.fillText('✓ ДОСТАВЛЕНО', w * 0.72, h * 0.942 + i * 18);
      }
    }
  }

  public update(mission: MissionManager, physics: VehiclePhysics, tooltip: string | null) {
    // 1. Dialogue box update
    if (mission.activeDialogue) {
      this.dialogueBox.style.display = 'block';
      this.dialogueBox.innerHTML = `
        <div style="font-weight: bold; color: #64b5f6; margin-bottom: 6px;">${mission.activeDialogue.speaker}</div>
        <div style="font-style: italic;">${mission.activeDialogue.text}</div>
      `;
    } else {
      this.dialogueBox.style.display = 'none';
    }

    // 2. HUD Prompt update
    const prompt = mission.getNearVillagePrompt(physics);
    if (prompt) {
      this.hudPrompt.style.display = 'block';
      this.hudPrompt.innerText = prompt;
    } else {
      this.hudPrompt.style.display = 'none';
    }

    // 3. Status Badges update
    const gearName = physics.currentGear === -1 ? 'R' : (physics.currentGear === 0 ? 'N' : `${physics.currentGear}`);
    const fourWdColor = physics.is4WdEngaged ? '#4caf50' : '#78909c';
    const lowRangeColor = physics.isLowRangeEngaged ? '#ff9800' : '#78909c';
    const hbColor = physics.handbrake ? '#f44336' : '#78909c';

    this.statusBadges.innerHTML = `
      <div style="background: rgba(20,25,30,0.85); padding: 4px 8px; border-radius: 3px; border: 1px solid #455a64; color: #fff;">
        КПП: <b>${gearName}</b>
      </div>
      <div style="background: rgba(20,25,30,0.85); padding: 4px 8px; border-radius: 3px; border: 1px solid ${fourWdColor}; color: ${fourWdColor};">
        4х4: <b>${physics.is4WdEngaged ? 'ВКЛ' : 'ВЫКЛ'}</b>
      </div>
      <div style="background: rgba(20,25,30,0.85); padding: 4px 8px; border-radius: 3px; border: 1px solid ${lowRangeColor}; color: ${lowRangeColor};">
        ПОНИЖАЙКА 4L: <b>${physics.isLowRangeEngaged ? 'ВКЛ' : 'ВЫКЛ'}</b>
      </div>
      <div style="background: rgba(20,25,30,0.85); padding: 4px 8px; border-radius: 3px; border: 1px solid ${hbColor}; color: ${hbColor};">
        РУЧНИК: <b>${physics.handbrake ? 'ЗАТЯНУТ' : 'ОТПУЩЕН'}</b>
      </div>
      <div style="background: rgba(20,25,30,0.85); padding: 4px 8px; border-radius: 3px; border: 1px solid #455a64; color: #b0bec5;">
        ПОКРЫТИЕ: <b>${physics.currentSurface.surfaceType.toUpperCase()}</b> ${physics.currentSurface.rutDepth > 0.05 ? '(КОЛЕЯ!)' : ''}
      </div>
    `;

    // 4. Tooltip update
    if (tooltip) {
      this.tooltipEl.style.display = 'block';
      this.tooltipEl.innerText = tooltip;
    } else {
      this.tooltipEl.style.display = 'none';
    }
  }
}
