#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const sourcePath = join(root, 'src', 'mocchiCharacter.ts');
const source = readFileSync(sourcePath, 'utf8');
const threeUrl = pathToFileURL(require.resolve('three')).href;

const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    verbatimModuleSyntax: false
  }
}).outputText;

const moduleSource = compiled.replace("import * as THREE from 'three';", `const THREE = await import(${JSON.stringify(threeUrl)});`);
const { createMocchiCharacter } = await import(`data:text/javascript,${encodeURIComponent(moduleSource)}`);

const palette = {
  cream: '#F7F3E8',
  coral: '#FF6B57',
  sunshine: '#FFD34D',
  aqua: '#4FC7C5',
  teal: '#0F6B6D'
};

const character = createMocchiCharacter(palette);

try {
  assert.equal(character.group.name, 'MocchiCharacter');
  for (const method of ['setMood', 'triggerTap', 'setSpeaking', 'setGrowthLevel', 'setSleeping', 'update', 'dispose']) {
    assert.equal(typeof character[method], 'function', `${method} must stay on the public character API.`);
  }

  for (const pivot of ['root', 'body', 'head', 'eyes', 'mouth', 'leftArm', 'rightArm', 'leftFoot', 'rightFoot', 'headband', 'face']) {
    assert.ok(character.group.getObjectByName(pivot), `Missing named rig pivot: ${pivot}`);
  }

  const body = findRole(character.group, 'body-shell');
  assert.ok(body, 'Body shell mesh must be tagged.');
  assert.equal(body.geometry.type, 'SphereGeometry');
  assert.ok(body.geometry.parameters.widthSegments >= 48, 'Body needs high enough segments for a soft silhouette.');
  assert.equal(body.material.flatShading, false, 'Body material should use smooth shading.');
  assert.equal(body.material.roughness, 0.86, 'Body roughness should match the material contract.');
  assert.ok(body.scale.x > body.scale.y, 'Body must be wider than tall.');
  assert.ok(body.scale.z < body.scale.x, 'Body depth must be gentler than width.');
  assert.ok(Math.abs(body.scale.y / body.scale.x - 0.82) < 0.08, 'Body height should stay close to contract proportions.');

  const leftEar = findRole(character.group, 'left-ear');
  const rightEar = findRole(character.group, 'right-ear');
  assert.ok(leftEar && rightEar, 'Rounded cat ears must be tagged.');
  assert.notEqual(leftEar.geometry.type, 'ConeGeometry', 'Left ear must not be a sharp cone.');
  assert.notEqual(rightEar.geometry.type, 'ConeGeometry', 'Right ear must not be a sharp cone.');
  assert.ok(leftEar.parent.rotation.z > 0.15, 'Left ear should cant outward.');
  assert.ok(rightEar.parent.rotation.z < -0.15, 'Right ear should cant outward.');

  for (const role of ['left-arm', 'right-arm', 'left-foot', 'right-foot']) {
    const part = findRole(character.group, role);
    assert.ok(part, `Missing embedded appendage: ${role}`);
    assert.ok(part.userData.embedDepth > 0, `${role} must declare visible body overlap.`);
  }

  const headband = character.group.getObjectByName('headband');
  assert.ok(headband, 'Headband pivot must exist.');
  assert.ok(findRole(headband, 'headband-front-wrap'), 'Headband needs a front wrapped band surface.');
  assert.ok(findRole(headband, 'headband-rear-knot'), 'Headband needs a readable rear/right knot.');
  assert.equal(findAllRole(headband, 'emblem-pill').length, 3, 'Emblem needs exactly three colored pills.');
  assert.ok(findRole(headband, 'emblem-plate'), 'Emblem needs a white backing plate.');
  assert.ok(findRole(character.group, 'growth-leaf'), 'Growth needs a leaf accessory mesh.');
  assert.ok(findRole(character.group, 'growth-bloom'), 'Continuous growth needs a soft bloom accent.');

  assert.equal(findAllRole(character.group, 'eye').length, 2, 'Mocchi needs two bead eyes.');
  assert.equal(findAllRole(character.group, 'brow').length, 2, 'Mocchi needs two expressive brows.');
  assert.ok(findRole(character.group, 'w-mouth'), 'Mocchi needs a small w-mouth.');
  for (const cheek of findAllRole(character.group, 'blush')) {
    assert.ok(cheek.position.y < 0.15, 'Blush should sit low on the cheeks.');
    assert.equal(cheek.material.opacity, 0.9, 'Blush material opacity should match the contract.');
  }

  const headbandWrap = findRole(headband, 'headband-front-wrap');
  const emblemPlate = findRole(headband, 'emblem-plate');
  const growthLeaf = findRole(character.group, 'growth-leaf');
  const growthBloom = findRole(character.group, 'growth-bloom');

  character.setGrowthLevel(-1);
  character.update(0, 0);
  assert.equal(headband.visible, true, 'Continuous growth keeps the headband available for opacity interpolation.');
  assert.equal(headbandWrap.material.transparent, true, 'Headband material must support fade-in.');
  assert.equal(headbandWrap.material.opacity, 0, 'Growth 0 should fade the headband away.');
  assert.equal(emblemPlate.material.opacity, 0, 'Growth 0 should fade the emblem away.');
  assert.equal(growthLeaf.material.opacity, 0, 'Growth 0 should fade the leaf away.');
  assert.equal(growthBloom.material.opacity, 0, 'Growth 0 should fade the bloom away.');

  character.setGrowthLevel(0.5);
  character.update(0, 1);
  assert.ok(headbandWrap.material.opacity > 0.9, 'Headband should fade in as growth passes the threshold.');
  assert.ok(emblemPlate.material.opacity > 0.3, 'Emblem should rise continuously after early growth.');
  assert.ok(growthBloom.material.opacity > 0.1, 'Bloom accent should appear as growth increases.');

  character.setGrowthLevel(99);
  character.update(0, 2);
  assert.ok(growthBloom.scale.x <= 1.76, 'Growth level should clamp to the 0..1 range.');

  for (const mood of ['neutral', 'happy', 'curious', 'thinking', 'shy', 'listening']) {
    character.setMood(mood);
    character.update(0.016, 1.2);
  }
  character.triggerTap();
  character.setSpeaking(true);
  character.update(0.21, 2.4);
  character.setSpeaking(false);
} finally {
  character.dispose();
}

console.log('Character contract test passed.');

function findRole(object, role) {
  let match;
  object.traverse((child) => {
    if (!match && child.userData?.contractRole === role) {
      match = child;
    }
  });
  return match;
}

function findAllRole(object, role) {
  const matches = [];
  object.traverse((child) => {
    if (child.userData?.contractRole === role) {
      matches.push(child);
    }
  });
  return matches;
}
