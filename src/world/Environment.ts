import * as THREE from 'three';
import { RoadNetwork } from './RoadNetwork';

export class Environment {
  public group: THREE.Group = new THREE.Group();

  private birchMesh!: THREE.InstancedMesh;
  private spruceMesh!: THREE.InstancedMesh;
  private bushMesh!: THREE.InstancedMesh;

  private birchCount = 450;
  private spruceCount = 750;
  private bushCount = 500;

  private dummy = new THREE.Object3D();
  private powerPoles: THREE.Group = new THREE.Group();

  constructor(private roadNetwork: RoadNetwork) {
    this.createVegetation();
    this.createTelegraphPoles();
  }

  private createVegetation() {
    const loader = new THREE.TextureLoader();

    // 1. Birch Trees (Березы)
    const birchTex = loader.load('/textures/birch_sprite.png');
    birchTex.magFilter = THREE.NearestFilter;
    birchTex.minFilter = THREE.NearestFilter;
    const birchMat = new THREE.MeshStandardMaterial({
      map: birchTex,
      transparent: true,
      alphaTest: 0.45,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    const birchGeom = new THREE.PlaneGeometry(4.2, 8.0);
    birchGeom.translate(0, 4.0, 0);
    this.birchMesh = new THREE.InstancedMesh(birchGeom, birchMat, this.birchCount);
    this.birchMesh.castShadow = true;
    this.birchMesh.receiveShadow = true;

    // 2. Spruce Trees (Ели)
    const spruceTex = loader.load('/textures/spruce_sprite.png');
    spruceTex.magFilter = THREE.NearestFilter;
    spruceTex.minFilter = THREE.NearestFilter;
    const spruceMat = new THREE.MeshStandardMaterial({
      map: spruceTex,
      transparent: true,
      alphaTest: 0.45,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    const spruceGeom = new THREE.PlaneGeometry(4.8, 9.5);
    spruceGeom.translate(0, 4.75, 0);
    this.spruceMesh = new THREE.InstancedMesh(spruceGeom, spruceMat, this.spruceCount);
    this.spruceMesh.castShadow = true;
    this.spruceMesh.receiveShadow = true;

    // 3. Roadside autumn bushes
    const bushTex = loader.load('/textures/birch_sprite.png'); // use foliage slice or textured bush
    const bushMat = new THREE.MeshStandardMaterial({
      map: bushTex,
      transparent: true,
      alphaTest: 0.45,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const bushGeom = new THREE.PlaneGeometry(1.8, 1.8);
    bushGeom.translate(0, 0.9, 0);
    this.bushMesh = new THREE.InstancedMesh(bushGeom, bushMat, this.bushCount);

    let birchIdx = 0;
    let spruceIdx = 0;
    let bushIdx = 0;

    // RIGHT SIDE DENSE FOREST (Лес справа)
    // Starting street (z from 15 to -120)
    for (let z = 10; z > -120; z -= 3.5) {
      // Dense forest depth from x = 5.2 to x = 32.0
      for (let x = 5.2; x < 32.0; x += (3.0 + Math.random() * 2.0)) {
        const pz = z + (Math.random() - 0.5) * 2.5;
        const px = x + (Math.random() - 0.5) * 1.5;

        const isSpruce = Math.random() > 0.35;
        const scale = 0.85 + Math.random() * 0.5;

        this.dummy.position.set(px, -0.2, pz);
        this.dummy.scale.set(scale, scale, scale);
        this.dummy.rotation.set(0, Math.random() * Math.PI, 0);
        this.dummy.updateMatrix();

        if (isSpruce && spruceIdx < this.spruceCount) {
          this.spruceMesh.setMatrixAt(spruceIdx++, this.dummy.matrix);
        } else if (birchIdx < this.birchCount) {
          this.birchMesh.setMatrixAt(birchIdx++, this.dummy.matrix);
        }

        // Roadside bushes along the ditch (x ~ 4.2 to 5.2)
        if (x < 6.5 && bushIdx < this.bushCount && Math.random() < 0.6) {
          this.dummy.position.set(px - 1.0, -0.2, pz);
          this.dummy.scale.set(0.6 + Math.random() * 0.4, 0.6 + Math.random() * 0.4, 0.6 + Math.random() * 0.4);
          this.dummy.updateMatrix();
          this.bushMesh.setMatrixAt(bushIdx++, this.dummy.matrix);
        }
      }
    }

    // Populate remaining forest across the map
    for (let i = 2; i < this.roadNetwork.edges.length; i++) {
      const edge = this.roadNetwork.edges[i];
      const count = Math.floor(edge.length / 5.0);
      for (let j = 0; j < count; j++) {
        const t = j / count;
        const pt = edge.curve.getPointAt(t);
        const tan = edge.curve.getTangentAt(t).normalize();
        const side = new THREE.Vector3(-tan.z, 0, tan.x).normalize();

        for (const s of [-1, 1]) {
          const dist = 6.0 + Math.random() * 25.0;
          const pos = pt.clone().addScaledVector(side, dist * s);
          pos.y = -0.2;

          this.dummy.position.copy(pos);
          const scale = 0.9 + Math.random() * 0.6;
          this.dummy.scale.set(scale, scale, scale);
          this.dummy.rotation.set(0, Math.random() * Math.PI, 0);
          this.dummy.updateMatrix();

          if (Math.random() > 0.4 && spruceIdx < this.spruceCount) {
            this.spruceMesh.setMatrixAt(spruceIdx++, this.dummy.matrix);
          } else if (birchIdx < this.birchCount) {
            this.birchMesh.setMatrixAt(birchIdx++, this.dummy.matrix);
          }
        }
      }
    }

    // Fill remaining instances in background
    while (spruceIdx < this.spruceCount) {
      this.dummy.position.set(50 + Math.random() * 200, -0.2, -50 - Math.random() * 300);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.spruceMesh.setMatrixAt(spruceIdx++, this.dummy.matrix);
    }
    while (birchIdx < this.birchCount) {
      this.dummy.position.set(50 + Math.random() * 200, -0.2, -50 - Math.random() * 300);
      this.dummy.scale.set(1, 1, 1);
      this.dummy.updateMatrix();
      this.birchMesh.setMatrixAt(birchIdx++, this.dummy.matrix);
    }
    while (bushIdx < this.bushCount) {
      this.dummy.position.set(50 + Math.random() * 200, -0.2, -50 - Math.random() * 300);
      this.dummy.scale.set(0.8, 0.8, 0.8);
      this.dummy.updateMatrix();
      this.bushMesh.setMatrixAt(bushIdx++, this.dummy.matrix);
    }

    this.birchMesh.instanceMatrix.needsUpdate = true;
    this.spruceMesh.instanceMatrix.needsUpdate = true;
    this.bushMesh.instanceMatrix.needsUpdate = true;

    this.group.add(this.birchMesh);
    this.group.add(this.spruceMesh);
    this.group.add(this.bushMesh);
  }

  private createTelegraphPoles() {
    const poleGeom = new THREE.CylinderGeometry(0.1, 0.14, 6.5, 6);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x4e3828, roughness: 0.9 });

    const crossArmGeom = new THREE.BoxGeometry(1.6, 0.1, 0.1);
    const crossArmMat = new THREE.MeshStandardMaterial({ color: 0x3d2b1f });

    const polePositions: THREE.Vector3[] = [];

    // Poles along left side of village street (x = -4.8)
    for (let z = 10; z > -120; z -= 30) {
      const polePos = new THREE.Vector3(-4.8, 0, z);
      const poleGroup = new THREE.Group();
      poleGroup.position.copy(polePos);
      poleGroup.rotation.z = (Math.random() - 0.5) * 0.06;

      const poleMesh = new THREE.Mesh(poleGeom, poleMat);
      poleMesh.position.y = 3.25;
      poleGroup.add(poleMesh);

      const armMesh = new THREE.Mesh(crossArmGeom, crossArmMat);
      armMesh.position.y = 5.8;
      poleGroup.add(armMesh);

      this.powerPoles.add(poleGroup);

      const wireAnchor = polePos.clone();
      wireAnchor.y += 5.8;
      polePositions.push(wireAnchor);
    }

    // Sagging catenary wires
    const wirePoints: number[] = [];
    for (let i = 0; i < polePositions.length - 1; i++) {
      const p1 = polePositions[i];
      const p2 = polePositions[i + 1];

      for (let s = 0; s < 5; s++) {
        const tA = s / 5;
        const tB = (s + 1) / 5;

        const pA = new THREE.Vector3().lerpVectors(p1, p2, tA);
        const pB = new THREE.Vector3().lerpVectors(p1, p2, tB);

        pA.y -= Math.sin(tA * Math.PI) * 0.45;
        pB.y -= Math.sin(tB * Math.PI) * 0.45;

        wirePoints.push(pA.x, pA.y, pA.z, pB.x, pB.y, pB.z);
      }
    }

    const wireGeom = new THREE.BufferGeometry();
    wireGeom.setAttribute('position', new THREE.Float32BufferAttribute(wirePoints, 3));
    const wireLine = new THREE.LineSegments(wireGeom, new THREE.LineBasicMaterial({ color: 0x111111 }));

    this.group.add(this.powerPoles);
    this.group.add(wireLine);
  }

  public update(camera: THREE.Camera) {}
}
