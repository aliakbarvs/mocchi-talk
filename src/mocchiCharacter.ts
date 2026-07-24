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
  triggerTap: () => void;
  setSpeaking: (active: boolean) => void;
  update: (delta: number, elapsed: number) => void;
  dispose: () => void;
};

type Rig = {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftFoot: THREE.Group;
  rightFoot: THREE.Group;
  headband: THREE.Group;
  face: THREE.Group;
  eyes: THREE.Group;
  mouth: THREE.Group;
};

type FaceParts = {
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  leftBrow: THREE.Mesh;
  rightBrow: THREE.Mesh;
  neutralMouth: THREE.Group;
  smileMouth: THREE.Group;
  thinkingMouth: THREE.Mesh;
  openMouth: THREE.Mesh;
  leftBlush: THREE.Mesh;
  rightBlush: THREE.Mesh;
  blushMaterial: THREE.MeshStandardMaterial;
};

type MoodPose = {
  rootRotation: THREE.Euler;
  bodyScale: THREE.Vector3;
  bodyRotation: THREE.Euler;
  headRotation: THREE.Euler;
  leftArmRotation: THREE.Euler;
  rightArmRotation: THREE.Euler;
  leftEyeScale: THREE.Vector3;
  rightEyeScale: THREE.Vector3;
  leftBrowRotation: THREE.Euler;
  rightBrowRotation: THREE.Euler;
  mouth: 'neutral' | 'smile' | 'thinking';
  blushScale: number;
  blushOpacity: number;
};

const TAP_DURATION = 0.42;
const BASE_BODY_SCALE = new THREE.Vector3(1, 1, 1);
const BASE_EYE_SCALE = new THREE.Vector3(0.95, 1.28, 0.34);

