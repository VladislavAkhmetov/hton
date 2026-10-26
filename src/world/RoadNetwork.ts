import * as THREE from 'three';
import { RoadSurfaceInfo } from '../physics/VehiclePhysics';
import { TextureGenerator } from '../core/TextureGenerator';

export interface RoadNode {
  id: string;
  name: string;
  position: THREE.Vector3;
  type: 'village' | 'junction' | 'bridge';
  description?: string;
  deliveryItem?: string;
  deliveryDialogue?: string;
}

export interface RoadEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  curve: THREE.CatmullRomCurve3;
  surfaceType: 'asphalt' | 'dirt' | 'mud';
  hasRuts: boolean;
  length: number;
}

export class RoadNetwork {
  public nodes: Map<string, RoadNode> = new Map();
  public edges: RoadEdge[] = [];
  public roadGroup: THREE.Group = new THREE.Group();
  public terrainMesh!: THREE.Mesh;
  public signMeshes: THREE.Group = new THREE.Group();
  public villageLandmarks: THREE.Group = new THREE.Group();
  public puddleMeshes: THREE.Group = new THREE.Group();

  private samplePoints: { point: THREE.Vector3; tangent: THREE.Vector3; edge: RoadEdge; t: number }[] = [];

  constructor() {
    this.createNetwork();
    this.buildRoadMeshes();
    this.buildTerrain();
    this.buildPuddles();
    this.buildRoadSigns();
    this.buildVillages();
  }

  private createNetwork() {
    this.nodes.set('zarechye', {
      id: 'zarechye',
      name: 'Заречье',
      position: new THREE.Vector3(0, 0, 0),
      type: 'village',
      description: 'Центральный поселок, почтовый узел и пристань',
      deliveryItem: 'Свежая периодика и пенсии',
      deliveryDialogue: '«Спасибо, сынок! Дороги нынче совсем развезло, а ты добрался. Держи пирожки с брусникой в дорогу!»'
    });

    this.nodes.set('fork_north', {
      id: 'fork_north',
      name: 'Развилка у вышки',
      position: new THREE.Vector3(30, 0.5, -220),
      type: 'junction',
    });

    this.nodes.set('sosnovka', {
      id: 'sosnovka',
      name: 'Сосновка',
      position: new THREE.Vector3(260, 4.0, -340),
      type: 'village',
      description: 'Лесная деревня у соснового бора, Сельпо',
      deliveryItem: 'Посылка из райцентра и чайник для Петровича',
      deliveryDialogue: '«Здорово, служивый! Петрович уж с утра у окна сидит, посылку ждет. Почтальонка Валя, распишись вот тут.»'
    });

    this.nodes.set('glukhovo_mud', {
      id: 'glukhovo_mud',
      name: 'Урочище Глухово',
      position: new THREE.Vector3(-180, -2, -360),
      type: 'village',
      description: 'Старая деревня в низине, глубокие глиняные колеи',
      deliveryItem: 'Лекарства для фельдшерского пункта',
      deliveryDialogue: '«Ох, на Буханке только и проехать через лощину! Спасибо сердечное, без аспирина дед совсем занемог бы.»'
    });

    this.nodes.set('dubrovka', {
      id: 'dubrovka',
      name: 'Дубровка',
      position: new THREE.Vector3(40, 6, -580),
      type: 'village',
      description: 'Живописное село с вековыми дубами и резными наличниками',
      deliveryItem: 'Письма от внуков и газета «Сельская жизнь»',
      deliveryDialogue: '«Айда в избу чаю с мятой попить! Бабка Марья письмо от сыночка с Севера получила, плачет от радости.»'
    });

    // Edge 1: Starting stretch through village street with uneven offroad, puddles, ruts
    this.addEdge('zarechye', 'fork_north', [
      new THREE.Vector3(0, 0, 15),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0.05, -30),
      new THREE.Vector3(3, 0.1, -70),
      new THREE.Vector3(8, 0.2, -120),
      new THREE.Vector3(18, 0.35, -170),
      new THREE.Vector3(30, 0.5, -220),
    ], 'mud', true);

