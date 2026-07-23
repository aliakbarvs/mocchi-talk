import * as THREE from 'three';

export type MocchiMood = 'neutral' | 'happy' | 'curious' | 'thinking' | 'shy' | 'listening';

export type MocchiPalette = {
  cream: string;
  coral: string;
  sunshine: string;
  aqua: string;
  teal: string;
};

export type MocchiCharacter = {
  group: THREE.Group;
  setMood: (mood: MocchiMood) => void;
  update: (delta: number, elapsed: number) => void;
  dispose: () => void;
};

type FaceParts = {
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  leftBrow: THREE.Mesh;
  rightBrow: THREE.Mesh;
  neutralMouth: THREE.Group;
  smileMouth: THREE.Group;
  thinkingMouth: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
};

export function createMocchiCharacter(palette: MocchiPalette): MocchiCharacter {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  const creamMaterial = track(
    new THREE.MeshStandardMaterial({ color: palette.cream, roughness: 0.92, metalness: 0, flatShading: true })
  );
  const coralMaterial = track(
    new THREE.MeshStandardMaterial({ color: palette.coral, roughness: 0.88, metalness: 0, flatShading: true })
  );
  const yellowMaterial = track(
    new THREE.MeshStandardMaterial({ color: palette.sunshine, roughness: 0.86, metalness: 0, flatShading: true })
  );
  const aquaMaterial = track(
    new THREE.MeshStandardMaterial({ color: palette.aqua, roughness: 0.9, metalness: 0, flatShading: true })
  );
  const tealMaterial = track(
    new THREE.MeshStandardMaterial({ color: palette.teal, roughness: 0.76, metalness: 0 })
  );
  const blushMaterial = track(
    new THREE.MeshStandardMaterial({
      color: '#ff9a9a',
      roughness: 0.9,
      transparent: true,
      opacity: 0.72,
      flatShading: true
    })
  );
  const whiteMaterial = track(
    new THREE.MeshStandardMaterial({ color: '#fff8ec', roughness: 0.88, metalness: 0, flatShading: true })
  );
  const mouthWarmMaterial = track(
    new THREE.MeshStandardMaterial({ color: '#ff806b', roughness: 0.8, metalness: 0 })
  );

  const body = mesh(new THREE.SphereGeometry(1.18, 22, 16), creamMaterial);
  body.scale.set(1.18, 0.92, 0.72);
  body.position.y = 0.34;
  group.add(body);

  const leftEar = createEar(creamMaterial);
  leftEar.position.set(-0.72, 1.16, -0.03);
  leftEar.rotation.set(0.06, 0.2, 0.52);
  group.add(leftEar);

  const rightEar = createEar(creamMaterial);
  rightEar.position.set(0.72, 1.16, -0.03);
  rightEar.rotation.set(0.06, -0.2, -0.52);
  group.add(rightEar);

  const band = mesh(new THREE.BoxGeometry(2.13, 0.2, 0.12, 8, 2, 1), coralMaterial);
  band.position.set(0, 0.94, 0.78);
  band.rotation.x = -0.08;
  group.add(band);

  const leftBandSide = mesh(new THREE.BoxGeometry(0.33, 0.19, 0.1, 4, 1, 1), coralMaterial);
  leftBandSide.position.set(-1.06, 0.9, 0.42);
  leftBandSide.rotation.y = -0.92;
  group.add(leftBandSide);

  const rightBandSide = mesh(new THREE.BoxGeometry(0.33, 0.19, 0.1, 4, 1, 1), coralMaterial);
  rightBandSide.position.set(1.06, 0.9, 0.42);
  rightBandSide.rotation.y = 0.92;
  group.add(rightBandSide);

  const knot = mesh(new THREE.SphereGeometry(0.16, 14, 8), coralMaterial);
  knot.scale.set(1, 0.75, 0.5);
  knot.position.set(1.26, 0.87, 0.18);
  group.add(knot);

  const tieA = mesh(new THREE.ConeGeometry(0.11, 0.42, 12), coralMaterial);
  tieA.position.set(1.39, 0.7, 0.17);
  tieA.rotation.set(0.55, 0.2, -0.72);
  group.add(tieA);

  const tieB = mesh(new THREE.ConeGeometry(0.1, 0.36, 12), coralMaterial);
  tieB.position.set(1.4, 1.0, 0.15);
  tieB.rotation.set(-0.55, 0.1, -0.84);
  group.add(tieB);

  const emblem = createEmblem(whiteMaterial, coralMaterial, yellowMaterial, aquaMaterial, tealMaterial);
  emblem.position.set(0, 1.01, 0.88);
  group.add(emblem);

  const leftArm = mesh(new THREE.SphereGeometry(0.22, 14, 10), creamMaterial);
  leftArm.scale.set(0.65, 1.15, 0.55);
  leftArm.position.set(-1.1, 0.16, 0.25);
  leftArm.rotation.z = -0.22;
  group.add(leftArm);

  const rightArm = mesh(new THREE.SphereGeometry(0.22, 14, 10), creamMaterial);
  rightArm.scale.set(0.65, 1.15, 0.55);
  rightArm.position.set(1.1, 0.16, 0.25);
  rightArm.rotation.z = 0.22;
  group.add(rightArm);

  const leftFoot = mesh(new THREE.SphereGeometry(0.22, 14, 8), creamMaterial);
  leftFoot.scale.set(1.15, 0.45, 0.7);
  leftFoot.position.set(-0.42, -0.53, 0.46);
  group.add(leftFoot);

  const rightFoot = mesh(new THREE.SphereGeometry(0.22, 14, 8), creamMaterial);
  rightFoot.scale.set(1.15, 0.45, 0.7);
  rightFoot.position.set(0.42, -0.53, 0.46);
  group.add(rightFoot);

  const leftEye = mesh(new THREE.SphereGeometry(0.085, 16, 10), tealMaterial);
  leftEye.scale.set(0.9, 1.25, 0.28);
  leftEye.position.set(-0.38, 0.43, 0.86);
  group.add(leftEye);

  const rightEye = leftEye.clone();
  rightEye.position.x = 0.38;
  group.add(rightEye);

  const leftBrow = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 10), tealMaterial);
  leftBrow.position.set(-0.39, 0.68, 0.87);
  leftBrow.rotation.set(Math.PI / 2, 0, -0.86);
  group.add(leftBrow);

  const rightBrow = mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.32, 10), tealMaterial);
  rightBrow.position.set(0.39, 0.68, 0.87);
  rightBrow.rotation.set(Math.PI / 2, 0, 0.86);
  group.add(rightBrow);

  const neutralMouth = createCatMouth(tealMaterial);
  neutralMouth.position.set(0, 0.28, 0.9);
  group.add(neutralMouth);

  const smileMouth = createSmileMouth(tealMaterial, mouthWarmMaterial);
  smileMouth.position.set(0, 0.25, 0.9);
  smileMouth.visible = false;
  group.add(smileMouth);

  const thinkingMouth = mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 20), tealMaterial);
  thinkingMouth.position.set(0, 0.27, 0.9);
  thinkingMouth.scale.set(0.75, 1, 0.12);
  thinkingMouth.visible = false;
  group.add(thinkingMouth);

  const leftBlush = mesh(new THREE.SphereGeometry(0.13, 14, 8), blushMaterial);
  leftBlush.scale.set(1.35, 0.72, 0.16);
  leftBlush.position.set(-0.64, 0.19, 0.84);
  group.add(leftBlush);

  const rightBlush = leftBlush.clone();
  rightBlush.position.x = 0.64;
  group.add(rightBlush);

  const faceParts: FaceParts = {
    leftEye,
    rightEye,
    leftBrow,
    rightBrow,
    neutralMouth,
    smileMouth,
    thinkingMouth,
    leftArm,
    rightArm
  };

  let mood: MocchiMood = 'neutral';
  setMood('neutral');

  return {
    group,
    setMood,
    update,
    dispose
  };

  function setMood(nextMood: MocchiMood): void {
    mood = nextMood;
    applyMood(faceParts, mood);
  }

  function update(_delta: number, elapsed: number): void {
    const bob = Math.sin(elapsed * 2.2) * 0.035;
    group.position.y = -0.45 + bob;
    group.rotation.y = Math.sin(elapsed * 0.9) * 0.06;

    if (mood === 'happy') {
      faceParts.leftArm.rotation.z = -0.65 + Math.sin(elapsed * 4) * 0.08;
      faceParts.rightArm.rotation.z = 0.65 - Math.sin(elapsed * 4) * 0.08;
    } else if (mood === 'listening') {
      faceParts.leftArm.rotation.z = -0.12;
      faceParts.rightArm.rotation.z = 0.12;
      group.rotation.y = Math.sin(elapsed * 2.4) * 0.1;
    }
  }

  function dispose(): void {
    disposables.forEach((item) => item.dispose());
  }

  function track<T extends { dispose: () => void }>(item: T): T {
    disposables.push(item);
    return item;
  }

  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    track(geometry);
    return new THREE.Mesh(geometry, material);
  }
}