export function createMocchiCharacter(palette: MocchiPalette): MocchiCharacter {
  const group = new THREE.Group();
  group.name = 'MocchiCharacter';

  const disposables: Array<{ dispose: () => void }> = [];

  const creamMaterial = track(new THREE.MeshStandardMaterial({ color: palette.cream, roughness: 0.86, metalness: 0 }));
  const coralMaterial = track(new THREE.MeshStandardMaterial({ color: palette.coral, roughness: 0.78, metalness: 0 }));
  const yellowMaterial = track(new THREE.MeshStandardMaterial({ color: palette.sunshine, roughness: 0.72, metalness: 0 }));
  const aquaMaterial = track(new THREE.MeshStandardMaterial({ color: palette.aqua, roughness: 0.72, metalness: 0 }));
  const tealMaterial = track(new THREE.MeshStandardMaterial({ color: palette.teal, roughness: 0.62, metalness: 0 }));
  const blushMaterial = track(
    new THREE.MeshStandardMaterial({
      color: '#F58D93',
      roughness: 0.9,
      transparent: true,
      opacity: 0.9
    })
  );
  const whiteMaterial = track(new THREE.MeshStandardMaterial({ color: '#fff8ec', roughness: 0.82, metalness: 0 }));
  const bodyMaterial = track(new THREE.MeshStandardMaterial({ color: '#fff8ec', roughness: 0.86, metalness: 0 }));
  const mouthWarmMaterial = track(new THREE.MeshStandardMaterial({ color: '#ff806b', roughness: 0.76, metalness: 0 }));

  const rig = createRig();
  group.add(rig.root);

  const bodyMesh = tag(mesh(createSoftBodyGeometry(), bodyMaterial), 'body-shell');
  bodyMesh.name = 'Soft oblate cream mochi body';
  bodyMesh.scale.set(1.18, 0.97, 0.8);
  bodyMesh.position.y = 0.34;
  rig.body.add(bodyMesh);

  addFoot(rig.leftFoot, -1, bodyMaterial);
  addFoot(rig.rightFoot, 1, bodyMaterial);

  addArm(rig.leftArm, -1, bodyMaterial);
  addArm(rig.rightArm, 1, bodyMaterial);

  const leftEarPivot = createEarPivot('leftEar', -1, creamMaterial);
  const rightEarPivot = createEarPivot('rightEar', 1, creamMaterial);
  rig.head.add(leftEarPivot, rightEarPivot);

  addHeadband(rig.headband, coralMaterial, whiteMaterial, yellowMaterial, aquaMaterial, tealMaterial);

  const leftEye = tag(mesh(new THREE.SphereGeometry(0.085, 24, 16), tealMaterial), 'eye');
  leftEye.scale.copy(BASE_EYE_SCALE);
  leftEye.position.set(-0.36, 0.45, 0.81);
  rig.eyes.add(leftEye);

  const rightEye = leftEye.clone();
  tag(rightEye, 'eye');
  rightEye.position.x = 0.36;
  rig.eyes.add(rightEye);

  const leftBrow = tag(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.33, 16), tealMaterial), 'brow');
  leftBrow.position.set(-0.38, 0.67, 0.82);
  leftBrow.rotation.set(Math.PI / 2, 0, -0.86);
  rig.face.add(leftBrow);

  const rightBrow = tag(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.33, 16), tealMaterial), 'brow');
  rightBrow.position.set(0.38, 0.67, 0.82);
  rightBrow.rotation.set(Math.PI / 2, 0, 0.86);
  rig.face.add(rightBrow);

  const neutralMouth = createCatMouth(tealMaterial);
  neutralMouth.position.set(0, 0.23, 0.84);
  rig.mouth.add(neutralMouth);

  const smileMouth = createSmileMouth(tealMaterial, mouthWarmMaterial);
  smileMouth.position.set(0, 0.23, 0.84);
  rig.mouth.add(smileMouth);

  const thinkingMouth = mesh(new THREE.TorusGeometry(0.07, 0.018, 8, 20), tealMaterial);
  thinkingMouth.position.set(0, 0.24, 0.85);
  thinkingMouth.scale.set(0.75, 1, 0.12);
  rig.mouth.add(thinkingMouth);

  const openMouth = mesh(new THREE.SphereGeometry(0.086, 18, 10), mouthWarmMaterial);
  openMouth.position.set(0, 0.22, 0.85);
  openMouth.scale.set(0.8, 0.2, 0.13);
  rig.mouth.add(openMouth);

  const leftBlush = tag(mesh(new THREE.SphereGeometry(0.12, 18, 10), blushMaterial), 'blush');
  leftBlush.scale.set(1.45, 0.58, 0.14);
  leftBlush.position.set(-0.58, 0.07, 0.8);
  rig.face.add(leftBlush);

  const rightBlush = leftBlush.clone();
  tag(rightBlush, 'blush');
  rightBlush.position.x = 0.58;
  rig.face.add(rightBlush);

  const faceParts: FaceParts = {
    leftEye,
    rightEye,
    leftBrow,
    rightBrow,
    neutralMouth,
    smileMouth,
    thinkingMouth,
    openMouth,
    leftBlush,
    rightBlush,
    blushMaterial
  };

  let mood: MocchiMood = 'neutral';
  let speaking = false;
  let tapElapsed = TAP_DURATION;
  let disposed = false;
  applyMouth(faceParts, mood, speaking);

  return {
    group,
    setMood,
    triggerTap,
    setSpeaking,
    update,
    dispose
  };

  function setMood(nextMood: MocchiMood): void {
    mood = nextMood;
    applyMouth(faceParts, mood, speaking);
  }

  function triggerTap(): void {
    tapElapsed = 0;
  }

  function setSpeaking(active: boolean): void {
    speaking = active;
    applyMouth(faceParts, mood, speaking);
  }

  function update(delta: number, elapsed: number): void {
    if (disposed) {
      return;
    }

    const pose = createMoodPose(mood);
    const phase = moodPhase(mood, elapsed);
    const idleFloat = Math.sin(elapsed * 2.4) * 0.026;
    const idleYaw = Math.sin(elapsed * 0.72) * 0.085;
    const breathe = 1 + Math.sin(elapsed * 2.05) * 0.018;

    pose.rootRotation.y += idleYaw;
    pose.bodyScale.set(1 + (breathe - 1) * 0.58, breathe, 1 + (breathe - 1) * 0.36);

    if (mood === 'happy') {
      pose.rootRotation.x += Math.sin(phase * Math.PI * 2) * 0.035;
      pose.leftArmRotation.z += Math.sin(phase * Math.PI * 4) * 0.16;
      pose.rightArmRotation.z -= Math.sin(phase * Math.PI * 4) * 0.16;
    }

    if (mood === 'listening') {
      pose.headRotation.y += Math.sin(phase * Math.PI * 2) * 0.16;
    }

    if (mood === 'shy' || mood === 'thinking') {
      pose.rootRotation.z += Math.sin(phase * Math.PI * 2) * (mood === 'shy' ? 0.045 : 0.025);
    }

    const tap = tapEnvelope(delta);
    const tapSquash = 1 + tap * 0.09;
    const tapStretch = 1 - tap * 0.075;
    const tapForward = tap * 0.065;

    const targetRootPosition = new THREE.Vector3(0, idleFloat + tap * 0.045, tapForward);
    const targetRootScale = new THREE.Vector3(tapSquash, tapStretch, tapSquash);
    const targetRootRotation = pose.rootRotation.clone();
    targetRootRotation.x += tap * -0.12;

    dampVector(rig.root.position, targetRootPosition, delta, 9);
    dampVector(rig.root.scale, targetRootScale, delta, 12);
    dampEuler(rig.root.rotation, targetRootRotation, delta, 9);
    dampVector(rig.body.scale, pose.bodyScale, delta, 8);
    dampEuler(rig.body.rotation, pose.bodyRotation, delta, 8);
    dampEuler(rig.head.rotation, pose.headRotation, delta, 8);
    dampEuler(rig.leftArm.rotation, pose.leftArmRotation, delta, 10);
    dampEuler(rig.rightArm.rotation, pose.rightArmRotation, delta, 10);
    dampVector(faceParts.leftEye.scale, pose.leftEyeScale, delta, 12);
    dampVector(faceParts.rightEye.scale, pose.rightEyeScale, delta, 12);
    dampEuler(faceParts.leftBrow.rotation, pose.leftBrowRotation, delta, 12);
    dampEuler(faceParts.rightBrow.rotation, pose.rightBrowRotation, delta, 12);

    const blushScale = new THREE.Vector3(1.45 * pose.blushScale, 0.58 * pose.blushScale, 0.14);
    dampVector(faceParts.leftBlush.scale, blushScale, delta, 9);
    dampVector(faceParts.rightBlush.scale, blushScale, delta, 9);
    faceParts.blushMaterial.opacity = damp(faceParts.blushMaterial.opacity, pose.blushOpacity, delta, 8);

    if (speaking) {
      const chatter = 0.2 + (Math.sin(elapsed * 21) * 0.5 + 0.5) * 0.9;
      faceParts.openMouth.scale.set(0.82, chatter, 0.13);
    }
  }

  function dispose(): void {
    disposed = true;
    disposables.forEach((item) => item.dispose());
  }

  function createRig(): Rig {
    const root = new THREE.Group();
    root.name = 'root';
    const body = new THREE.Group();
    body.name = 'body';
    const head = new THREE.Group();
    head.name = 'head';
    const leftArm = new THREE.Group();
    leftArm.name = 'leftArm';
    leftArm.position.set(-0.98, 0.26, 0.2);
    const rightArm = new THREE.Group();
    rightArm.name = 'rightArm';
    rightArm.position.set(0.98, 0.26, 0.2);
    const leftFoot = new THREE.Group();
    leftFoot.name = 'leftFoot';
    leftFoot.position.set(-0.42, -0.5, 0.35);
    const rightFoot = new THREE.Group();
    rightFoot.name = 'rightFoot';
    rightFoot.position.set(0.42, -0.5, 0.35);
    const headband = new THREE.Group();
    headband.name = 'headband';
    const face = new THREE.Group();
    face.name = 'face';
    const eyes = new THREE.Group();
    eyes.name = 'eyes';
    const mouth = new THREE.Group();
    mouth.name = 'mouth';

    root.add(body);
    body.add(head, leftArm, rightArm, leftFoot, rightFoot);
    head.add(headband, face);
    face.add(eyes, mouth);

    return { root, body, head, leftArm, rightArm, leftFoot, rightFoot, headband, face, eyes, mouth };
  }

  function addArm(parent: THREE.Group, side: -1 | 1, material: THREE.Material): void {
    const arm = tag(mesh(new THREE.SphereGeometry(0.22, 24, 14), material), side < 0 ? 'left-arm' : 'right-arm', {
      embedDepth: 0.09
    });
    arm.name = side < 0 ? 'Left stubby arm' : 'Right stubby arm';
    arm.scale.set(0.7, 1.1, 0.58);
    arm.position.set(side * 0.02, -0.13, 0.02);
    arm.rotation.z = side * 0.08;
    const attachmentBlend = mesh(new THREE.SphereGeometry(0.18, 18, 10), material);
    attachmentBlend.name = side < 0 ? 'Left arm body blend' : 'Right arm body blend';
    attachmentBlend.scale.set(0.58, 0.86, 0.46);
    attachmentBlend.position.set(side * -0.03, -0.03, -0.03);
    parent.add(arm);
    parent.add(attachmentBlend);
  }

  function addFoot(parent: THREE.Group, side: -1 | 1, material: THREE.Material): void {
    const foot = tag(mesh(new THREE.SphereGeometry(0.2, 24, 12), material), side < 0 ? 'left-foot' : 'right-foot', {
      embedDepth: 0.08
    });
    foot.name = side < 0 ? 'Left embedded oval foot' : 'Right embedded oval foot';
    foot.scale.set(1.35, 0.42, 0.78);
    foot.position.set(0, 0, 0.04);
    parent.add(foot);
  }

  function addHeadband(
    parent: THREE.Group,
    coralMaterial: THREE.Material,
    whiteMaterial: THREE.Material,
    yellowMaterial: THREE.Material,
    aquaMaterial: THREE.Material,
    tealMaterial: THREE.Material
  ): void {
    const band = tag(mesh(createCurvedBandGeometry(1.16, 0.78, 0.2, 0.055, -1.38, 1.38, 52), coralMaterial), 'headband-front-wrap');
    band.name = 'Wrapped coral headband front';
    band.position.y = 0.89;
    parent.add(band);

    const stitchTop = mesh(createCurvedCordGeometry(1.17, 0.79, -1.34, 1.34, 52, 0.012), coralMaterial);
    stitchTop.name = 'Headband raised top seam';
    stitchTop.position.y = 1.0;
    parent.add(stitchTop);

    const stitchBottom = mesh(createCurvedCordGeometry(1.17, 0.79, -1.34, 1.34, 52, 0.012), coralMaterial);
    stitchBottom.name = 'Headband raised bottom seam';
    stitchBottom.position.y = 0.78;
    parent.add(stitchBottom);

    const knot = tag(mesh(new THREE.SphereGeometry(0.16, 22, 12), coralMaterial), 'headband-rear-knot');
    knot.name = 'Headband rear knot';
    knot.scale.set(1.1, 0.75, 0.52);
    knot.position.set(1.12, 0.84, -0.05);
    knot.rotation.y = 0.42;
    parent.add(knot);

    const tieA = tag(mesh(new THREE.CapsuleGeometry(0.055, 0.22, 8, 16), coralMaterial), 'headband-tail');
    tieA.name = 'Headband lower short tail';
    tieA.scale.set(0.8, 1, 0.42);
    tieA.position.set(1.2, 0.64, -0.02);
    tieA.rotation.set(0.2, 0.18, -0.68);
    parent.add(tieA);

    const tieB = tag(mesh(new THREE.CapsuleGeometry(0.052, 0.18, 8, 16), coralMaterial), 'headband-tail');
    tieB.name = 'Headband upper short tail';
    tieB.scale.set(0.78, 1, 0.42);
    tieB.position.set(1.19, 0.97, -0.01);
    tieB.rotation.set(-0.22, 0.18, -0.9);
    parent.add(tieB);

    const emblem = createEmblem(whiteMaterial, coralMaterial, yellowMaterial, aquaMaterial, tealMaterial);
    emblem.position.set(0, 0.91, 0.82);
    emblem.rotation.x = -0.04;
    parent.add(emblem);
  }

  function createEarPivot(name: string, side: -1 | 1, material: THREE.Material): THREE.Group {
    const pivot = new THREE.Group();
    pivot.name = name;
    pivot.position.set(side * 0.66, 1.08, -0.02);
    pivot.rotation.set(0.04, side * -0.16, side * -0.26);

    const ear = tag(mesh(createRoundedEarGeometry(), material), side < 0 ? 'left-ear' : 'right-ear');
    ear.name = side < 0 ? 'Left rounded cat ear' : 'Right rounded cat ear';
    ear.scale.set(0.24, 0.34, 0.22);
    ear.position.y = 0.05;
    pivot.add(ear);

    return pivot;
  }

  function createEmblem(
    whiteMaterial: THREE.Material,
    coralMaterial: THREE.Material,
    yellowMaterial: THREE.Material,
    aquaMaterial: THREE.Material,
    tealMaterial: THREE.Material
  ): THREE.Group {
    const emblem = new THREE.Group();
    emblem.name = 'Three-pill Matcha emblem';
    const plate = tag(mesh(createRoundedRectGeometry(0.47, 0.3, 0.045, 0.065), whiteMaterial), 'emblem-plate');
    plate.name = 'White rounded emblem plate';
    emblem.add(plate);

    [coralMaterial, yellowMaterial, aquaMaterial].forEach((material, index) => {
      const pill = tag(mesh(createPillGeometry(0.12, 0.23, 0.038), material), 'emblem-pill');
      pill.name = ['Coral emblem pill', 'Sunshine emblem pill', 'Aqua emblem pill'][index];
      pill.position.set([-0.125, 0, 0.125][index], 0, 0.045);
      emblem.add(pill);
    });

    const dotLeft = mesh(new THREE.SphereGeometry(0.02, 8, 6), tealMaterial);
    dotLeft.position.set(-0.15, 0.06, 0.07);
    emblem.add(dotLeft);

    const dotRight = dotLeft.clone();
    dotRight.position.x = 0.15;
    emblem.add(dotRight);

    return emblem;
  }

  function createCatMouth(material: THREE.Material): THREE.Group {
    const mouth = tag(new THREE.Group(), 'w-mouth');
    mouth.add(
      createMouthCurve(
        [
          new THREE.Vector3(-0.13, 0.045, 0),
          new THREE.Vector3(-0.075, -0.045, 0.02),
          new THREE.Vector3(0, 0.02, 0)
        ],
        material
      ),
      createMouthCurve(
        [
          new THREE.Vector3(0, 0.02, 0),
          new THREE.Vector3(0.075, -0.045, 0.02),
          new THREE.Vector3(0.13, 0.045, 0)
        ],
        material
      )
    );
    return mouth;
  }

  function createSmileMouth(lineMaterial: THREE.Material, fillMaterial: THREE.Material): THREE.Group {
    const mouth = new THREE.Group();
    const smile = createMouthCurve(
      [
        new THREE.Vector3(-0.17, 0.05, 0),
        new THREE.Vector3(0, -0.1, 0.03),
        new THREE.Vector3(0.17, 0.05, 0)
      ],
      lineMaterial
    );
    const fill = mesh(new THREE.SphereGeometry(0.09, 16, 8), fillMaterial);
    fill.scale.set(1, 0.7, 0.18);
    fill.position.y = -0.02;
    mouth.add(fill, smile);
    return mouth;
  }

  function createMouthCurve(points: THREE.Vector3[], material: THREE.Material): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3(points);
    return mesh(new THREE.TubeGeometry(curve, 12, 0.015, 8, false), material);
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
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.008,
      bevelThickness: 0.006,
      curveSegments: 10
    });
  }

  function createRoundedRectGeometry(width: number, height: number, depth: number, radius: number): THREE.ExtrudeGeometry {
    const x = width / 2;
    const y = height / 2;
    const shape = new THREE.Shape();
    shape.moveTo(-x + radius, -y);
    shape.lineTo(x - radius, -y);
    shape.quadraticCurveTo(x, -y, x, -y + radius);
    shape.lineTo(x, y - radius);
    shape.quadraticCurveTo(x, y, x - radius, y);
    shape.lineTo(-x + radius, y);
    shape.quadraticCurveTo(-x, y, -x, y - radius);
    shape.lineTo(-x, -y + radius);
    shape.quadraticCurveTo(-x, -y, -x + radius, -y);

    return new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.012,
      bevelThickness: 0.008,
      curveSegments: 10
    });
  }

  function createSoftBodyGeometry(): THREE.SphereGeometry {
    const geometry = new THREE.SphereGeometry(1, 64, 34);
    const position = geometry.attributes.position;

    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const z = position.getZ(index);
      const lowerRound = smoothstep(-0.18, -0.78, y) * 0.075;
      const baseSettle = smoothstep(-0.72, -1, y) * 0.12;
      const crownTuck = smoothstep(0.64, 1, y) * 0.035;

      position.setXYZ(index, x * (1 + lowerRound - crownTuck), y + baseSettle, z * (1 + lowerRound * 0.55));
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  function createRoundedEarGeometry(): THREE.SphereGeometry {
    const geometry = new THREE.SphereGeometry(1, 32, 18);
    const position = geometry.attributes.position;

    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getY(index);
      const z = position.getZ(index);
      const vertical = (y + 1) / 2;
      const roundedTaper = 1 - smoothstep(0.2, 1, vertical) * 0.62;
      const baseFullness = 1 + smoothstep(0.18, 0, vertical) * 0.12;

      position.setXYZ(index, x * roundedTaper * baseFullness, y * 0.92 + vertical * vertical * 0.12, z * (0.78 + (1 - vertical) * 0.22));
    }

    geometry.computeVertexNormals();
    return geometry;
  }

  function createCurvedBandGeometry(
    radiusX: number,
    radiusZ: number,
    height: number,
    thickness: number,
    thetaStart: number,
    thetaEnd: number,
    segments: number
  ): THREE.BufferGeometry {
    const vertices: number[] = [];
    const indices: number[] = [];

    for (let index = 0; index <= segments; index += 1) {
      const theta = thetaStart + ((thetaEnd - thetaStart) * index) / segments;
      const sin = Math.sin(theta);
      const cos = Math.cos(theta);

      vertices.push(
        sin * radiusX,
        -height / 2,
        cos * radiusZ,
        sin * radiusX,
        height / 2,
        cos * radiusZ,
        sin * (radiusX - thickness),
        -height / 2,
        cos * (radiusZ - thickness),
        sin * (radiusX - thickness),
        height / 2,
        cos * (radiusZ - thickness)
      );
    }

    for (let index = 0; index < segments; index += 1) {
      const a = index * 4;
      const b = a + 4;
      indices.push(a, b + 1, a + 1, a, b, b + 1);
      indices.push(a + 2, a + 3, b + 3, a + 2, b + 3, b + 2);
      indices.push(a + 1, b + 1, b + 3, a + 1, b + 3, a + 3);
      indices.push(a, a + 2, b + 2, a, b + 2, b);
    }

    const end = segments * 4;
    indices.push(0, 3, 2, 0, 1, 3);
    indices.push(end, end + 2, end + 3, end, end + 3, end + 1);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  function createCurvedCordGeometry(
    radiusX: number,
    radiusZ: number,
    thetaStart: number,
    thetaEnd: number,
    segments: number,
    radius: number
  ): THREE.TubeGeometry {
    const points: THREE.Vector3[] = [];

    for (let index = 0; index <= segments; index += 1) {
      const theta = thetaStart + ((thetaEnd - thetaStart) * index) / segments;
      points.push(new THREE.Vector3(Math.sin(theta) * radiusX, 0, Math.cos(theta) * radiusZ));
    }

    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 8, false);
  }

  function smoothstep(edge0: number, edge1: number, value: number): number {
    const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  function tag<T extends THREE.Object3D>(object: T, contractRole: string, extra: Record<string, unknown> = {}): T {
    object.userData = { ...object.userData, ...extra, contractRole };
    return object;
  }

  function track<T extends { dispose: () => void }>(item: T): T {
    disposables.push(item);
    return item;
  }

  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material): THREE.Mesh {
    track(geometry);
    return new THREE.Mesh(geometry, material);
  }

  function tapEnvelope(delta: number): number {
    if (tapElapsed >= TAP_DURATION) {
      return 0;
    }

    tapElapsed += delta > 0 ? delta : TAP_DURATION;
    const progress = Math.min(tapElapsed / TAP_DURATION, 1);
    return Math.sin(progress * Math.PI) * Math.exp(-progress * 1.85);
  }
}