    // Edge 2: Развилка -> Сосновка (Asphalt / hard gravel)
    this.addEdge('fork_north', 'sosnovka', [
      new THREE.Vector3(30, 0.5, -220),
      new THREE.Vector3(90, 1.8, -245),
      new THREE.Vector3(160, 2.8, -280),
      new THREE.Vector3(220, 3.5, -310),
      new THREE.Vector3(260, 4.0, -340),
    ], 'asphalt', false);

    // Edge 3: Развилка -> Глухово (Deep clay bog ruts)
    this.addEdge('fork_north', 'glukhovo_mud', [
      new THREE.Vector3(30, 0.5, -220),
      new THREE.Vector3(-25, 0.2, -250),
      new THREE.Vector3(-85, -1.0, -285),
      new THREE.Vector3(-140, -1.8, -320),
      new THREE.Vector3(-180, -2.0, -360),
    ], 'mud', true);

    // Edge 4: Сосновка -> Дубровка
    this.addEdge('sosnovka', 'dubrovka', [
      new THREE.Vector3(260, 4.0, -340),
      new THREE.Vector3(220, 4.8, -410),
      new THREE.Vector3(150, 5.5, -470),
      new THREE.Vector3(90, 5.8, -525),
      new THREE.Vector3(40, 6.0, -580),
    ], 'dirt', true);