function createEar(material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.ConeGeometry(0.33, 0.58, 16, 1);
  const ear = new THREE.Mesh(geometry, material);
  ear.scale.set(1, 0.82, 0.86);
  return ear;
}

function createEmblem(
  whiteMaterial: THREE.Material,
  coralMaterial: THREE.Material,
  yellowMaterial: THREE.Material,
  aquaMaterial: THREE.Material,
  tealMaterial: THREE.Material
): THREE.Group {
  const group = new THREE.Group();
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.34, 0.05), whiteMaterial);
  group.add(plate);

  const colors = [coralMaterial, yellowMaterial, aquaMaterial];
  const xPositions = [-0.16, 0, 0.16];
  colors.forEach((material, index) => {
    const pill = new THREE.Mesh(createPillGeometry(0.15, 0.28, 0.035), material);
    pill.position.set(xPositions[index], 0, 0.045);
    group.add(pill);
  });

  const dotLeft = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), tealMaterial);
  dotLeft.position.set(-0.18, 0.07, 0.07);
  group.add(dotLeft);

  const dotRight = dotLeft.clone();
  dotRight.position.x = 0.18;
  group.add(dotRight);

  return group;
}

function createPillGeometry(width: number, height: number, depth: number): THREE.ExtrudeGeometry {
  const radius = width / 2;
  const halfHeight = height / 2 - radius;
  const shape = new THREE.Shape();
  shape.moveTo(-radius, -halfHeight);
  shape.quadraticCurveTo(-radius, -halfHeight - radius, 0, -halfHeight - radius);
  shape.quadraticCurveTo(radius, -halfHeight - radius, radius, -halfHeight);
  shape.lineTo(radius, halfHeight);
  shape.quadraticCurveTo(radius, halfHeight + radius, 0, halfHeight + radius);
  shape.quadraticCurveTo(-radius, halfHeight + radius, -radius, halfHeight);
  shape.lineTo(-radius, -halfHeight);

  return new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    curveSegments: 8
  });
}

