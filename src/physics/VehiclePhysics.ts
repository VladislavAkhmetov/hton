import * as THREE from 'three';

export interface RoadSurfaceInfo {
  surfaceType: 'asphalt' | 'dirt' | 'mud' | 'puddle';
  elevation: number;
  normal: THREE.Vector3;
  rutDepth: number; // 0 to 0.25m
  rutOffset: number; // lateral offset from road center (-1 to 1)
  isOffroad: boolean;
}

export type SurfaceQueryFn = (worldX: number, worldZ: number) => RoadSurfaceInfo;

export class VehiclePhysics {
  // Vehicle state in world coordinates
  public position: THREE.Vector3 = new THREE.Vector3(0, 1.2, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public forward: THREE.Vector3 = new THREE.Vector3(0, 0, -1);
  public up: THREE.Vector3 = new THREE.Vector3(0, 1, 0);
  public right: THREE.Vector3 = new THREE.Vector3(1, 0, 0);

  // Rotation angles (radians)
  public yaw: number = 0;       // Direction (compass)
  public pitch: number = 0;     // Nose up/down
  public roll: number = 0;      // Lean left/right

  // Rotational velocities
  public yawRate: number = 0;
  public pitchRate: number = 0;
  public rollRate: number = 0;

  // Steering wheel
  public steerAngle: number = 0; // Steering wheel rotation (-540 to +540 degrees)
  public wheelSteerAngle: number = 0; // Actual front wheels angle (-0.55 to +0.55 rad, ~32 deg)

  // Engine & Transmission
  public engineRunning: boolean = true;
  public engineRpm: number = 800; // Idle RPM
  public currentGear: number = 1; // -1: Reverse, 0: Neutral, 1, 2, 3, 4
  public is4WdEngaged: boolean = false; // Раздатка: подключение переднего моста
  public isLowRangeEngaged: boolean = false; // Раздатка: пониженная передача (4L / демультипликатор)
  public handbrake: boolean = false; // Стояночный тормоз

  // Pedals input (0 to 1)
  public throttleInput: number = 0;
  public brakeInput: number = 0;
  public clutchInput: number = 0; // 0: engaged, 1: pressed

  // Speed in km/h
  public speedKmh: number = 0;

  // 4 Wheel contact states
  public wheels = [
    { name: 'FL', localPos: new THREE.Vector3(-0.72, -0.6, 1.15), isFront: true, isLeft: true, suspensionLength: 0.35, slip: 0, grounded: true, angularVel: 0 },
    { name: 'FR', localPos: new THREE.Vector3(0.72, -0.6, 1.15), isFront: true, isLeft: false, suspensionLength: 0.35, slip: 0, grounded: true, angularVel: 0 },
    { name: 'RL', localPos: new THREE.Vector3(-0.72, -0.6, -1.15), isFront: false, isLeft: true, suspensionLength: 0.35, slip: 0, grounded: true, angularVel: 0 },
    { name: 'RR', localPos: new THREE.Vector3(0.72, -0.6, -1.15), isFront: false, isLeft: false, suspensionLength: 0.35, slip: 0, grounded: true, angularVel: 0 },
  ];

  // Head / Camera motion dynamics (authentic UAZ cab-over feel!)
  public headOffset: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  public headRot: THREE.Euler = new THREE.Euler(0, 0, 0, 'YXZ');
  private headVel: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  // Surface at center of vehicle
  public currentSurface: RoadSurfaceInfo = {
    surfaceType: 'dirt',
    elevation: 0,
    normal: new THREE.Vector3(0, 1, 0),
    rutDepth: 0,
    rutOffset: 0,
    isOffroad: false,
  };

  // UAZ Constants
  private readonly MASS = 1950; // kg
  private readonly WHEEL_RADIUS = 0.38; // meters (215/90 R15C - "Я-245" / "Я-192")
  private readonly SUSP_REST_LEN = 0.40; // m
  private readonly SUSP_SPRING = 36000; // N/m (leaf springs)
  private readonly SUSP_DAMP = 2800; // Ns/m
  private readonly GEAR_RATIOS: Record<number, number> = {
    [-1]: -5.22,
    0: 0,
    1: 4.12,
    2: 2.64,
    3: 1.58,
    4: 1.00,
  };
  private readonly FINAL_DRIVE = 4.625; // Главная пара Тимкен
  private readonly LOW_RANGE_RATIO = 1.94; // Раздатка пониженная передача

  // Audio / FX triggers
  public engineLoad: number = 0; // 0 to 1
  public bumpShock: number = 0; // Recent bump magnitude
  public rutResistance: number = 0;

  constructor() {
    this.updateVectors();
  }

  public setPosition(x: number, y: number, z: number, yaw: number = 0) {
    this.position.set(x, y, z);
    this.yaw = yaw;
    this.velocity.set(0, 0, 0);
    this.yawRate = 0;
    this.pitch = 0;
    this.roll = 0;
    this.updateVectors();
  }

  public shiftGear(gear: number) {
    if (gear >= -1 && gear <= 4) {
      this.currentGear = gear;
    }
  }

  public toggle4WD(): boolean {
    this.is4WdEngaged = !this.is4WdEngaged;
    // If disabling 4WD, also disable low range
    if (!this.is4WdEngaged) {
      this.isLowRangeEngaged = false;
    }
    return this.is4WdEngaged;
  }

  public toggleLowRange(): boolean {
    if (this.isLowRangeEngaged) {
      this.isLowRangeEngaged = false;
    } else {
      // Bukhanka transfer case requires 4WD to be engaged for low-range
      this.is4WdEngaged = true;
      this.isLowRangeEngaged = true;
    }
    return this.isLowRangeEngaged;
  }

  public toggleHandbrake(): boolean {
    this.handbrake = !this.handbrake;
    return this.handbrake;
  }

  /**
   * Main physics step.
   * @param dt Delta time in seconds (clamped to 0.05 max for stability)
   * @param surfaceQuery Callback returning terrain/road data at given world X, Z
   */
  public update(dt: number, surfaceQuery: SurfaceQueryFn) {
    if (dt <= 0) return;
    dt = Math.min(dt, 0.05);

    // 1. Query ground under center of chassis
    this.currentSurface = surfaceQuery(this.position.x, this.position.z);

    // 2. Process steering wheel input with realistic caster return and worm-gear inertia
    this.updateSteering(dt);

    // 3. Update orientation vectors
    this.updateVectors();

    // 4. Calculate 4-wheel suspension forces, chassis pitch and roll
    let totalSuspensionForceY = 0;
    let netPitchTorque = 0;
    let netRollTorque = 0;
    let anyWheelSlipping = false;
    let maxWheelCompression = 0;

    const chassisQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(this.pitch, this.yaw, this.roll, 'YXZ'));

    for (const w of this.wheels) {
      // Calculate wheel world position
      const worldOffset = w.localPos.clone().applyQuaternion(chassisQuat);
      const wheelWorldPos = this.position.clone().add(worldOffset);

      // Query ground under this wheel
      const g = surfaceQuery(wheelWorldPos.x, wheelWorldPos.z);
      const groundY = g.elevation;

      // Distance from chassis anchor to ground
      const currentLen = (wheelWorldPos.y - groundY);
      const compression = this.SUSP_REST_LEN - currentLen;

      if (compression > 0) {
        // Wheel is on ground
        w.grounded = true;
        w.suspensionLength = Math.max(0.08, currentLen);

        // Spring force with leaf-spring non-linearity
        const springF = this.SUSP_SPRING * compression * (1.0 + compression * 2.0);
        // Damping force
        const suspVel = (w.suspensionLength - currentLen) / dt;
        const dampF = this.SUSP_DAMP * suspVel;
        const forceY = Math.max(0, springF + dampF);

        totalSuspensionForceY += forceY;

        // Torques relative to center of gravity
        netPitchTorque += forceY * (w.isFront ? -w.localPos.z : -w.localPos.z);
        netRollTorque += forceY * (w.isLeft ? -w.localPos.x : -w.localPos.x);

        if (compression > maxWheelCompression) {
          maxWheelCompression = compression;
        }
      } else {
        w.grounded = false;
        w.suspensionLength = this.SUSP_REST_LEN;
      }
    }

    // Bump shock detection for suspension audio & camera shudder
    if (maxWheelCompression > 0.15) {
      this.bumpShock = Math.max(this.bumpShock, (maxWheelCompression - 0.15) * 4.0);
    }
    this.bumpShock *= Math.max(0, 1.0 - dt * 8.0);

    // 5. Powertrain: Engine, Transmission, Wheel Torques
    this.updatePowertrain(dt);

    // 6. Longitudinal and Lateral Traction
    const forwardSpeed = this.velocity.dot(this.forward);
    this.speedKmh = forwardSpeed * 3.6;

    // Surface friction coefficients
    let frictionMu = 0.85; // Default dry dirt
    let rollingResistCoeff = 0.025;
    let rutSidePull = 0;

    switch (this.currentSurface.surfaceType) {
      case 'asphalt':
        frictionMu = 0.95;
        rollingResistCoeff = 0.018;
        break;
      case 'dirt':
        frictionMu = 0.72;
        rollingResistCoeff = 0.035;
        break;
      case 'mud':
        // Deep clay mud: low grip, high rolling resistance, ruts trap wheels!
        frictionMu = 0.32;
        rollingResistCoeff = 0.14 + this.currentSurface.rutDepth * 0.8; // Huge drag in deep mud!
        // Rut trapping force: pushes tires towards bottom of rut
        if (Math.abs(this.currentSurface.rutOffset) > 0.08) {
          rutSidePull = -Math.sign(this.currentSurface.rutOffset) * 800 * this.currentSurface.rutDepth;
        }
        break;
      case 'puddle':
        frictionMu = 0.45;
        rollingResistCoeff = 0.09;
        break;
    }

    if (this.currentSurface.isOffroad) {
      rollingResistCoeff += 0.08;
      frictionMu *= 0.75;
    }

    this.rutResistance = rollingResistCoeff;

    // Driving Force from engine through drivetrain
    let driveForce = 0;
    if (this.engineRunning && this.currentGear !== 0) {
      const gearRatio = this.GEAR_RATIOS[this.currentGear];
      const transferRatio = this.isLowRangeEngaged ? this.LOW_RANGE_RATIO : 1.0;
      const totalRatio = gearRatio * this.FINAL_DRIVE * transferRatio;

      // Engine torque calculation (approx ZMZ-402 / UMZ-417 curve)
      // Peak torque at 2200 RPM (~190 Nm)
      const rpmNormalized = Math.max(0.2, this.engineRpm / 2400);
      const peakTorque = 195; // Nm
      const engineTorque = peakTorque * (rpmNormalized * Math.exp(1 - rpmNormalized * 0.85)) * (0.15 + 0.85 * this.throttleInput);

      // Wheel drive force
      const theoreticalWheelForce = (engineTorque * totalRatio) / this.WHEEL_RADIUS;

      // Check for wheel spin / slip
      // Normal load on driven wheels
      const drivenAxleLoad = this.is4WdEngaged ? this.MASS * 9.81 : this.MASS * 9.81 * 0.52;
      const maxGripForce = drivenAxleLoad * frictionMu;

      if (Math.abs(theoreticalWheelForce) > maxGripForce) {
        // Tires are spinning! (Буксует!)
        anyWheelSlipping = true;
        driveForce = Math.sign(theoreticalWheelForce) * maxGripForce * 0.65; // Dynamic friction drop
      } else {
        driveForce = theoreticalWheelForce;
      }

      // In deep mud without 4WD, rear wheels quickly dig in and lose almost all traction
      if (this.currentSurface.surfaceType === 'mud' && !this.is4WdEngaged) {
        driveForce *= 0.35;
        anyWheelSlipping = true;
      }
    }

    // Braking Force
    let brakeForce = 0;
    if (this.brakeInput > 0.01) {
      brakeForce = Math.sign(forwardSpeed) * this.brakeInput * this.MASS * 9.81 * frictionMu * 0.85;
    }
    if (this.handbrake) {
      // Rear wheels locked
      brakeForce += Math.sign(forwardSpeed) * this.MASS * 9.81 * frictionMu * 0.5;
    }

    // Rolling resistance
    const rollingResistance = Math.sign(forwardSpeed) * this.MASS * 9.81 * rollingResistCoeff;

    // Aerodynamic drag
    const airDrag = 0.5 * 1.2 * 2.8 * 0.65 * (forwardSpeed * forwardSpeed) * Math.sign(forwardSpeed);

    // Net longitudinal force
    const netLongitudinalForce = driveForce - brakeForce - rollingResistance - airDrag;

    // Acceleration in forward direction
    const forwardAcc = netLongitudinalForce / this.MASS;

    // 7. Lateral Cornering and Steering
    // Side-slip angle (угол увода колес)
    const lateralSpeed = this.velocity.dot(this.right);
    const corneringStiffness = 32000; // N/rad
    const targetYawRate = (forwardSpeed / 2.30) * Math.tan(this.wheelSteerAngle);

    // Solid axle high center-of-gravity yaw damping
    this.yawRate = THREE.MathUtils.lerp(this.yawRate, targetYawRate, dt * 6.0);

    // Apply rut side pull to steer
    if (Math.abs(rutSidePull) > 0) {
      this.yawRate += (rutSidePull / this.MASS) * dt * 0.5;
    }

    this.yaw += this.yawRate * dt;

    // 8. Update velocity
    const newForwardSpeed = forwardSpeed + forwardAcc * dt;
    // Lateral velocity damping (tires resist sliding sideways unless sliding)
    const newLateralSpeed = lateralSpeed * Math.max(0, 1.0 - dt * (12.0 * frictionMu));

    // Stop complete jitter at near-zero speed
    let finalForwardSpeed = newForwardSpeed;
    if (Math.abs(finalForwardSpeed) < 0.08 && this.throttleInput < 0.05 && (this.brakeInput > 0.1 || this.handbrake || rollingResistCoeff > 0.05)) {
      finalForwardSpeed = 0;
    }

    this.velocity.copy(this.forward).multiplyScalar(finalForwardSpeed).addScaledVector(this.right, newLateralSpeed);

    // Integrate position
    this.position.x += this.velocity.x * dt;
    this.position.z += this.velocity.z * dt;

    // 9. Vertical movement and chassis pitch/roll
    const targetCenterY = this.currentSurface.elevation + 0.68;
    this.position.y = THREE.MathUtils.lerp(this.position.y, targetCenterY, dt * 10.0);

    // Chassis Pitch & Roll (Suspension + Weight Transfer)
    // Pitch: nose dives on braking, lifts on acceleration, tracks terrain slope
    const groundSlopePitch = Math.atan2(this.currentSurface.normal.z, this.currentSurface.normal.y);
    const accelPitch = (forwardAcc / 9.81) * -0.06; // Weight transfer pitch
    const targetPitch = groundSlopePitch * 0.4 + accelPitch;
    this.pitch = THREE.MathUtils.lerp(this.pitch, targetPitch, dt * 8.0);

    // Roll: body leans hard in turns due to high Bukhanka center of gravity and soft leaf springs!
    const groundCamberRoll = Math.atan2(-this.currentSurface.normal.x, this.currentSurface.normal.y);
    const centrifugalRoll = (forwardSpeed * this.yawRate / 9.81) * 0.18; // Lean outward in turns!
    const targetRoll = groundCamberRoll * 0.5 + centrifugalRoll;
    this.roll = THREE.MathUtils.lerp(this.roll, targetRoll, dt * 7.0);

    // 10. Cab-Over Head Motion (The iconic Bukhanka driver head bobbing!)
    this.updateHeadBobbing(dt, forwardAcc, maxWheelCompression);
  }