    // Edge 5: Глухово -> Дубровка
    this.addEdge('glukhovo_mud', 'dubrovka', [
      new THREE.Vector3(-180, -2.0, -360),
      new THREE.Vector3(-135, 0.0, -430),
      new THREE.Vector3(-75, 2.5, -495),
      new THREE.Vector3(-15, 4.5, -545),
      new THREE.Vector3(40, 6.0, -580),
    ], 'mud', true);
  }

  private addEdge(fromId: string, toId: string, points: THREE.Vector3[], surfaceType: 'asphalt' | 'dirt' | 'mud', hasRuts: boolean) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.5);
    const edge: RoadEdge = {
      id: `${fromId}_to_${toId}`,
      fromNodeId: fromId,
      toNodeId: toId,
      curve,
      surfaceType,
      hasRuts,
      length: curve.getLength(),
    };
    this.edges.push(edge);

    const samplesCount = Math.max(30, Math.floor(edge.length / 2.0));
    for (let i = 0; i <= samplesCount; i++) {
      const t = i / samplesCount;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      this.samplePoints.push({ point, tangent, edge, t });
    }
  }

  /**
   * Generates highly uneven off-road 3D ribbon with real bumps, ruts, and puddles.
   */
  private buildRoadMeshes() {
    const mudPuddleTex = TextureGenerator.createMudPuddleRoadTexture();
    mudPuddleTex.wrapS = THREE.RepeatWrapping;
    mudPuddleTex.wrapT = THREE.RepeatWrapping;
    mudPuddleTex.repeat.set(1, 4);

    const asphaltTex = TextureGenerator.createAsphaltTexture();
    asphaltTex.wrapS = THREE.RepeatWrapping;
    asphaltTex.wrapT = THREE.RepeatWrapping;

    const mudMat = new THREE.MeshStandardMaterial({
      map: mudPuddleTex,
      roughness: 0.65,
      metalness: 0.25,
    });

    const asphaltMat = new THREE.MeshStandardMaterial({
      map: asphaltTex,
      roughness: 0.8,
      metalness: 0.1,
    });

    const ROAD_WIDTH = 4.6;

    for (const edge of this.edges) {
      const segments = Math.max(40, Math.floor(edge.length / 1.5));
      const vertices: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const center = edge.curve.getPointAt(t);
        const tangent = edge.curve.getTangentAt(t).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

        // Uneven off-road bumps and potholes
        const bumpY = edge.hasRuts ? (Math.sin(t * 85) * 0.035 + Math.sin(t * 190) * 0.02) : 0;

        // 5-point profile: Left shoulder, Left rut, Center grass hump, Right rut, Right shoulder
        const leftEdge = center.clone().addScaledVector(normal, -ROAD_WIDTH / 2);
        leftEdge.y -= 0.08;

        const leftRut = center.clone().addScaledVector(normal, -ROAD_WIDTH * 0.25);
        if (edge.hasRuts) leftRut.y -= (0.12 + Math.sin(t * 60) * 0.03); // Deep rut

        const centerHump = center.clone();
        centerHump.y += 0.04 + bumpY; // Raised center hump

        const rightRut = center.clone().addScaledVector(normal, ROAD_WIDTH * 0.25);
        if (edge.hasRuts) rightRut.y -= (0.12 + Math.cos(t * 60) * 0.03); // Deep rut

        const rightEdge = center.clone().addScaledVector(normal, ROAD_WIDTH / 2);
        rightEdge.y -= 0.08;

        const profilePoints = [leftEdge, leftRut, centerHump, rightRut, rightEdge];
        const vU = t * (edge.length / 3.5);

        for (let p = 0; p < profilePoints.length; p++) {
          const pt = profilePoints[p];
          vertices.push(pt.x, pt.y, pt.z);
          uvs.push(p / (profilePoints.length - 1), vU);
        }

        if (i < segments) {
          const base = i * 5;
          const next = (i + 1) * 5;
          for (let p = 0; p < 4; p++) {
            indices.push(base + p, next + p, base + p + 1);
            indices.push(base + p + 1, next + p, next + p + 1);
          }
        }
      }

      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geom.setIndex(indices);
      geom.computeVertexNormals();

      const mat = edge.surfaceType === 'asphalt' ? asphaltMat : mudMat;
      const mesh = new THREE.Mesh(geom, mat);
      mesh.receiveShadow = true;
      this.roadGroup.add(mesh);
    }
  }

  /**
   * Water puddle planes in wheel ruts with sky reflection.
   */
  private buildPuddles() {
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x5a6d7a,
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88,
    });

    const puddleLocations = [
      { x: -1.15, y: -0.06, z: -10, w: 1.1, l: 3.5 },
      { x: 1.15, y: -0.06, z: -16, w: 1.0, l: 4.2 },
      { x: -1.15, y: -0.05, z: -25, w: 1.2, l: 5.0 },
      { x: 1.15, y: -0.05, z: -38, w: 1.1, l: 4.0 },
      { x: -0.2, y: -0.04, z: -55, w: 2.2, l: 4.5 },
    ];

    for (const pl of puddleLocations) {
      const pGeom = new THREE.PlaneGeometry(pl.w, pl.l);
      pGeom.rotateX(-Math.PI / 2);
      const pMesh = new THREE.Mesh(pGeom, puddleMat);
      pMesh.position.set(pl.x, pl.y, pl.z);
      this.puddleMeshes.add(pMesh);
    }

    this.roadGroup.add(this.puddleMeshes);
  }

  /**
   * Clean terrain without any hills or domes intersecting the road corridor.
   */
  private buildTerrain() {
    const size = 800;
    const segments = 100;
    const geom = new THREE.PlaneGeometry(size, size, segments, segments);
    geom.rotateX(-Math.PI / 2);

    const pos = geom.attributes.position;
    const colors: number[] = [];

    const colGrass1 = new THREE.Color('#4d6b32'); // Soft Russian green
    const colGrass2 = new THREE.Color('#6c7f3e'); // Muted olive
    const colGrass3 = new THREE.Color('#948c48'); // Autumn grass
    const colMud = new THREE.Color('#46382a');    // Soil

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      let y = -0.25;

      // Distant rolling hills (far away from road)
      if (Math.abs(x) > 35 || z < -250) {
        const h1 = Math.sin(x * 0.01) * Math.cos(z * 0.008) * 8.0;
        const h2 = Math.cos(x * 0.02) * Math.sin(z * 0.02) * 3.0;
        y += h1 + h2;
      }

      // Keep starting village road corridor completely flat and slightly below road level
      if (Math.abs(x) < 25 && z > -150 && z < 40) {
        y = -0.25;
      }

      pos.setY(i, y);

      const col = new THREE.Color();
      const distFromCenter = Math.abs(x);
      if (distFromCenter < 5.0) {
        col.lerpColors(colMud, colGrass1, 0.4);
      } else if (distFromCenter < 18.0) {
        col.lerpColors(colGrass1, colGrass2, 0.6);
      } else {
        col.lerpColors(colGrass2, colGrass3, 0.5);
      }
      colors.push(col.r, col.g, col.b);
    }

    geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geom.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.05,
    });

    this.terrainMesh = new THREE.Mesh(geom, mat);
    this.terrainMesh.receiveShadow = true;
    this.roadGroup.add(this.terrainMesh);
  }

  /**
   * Village houses strictly on the LEFT, animals, and fences matching image2.
   */
  private buildVillages() {
    // 1. Pixel-art animals from image2 (sitting dog on left, cow by fence on right)
    const dogTex = TextureGenerator.createDogSprite();
    const dogMat = new THREE.MeshBasicMaterial({ map: dogTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
    const dogMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.4), dogMat);
    dogMesh.position.set(-3.6, 0.7, -15);
    this.villageLandmarks.add(dogMesh);

    const cowTex = TextureGenerator.createCowSprite();
    const cowMat = new THREE.MeshBasicMaterial({ map: cowTex, transparent: true, alphaTest: 0.35, side: THREE.DoubleSide });
    const cowMesh = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.8), cowMat);
    cowMesh.position.set(4.6, 0.9, -24);
    this.villageLandmarks.add(cowMesh);

    // 2. Left side: Authentic 3D Russian log cabins (пара домов слева)
    // House 1 (Izba with carved frames and gabled roof)
    this.createAuthenticIzba(new THREE.Vector3(-9.2, 0, -18), 0.05);

    // House 2 (Second Izba with shed)
    this.createAuthenticIzba(new THREE.Vector3(-9.8, 0, -48), -0.05);

    // 3. Wooden board fences along the left side
    this.createWoodenFence(new THREE.Vector3(-4.8, 0, 5), new THREE.Vector3(-4.8, 0, -65));

    this.roadGroup.add(this.villageLandmarks);
  }

  private createAuthenticIzba(pos: THREE.Vector3, rotY: number = 0) {
    const izba = new THREE.Group();
    izba.position.copy(pos);
    izba.rotation.y = rotY;

    const logTex = TextureGenerator.createLogWallTexture();
    const roofTex = TextureGenerator.createRoofTexture();
    const winTex = TextureGenerator.createWindowTexture();

    const wallMat = new THREE.MeshStandardMaterial({ map: logTex, roughness: 0.9 });
    const roofMat = new THREE.MeshStandardMaterial({ map: roofTex, roughness: 0.85 });
    const winMat = new THREE.MeshBasicMaterial({ map: winTex });

    // Main log body box
    const bodyGeom = new THREE.BoxGeometry(6.4, 3.4, 5.4);
    const body = new THREE.Mesh(bodyGeom, wallMat);
    body.position.y = 1.7;
    izba.add(body);

    // Gabled triangular roof
    const roofGeom = new THREE.ConeGeometry(5.2, 2.4, 4);
    roofGeom.rotateY(Math.PI / 4);
    roofGeom.scale(1.0, 1.0, 1.25);
    const roof = new THREE.Mesh(roofGeom, roofMat);
    roof.position.y = 4.4;
    izba.add(roof);

    // White carved windows facing the road
    const winGeom = new THREE.PlaneGeometry(1.2, 1.3);
    const win1 = new THREE.Mesh(winGeom, winMat);
    win1.position.set(1.5, 1.8, 2.72);
    izba.add(win1);

    const win2 = new THREE.Mesh(winGeom, winMat);
    win2.position.set(-1.5, 1.8, 2.72);
    izba.add(win2);

    // Brick chimney
    const chim = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5), new THREE.MeshStandardMaterial({ color: 0x8b3a2b }));
    chim.position.set(1.2, 5.2, -0.5);
    izba.add(chim);

    this.villageLandmarks.add(izba);
  }

  private createWoodenFence(start: THREE.Vector3, end: THREE.Vector3) {
    const fenceMat = new THREE.MeshStandardMaterial({ color: 0x5a4635, roughness: 0.95 });
    const postGeom = new THREE.BoxGeometry(0.1, 1.2, 0.1);
    const railGeom = new THREE.BoxGeometry(2.4, 0.08, 0.04);

    const len = start.distanceTo(end);
    const steps = Math.floor(len / 2.0);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const p = new THREE.Vector3().lerpVectors(start, end, t);

      const post = new THREE.Mesh(postGeom, fenceMat);
      post.position.set(p.x, 0.6, p.z);
      this.villageLandmarks.add(post);

      if (i < steps) {
        const nextP = new THREE.Vector3().lerpVectors(start, end, (i + 1) / steps);
        const mid = new THREE.Vector3().lerpVectors(p, nextP, 0.5);

        const rail1 = new THREE.Mesh(railGeom, fenceMat);
        rail1.position.set(mid.x, 0.85, mid.z);
        rail1.lookAt(nextP.x, 0.85, nextP.z);
        this.villageLandmarks.add(rail1);

        const rail2 = new THREE.Mesh(railGeom, fenceMat);
        rail2.position.set(mid.x, 0.35, mid.z);
        rail2.lookAt(nextP.x, 0.35, nextP.z);
        this.villageLandmarks.add(rail2);
      }
    }
  }

  private buildRoadSigns() {
    this.addSignPost(new THREE.Vector3(3.8, 0, -22), 'Сосновка', 'straight', '2.5', Math.PI);
    this.roadGroup.add(this.signMeshes);
  }

  private addSignPost(pos: THREE.Vector3, text: string, arrow: 'left' | 'right' | 'straight' | 'none', distKm?: string, rotY: number = 0) {
    const postGroup = new THREE.Group();
    postGroup.position.copy(pos);
    postGroup.rotation.y = rotY;

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 6), new THREE.MeshStandardMaterial({ color: 0x4a4f54 }));
    pole.position.y = 1.2;
    postGroup.add(pole);

    const signTex = TextureGenerator.createRoadSignTexture(text, arrow, distKm);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.7), new THREE.MeshBasicMaterial({ map: signTex, side: THREE.DoubleSide }));
    board.position.set(0, 1.9, 0.05);
    postGroup.add(board);

    this.signMeshes.add(postGroup);
  }

  public querySurface(x: number, z: number): RoadSurfaceInfo {
    let closestDistSq = Infinity;
    let closestSample = this.samplePoints[0];

    for (let i = 0; i < this.samplePoints.length; i++) {
      const sp = this.samplePoints[i];
      const dx = x - sp.point.x;
      const dz = z - sp.point.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < closestDistSq) {
        closestDistSq = distSq;
        closestSample = sp;
      }
    }

    const ROAD_HALF_WIDTH = 2.3;
    const distToCenter = Math.sqrt(closestDistSq);

    if (distToCenter <= ROAD_HALF_WIDTH) {
      const edge = closestSample.edge;
      const roadElevation = closestSample.point.y;

      const tangent = closestSample.tangent;
      const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      const toVehicle = new THREE.Vector3(x - closestSample.point.x, 0, z - closestSample.point.z);
      const lateralDist = toVehicle.dot(normal);
      const rutOffset = lateralDist / ROAD_HALF_WIDTH;

      let rutDepth = 0;
      if (edge.hasRuts) {
        const leftTrackDist = Math.abs(rutOffset + 0.48);
        const rightTrackDist = Math.abs(rutOffset - 0.48);
        const minTrackDist = Math.min(leftTrackDist, rightTrackDist);
        if (minTrackDist < 0.28) {
          rutDepth = (1.0 - minTrackDist / 0.28) * 0.16;
        }
      }

      return {
        surfaceType: edge.surfaceType,
        elevation: roadElevation - rutDepth,
        normal: new THREE.Vector3(0, 1, 0),
        rutDepth,
        rutOffset,
        isOffroad: false,
      };
    } else {
      return {
        surfaceType: 'dirt',
        elevation: -0.25,
        normal: new THREE.Vector3(0, 1, 0),
        rutDepth: 0,
        rutOffset: 0,
        isOffroad: true,
      };
    }
  }
}
