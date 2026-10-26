import * as THREE from 'three';
import { RoadNetwork, RoadNode } from '../world/RoadNetwork';
import { VehiclePhysics } from '../physics/VehiclePhysics';

export interface DeliveryStop {
  id: string;
  name: string;
  node: RoadNode;
  isDelivered: boolean;
  item: string;
  dialogue: string;
}

export class MissionManager {
  public stops: DeliveryStop[] = [];
  public currentStopIndex: number = 0;
  public totalCompleted: number = 0;

  // Active dialogue vignette state
  public activeDialogue: { speaker: string; text: string; timer: number } | null = null;
  private recentHornTimes: number[] = [];

  constructor(private roadNetwork: RoadNetwork) {
    this.initStops();
  }

  private initStops() {
    const sequence = ['sosnovka', 'glukhovo_mud', 'dubrovka'];
    for (const id of sequence) {
      const node = this.roadNetwork.nodes.get(id);
      if (node) {
        this.stops.push({
          id: node.id,
          name: node.name,
          node,
          isDelivered: false,
          item: node.deliveryItem || 'Почтовый пакет',
          dialogue: node.deliveryDialogue || 'Спасибо за доставку!',
        });
      }
    }
  }

  public registerHornPress() {
    const now = performance.now();
    this.recentHornTimes.push(now);
    // Keep only last 3 seconds
    this.recentHornTimes = this.recentHornTimes.filter(t => now - t < 3000);
  }

  /**
   * Checks if player has performed the village delivery ritual:
   * 1. Vehicle is inside village radius (< 25m)
   * 2. Vehicle is stationary (speed < 2 km/h)
   * 3. Handbrake is engaged (Ручник затянут!)
   * 4. Double horn tap performed (дважды нажат клаксон «Би-бип!»)
   */
  public checkRitual(physics: VehiclePhysics): DeliveryStop | null {
    if (Math.abs(physics.speedKmh) > 2.0 || !physics.handbrake) {
      return null;
    }

    // Require at least 2 horn presses in the last 3 seconds
    if (this.recentHornTimes.length < 2) {
      return null;
    }

    const pos = physics.position;

    for (const stop of this.stops) {
      if (stop.isDelivered) continue;

      const dist = Math.hypot(pos.x - stop.node.position.x, pos.z - stop.node.position.z);
      if (dist < 28.0) {
        // Successful delivery ritual!
        stop.isDelivered = true;
        this.totalCompleted++;
        this.recentHornTimes = []; // Reset horn

        // Trigger story dialogue
        this.activeDialogue = {
          speaker: `Почтальон Валентина (${stop.name})`,
          text: stop.dialogue,
          timer: 9.0, // 9 seconds display
        };

        return stop;
      }
    }

    return null;
  }

  public update(dt: number) {
    if (this.activeDialogue) {
      this.activeDialogue.timer -= dt;
      if (this.activeDialogue.timer <= 0) {
        this.activeDialogue = null;
      }
    }
  }

  public getNearVillagePrompt(physics: VehiclePhysics): string | null {
    const pos = physics.position;
    for (const stop of this.stops) {
      if (stop.isDelivered) continue;

      const dist = Math.hypot(pos.x - stop.node.position.x, pos.z - stop.node.position.z);
      if (dist < 28.0) {
        if (!physics.handbrake) {
          return `📍 ${stop.name}: Затяните ручник (Пробел)`;
        } else if (this.recentHornTimes.length < 2) {
          return `📍 ${stop.name}: Посигнальте дважды (Клавиша H или клик по рулю)`;
        }
      }
    }
    return null;
  }
}