function createMoodPose(mood: MocchiMood): MoodPose {
  const pose: MoodPose = {
    rootRotation: new THREE.Euler(0, 0, 0),
    bodyScale: BASE_BODY_SCALE.clone(),
    bodyRotation: new THREE.Euler(0, 0, 0),
    headRotation: new THREE.Euler(0, 0, 0),
    leftArmRotation: new THREE.Euler(0, 0, -0.22),
    rightArmRotation: new THREE.Euler(0, 0, 0.22),
    leftEyeScale: BASE_EYE_SCALE.clone(),
    rightEyeScale: BASE_EYE_SCALE.clone(),
    leftBrowRotation: new THREE.Euler(Math.PI / 2, 0, -0.86),
    rightBrowRotation: new THREE.Euler(Math.PI / 2, 0, 0.86),
    mouth: 'neutral',
    blushScale: 1,
    blushOpacity: 0.72
  };

  if (mood === 'happy') {
    pose.leftEyeScale.set(1.35, 0.2, 0.22);
    pose.rightEyeScale.set(1.35, 0.2, 0.22);
    pose.leftBrowRotation.z = -0.52;
    pose.rightBrowRotation.z = 0.52;
    pose.leftArmRotation.z = -1.05;
    pose.rightArmRotation.z = 1.05;
    pose.rootRotation.x = -0.03;
    pose.mouth = 'smile';
    return pose;
  }

  if (mood === 'curious') {
    pose.headRotation.z = 0.12;
    pose.headRotation.y = -0.08;
    pose.leftBrowRotation.z = -1.1;
    pose.rightBrowRotation.z = 0.34;
    pose.leftEyeScale.set(0.95, 1.34, 0.28);
    pose.rightEyeScale.set(1.03, 1.62, 0.28);
    return pose;
  }

  if (mood === 'thinking') {
    pose.rootRotation.y = -0.03;
    pose.headRotation.z = -0.06;
    pose.leftBrowRotation.z = -0.58;
    pose.rightBrowRotation.z = 0.58;
    pose.leftArmRotation.z = -0.06;
    pose.rightArmRotation.set(0.08, 0, -0.82);
    pose.mouth = 'thinking';
    return pose;
  }

  if (mood === 'shy') {
    pose.rootRotation.z = 0.035;
    pose.headRotation.x = 0.08;
    pose.headRotation.z = 0.08;
    pose.leftBrowRotation.z = -1.18;
    pose.rightBrowRotation.z = 1.18;
    pose.leftEyeScale.set(0.9, 0.62, 0.28);
    pose.rightEyeScale.set(0.9, 0.62, 0.28);
    pose.rightArmRotation.set(0.16, 0, -1.04);
    pose.blushScale = 1.28;
    pose.blushOpacity = 0.9;
    return pose;
  }

  if (mood === 'listening') {
    pose.headRotation.x = -0.03;
    pose.leftBrowRotation.z = -0.72;
    pose.rightBrowRotation.z = 0.72;
    pose.leftEyeScale.set(1, 1.5, 0.28);
    pose.rightEyeScale.set(1, 1.5, 0.28);
    pose.leftArmRotation.z = -0.14;
    pose.rightArmRotation.z = 0.14;
    return pose;
  }

  return pose;
}