  private updateSteering(dt: number) {
    // Worm-and-roller steering model:
    // Steer angle is in range -1.0 to +1.0 (approx 1.5 turns of the steering wheel)
    const steerSpeed = 3.2; // Speed of turning wheel
    const maxWheelAngle = 0.55; // ~31.5 degrees

    // Steering wheel self-centering (кастерный возврат при движении)
    const speedRatio = Math.min(1.0, Math.abs(this.speedKmh) / 25.0);
    const selfCenterRate = 2.2 * speedRatio;

    // Heavy steering resistance in deep mud
    let mudDragFactor = 1.0;
    if (this.currentSurface.surfaceType === 'mud') {
      mudDragFactor = 0.6; // Much harder to turn the wheel in clay!
    }

    this.wheelSteerAngle = this.steerAngle * maxWheelAngle;
  }

  private updatePowertrain(dt: number) {
    // Calculate realistic engine RPM
    const idleRpm = 750;
    const maxRpm = 4400;

    if (!this.engineRunning) {
      this.engineRpm = THREE.MathUtils.lerp(this.engineRpm, 0, dt * 5.0);
      return;
    }

    if (this.currentGear === 0) {
      // Neutral: free revving
      const targetRpm = idleRpm + (maxRpm - idleRpm) * Math.pow(this.throttleInput, 1.3);
      this.engineRpm = THREE.MathUtils.lerp(this.engineRpm, targetRpm, dt * (this.throttleInput > 0.05 ? 6.5 : 3.5));
      this.engineLoad = this.throttleInput * 0.2;
    } else {
      // In gear: RPM tied to wheel speed through gear ratios
      const gearRatio = Math.abs(this.GEAR_RATIOS[this.currentGear]);
      const transferRatio = this.isLowRangeEngaged ? this.LOW_RANGE_RATIO : 1.0;
      const totalRatio = gearRatio * this.FINAL_DRIVE * transferRatio;

      // Theoretical RPM for current speed
      const wheelRpm = (Math.abs(this.velocity.dot(this.forward)) / (2 * Math.PI * this.WHEEL_RADIUS)) * 60;
      const drivenRpm = wheelRpm * totalRatio;

      // Engine load calculation (high when pushing through mud or climbing in high gear)
      const targetRpm = Math.max(idleRpm, drivenRpm);

      if (this.throttleInput > 0.1 && targetRpm < 1100 && this.currentGear >= 3 && Math.abs(this.speedKmh) < 15) {
        // Engine is lugging / struggling!
        this.engineLoad = 1.0;
      } else {
        this.engineLoad = Math.min(1.0, this.throttleInput * 0.8 + (this.rutResistance * 1.5));
      }

      this.engineRpm = THREE.MathUtils.lerp(this.engineRpm, Math.min(maxRpm, Math.max(idleRpm, targetRpm)), dt * 9.0);
    }
  }