function createCatMouth(material: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const left = createMouthCurve(
    [
      new THREE.Vector3(-0.16, 0.05, 0),
      new THREE.Vector3(-0.09, -0.05, 0.02),
      new THREE.Vector3(0, 0.02, 0)
    ],
    material
  );
  const right = createMouthCurve(
    [
      new THREE.Vector3(0, 0.02, 0),
      new THREE.Vector3(0.09, -0.05, 0.02),
      new THREE.Vector3(0.16, 0.05, 0)
    ],
    material
  );
  group.add(left, right);
  return group;
}

function createSmileMouth(lineMaterial: THREE.Material, fillMaterial: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const smile = createMouthCurve(
    [
      new THREE.Vector3(-0.17, 0.05, 0),
      new THREE.Vector3(0, -0.1, 0.03),
      new THREE.Vector3(0.17, 0.05, 0)
    ],
    lineMaterial
  );
  const fill = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 8), fillMaterial);
  fill.scale.set(1, 0.7, 0.18);
  fill.position.y = -0.02;
  group.add(fill, smile);
  return group;
}

function createMouthCurve(points: THREE.Vector3[], material: THREE.Material): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.015, 8, false), material);
}

function applyMood(parts: FaceParts, mood: MocchiMood): void {
  parts.neutralMouth.visible = mood !== 'happy' && mood !== 'thinking' && mood !== 'listening';
  parts.smileMouth.visible = mood === 'happy' || mood === 'listening';
  parts.thinkingMouth.visible = mood === 'thinking';

  parts.leftEye.scale.set(0.9, 1.25, 0.28);
  parts.rightEye.scale.set(0.9, 1.25, 0.28);
  parts.leftArm.rotation.z = -0.22;
  parts.rightArm.rotation.z = 0.22;

  if (mood === 'happy') {
    parts.leftEye.scale.y = 0.32;
    parts.rightEye.scale.y = 0.32;
    parts.leftBrow.rotation.z = -0.55;
    parts.rightBrow.rotation.z = 0.55;
    parts.leftArm.rotation.z = -0.65;
    parts.rightArm.rotation.z = 0.65;
    return;
  }

  if (mood === 'curious') {
    parts.leftBrow.rotation.z = -1.05;
    parts.rightBrow.rotation.z = 0.38;
    parts.rightEye.scale.y = 1.45;
    return;
  }

  if (mood === 'thinking') {
    parts.leftBrow.rotation.z = -0.58;
    parts.rightBrow.rotation.z = 0.58;
    parts.leftArm.rotation.z = -0.04;
    parts.rightArm.rotation.z = -0.42;
    return;
  }

  if (mood === 'shy') {
    parts.leftBrow.rotation.z = -1.2;
    parts.rightBrow.rotation.z = 1.2;
    parts.leftEye.scale.y = 0.82;
    parts.rightEye.scale.y = 0.82;
    return;
  }

  if (mood === 'listening') {
    parts.leftBrow.rotation.z = -0.72;
    parts.rightBrow.rotation.z = 0.72;
    parts.leftEye.scale.y = 1.38;
    parts.rightEye.scale.y = 1.38;
    return;
  }

  parts.leftBrow.rotation.z = -0.86;
  parts.rightBrow.rotation.z = 0.86;
}