function applyMouth(parts: FaceParts, mood: MocchiMood, speaking: boolean): void {
  const pose = createMoodPose(mood);
  parts.openMouth.visible = speaking;
  parts.neutralMouth.visible = !speaking && pose.mouth === 'neutral';
  parts.smileMouth.visible = !speaking && pose.mouth === 'smile';
  parts.thinkingMouth.visible = !speaking && pose.mouth === 'thinking';
}

function moodPhase(mood: MocchiMood, elapsed: number): number {
  const duration = {
    neutral: 2.6,
    happy: 1.5,
    curious: 1.8,
    thinking: 2.2,
    shy: 1.9,
    listening: 1.4
  } satisfies Record<MocchiMood, number>;

  return (elapsed % duration[mood]) / duration[mood];
}

function damp(current: number, target: number, delta: number, speed: number): number {
  const alpha = delta <= 0 ? 1 : 1 - Math.exp(-speed * delta);
  return current + (target - current) * alpha;
}

function dampVector(current: THREE.Vector3, target: THREE.Vector3, delta: number, speed: number): void {
  current.set(damp(current.x, target.x, delta, speed), damp(current.y, target.y, delta, speed), damp(current.z, target.z, delta, speed));
}

function dampEuler(current: THREE.Euler, target: THREE.Euler, delta: number, speed: number): void {
  current.set(
    damp(current.x, target.x, delta, speed),
    damp(current.y, target.y, delta, speed),
    damp(current.z, target.z, delta, speed)
  );
}