  private updateHeadBobbing(dt: number, forwardAcc: number, maxWheelCompression: number) {
    // Driver sits at [x: -0.48, y: 1.25, z: 0.95] (directly above front left wheel!)
    // When front wheel hits a bump, the driver is thrown up and backwards!

    // Engine vibration (дрожь на холостых и оборотах)
    const engineVibe = Math.sin(performance.now() * 0.001 * (this.engineRpm / 60) * 2 * Math.PI) * (0.002 + this.engineLoad * 0.004);

    // Washboard gravel & road roughness tremor
    let roadJitter = 0;
    if (Math.abs(this.speedKmh) > 5 && this.currentSurface.surfaceType === 'dirt') {
      roadJitter = Math.sin(this.position.z * 18.0) * 0.012 * (Math.abs(this.speedKmh) / 40);
    }

    // Suspension shock impulse
    const verticalImpulse = this.bumpShock * 0.12;

    // Target head offset from equilibrium
    const targetOffsetY = verticalImpulse + engineVibe + roadJitter;
    const targetOffsetZ = -(forwardAcc / 9.81) * 0.05; // Head jerks forward on braking
    const targetOffsetX = -(this.yawRate * (this.speedKmh / 30)) * 0.04; // Head tilts in turn

    this.headOffset.x = THREE.MathUtils.lerp(this.headOffset.x, targetOffsetX, dt * 10.0);
    this.headOffset.y = THREE.MathUtils.lerp(this.headOffset.y, targetOffsetY, dt * 12.0);
    this.headOffset.z = THREE.MathUtils.lerp(this.headOffset.z, targetOffsetZ, dt * 8.0);

    // Head rotational tilt
    this.headRot.x = THREE.MathUtils.lerp(this.headRot.x, -(targetOffsetZ * 1.5) + (verticalImpulse * 0.5), dt * 10.0);
    this.headRot.z = THREE.MathUtils.lerp(this.headRot.z, (targetOffsetX * 1.2), dt * 8.0);
  }

  private updateVectors() {
    // Forward vector in horizontal X-Z plane with yaw
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)).normalize();
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw)).normalize();
    this.up.set(0, 1, 0);
  }
}
