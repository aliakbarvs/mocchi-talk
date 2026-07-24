import './style.css';
import * as THREE from 'three';
import { createMocchiCharacter, type MocchiMood } from './mocchiCharacter';
import { supportsWebGL } from './webgl';

type PromptId = 'hello' | 'feel' | 'word' | 'joke';
type AudioClipId = PromptId | `tap-${PromptId}` | 'practice-complete';

type Prompt = {
  id: PromptId;
  mood: MocchiMood;
  response: string;
  toast: string;
  audioClip: AudioClipId;
};

const palette = {
  cream: '#F7F3E8',
  coral: '#FF6B57',
  sunshine: '#FFD34D',
  aqua: '#4FC7C5',
  teal: '#0F6B6D'
};

const prompts: Record<PromptId, Prompt> = {
  hello: {
    id: 'hello',
    mood: 'happy',
    response: "Hi hi! I'm Mocchi. Let's learn softly today.",
    toast: 'Mocchi waves hello.',
    audioClip: 'hello'
  },
  feel: {
    id: 'feel',
    mood: 'shy',
    response: 'I feel warm and ready. How is your heart today?',
    toast: 'Mocchi checks in.',
    audioClip: 'feel'
  },
  word: {
    id: 'word',
    mood: 'thinking',
    response: 'Konnichiwa means hello in Japanese.',
    toast: 'New word unlocked, calmly.',
    audioClip: 'word'
  },
  joke: {
    id: 'joke',
    mood: 'curious',
    response: 'Why did the tea leaf smile? It found its perfect matcha.',
    toast: 'Tiny joke delivered.',
    audioClip: 'joke'
  }
};

const tapReactions: Prompt[] = [
  {
    id: 'hello',
    mood: 'happy',
    response: 'Squish! Mocchi is listening.',
    toast: 'Soft tap.',
    audioClip: 'tap-hello'
  },
  {
    id: 'feel',
    mood: 'curious',
    response: 'That tickles. Tell me a tiny thought.',
    toast: 'Mocchi perks up.',
    audioClip: 'tap-feel'
  },
  {
    id: 'word',
    mood: 'thinking',
    response: 'Small steps make big language magic.',
    toast: 'Gentle focus.',
    audioClip: 'tap-word'
  },
  {
    id: 'joke',
    mood: 'shy',
    response: "You're doing great, one word at a time.",
    toast: 'Warm encouragement.',
    audioClip: 'tap-joke'
  }
];

const sessionKey = 'mocchi-talk.session-count';
const soundKey = 'mocchi-talk.sound-enabled';
const hintKey = 'mocchi-talk.hint-seen';

const canvas = mustGet<HTMLCanvasElement>('scene-canvas');
const fallback = mustGet<HTMLElement>('webgl-fallback');
const mocchiButton = mustGet<HTMLButtonElement>('mocchi-button');
const speechBubble = mustGet<HTMLElement>('speech-bubble');
const speechText = mustGet<HTMLElement>('speech-text');
const animationStateLabel = mustGet<HTMLElement>('mocchi-animation-state');
const toast = mustGet<HTMLElement>('feedback-toast');
const soundToggle = mustGet<HTMLButtonElement>('sound-toggle');
const recordButton = mustGet<HTMLButtonElement>('record-button');
const sessionCount = document.querySelector<HTMLElement>('[data-testid="session-count"]');
const onboardingHint = mustGet<HTMLElement>('onboarding-hint');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let currentMood: MocchiMood = 'neutral';
let tapIndex = 0;
let toastTimer = 0;
let recordTimer = 0;
let tapStateTimer = 0;
let speechStateTimer = 0;
let speechRun = 0;
let soundEnabled = loadSoundPreference();
let tapActive = false;
let speakingActive = false;
let speechAudio: HTMLAudioElement | undefined;
const narrationAudio = new Map<AudioClipId, HTMLAudioElement>();
let character: ReturnType<typeof createMocchiCharacter> | undefined;

setupSessionCounter();
setupSoundToggle();
setupNarrationAudio();
setupControls();
setupScene();
updateAnimationStateLabel();
showToast('Welcome back to Mocchi Talk.');

function mustGet<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: ${id}`);
  }
  return element as T;
}

function setupSessionCounter(): void {
  const previous = Number.parseInt(readStorage(sessionKey) ?? '0', 10);
  const next = Number.isFinite(previous) ? previous + 1 : 1;
  writeStorage(sessionKey, String(next));
  if (sessionCount) {
    sessionCount.textContent = `Session ${next}`;
    sessionCount.setAttribute('aria-label', `Local session count ${next}`);
  }

  if (readStorage(hintKey) === 'true') {
    onboardingHint.classList.add('is-compact');
  }
}

function setupSoundToggle(): void {
  updateSoundToggle();
  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    writeStorage(soundKey, soundEnabled ? 'true' : 'false');
    if (!soundEnabled) {
      stopSpeech();
    }
    updateSoundToggle();
    showToast(soundEnabled ? 'Voice on.' : 'Voice off.');
  });
}

function loadSoundPreference(): boolean {
  return readStorage(soundKey) !== 'false';
}

function updateSoundToggle(): void {
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  soundToggle.setAttribute('aria-label', soundEnabled ? 'Turn sound off' : 'Turn sound on');
  soundToggle.querySelector('span')!.textContent = soundEnabled ? 'Sound' : 'Muted';
}

function setupNarrationAudio(): void {
  const clipIds: AudioClipId[] = [
    'hello',
    'feel',
    'word',
    'joke',
    'tap-hello',
    'tap-feel',
    'tap-word',
    'tap-joke',
    'practice-complete'
  ];

  for (const clipId of clipIds) {
    const audio = new Audio(`/audio/mocchi/${clipId}.wav`);
    audio.preload = 'auto';
    audio.load();
    narrationAudio.set(clipId, audio);
  }
}

function setupControls(): void {
  mocchiButton.addEventListener('click', () => {
    const reaction = tapReactions[tapIndex % tapReactions.length];
    tapIndex += 1;
    triggerTap();
    applyResponse(reaction);
    writeStorage(hintKey, 'true');
    onboardingHint.classList.add('is-compact');
  });

  document.querySelectorAll<HTMLButtonElement>('[data-prompt]').forEach((button) => {
    button.addEventListener('click', () => {
      const promptId = button.dataset.prompt as PromptId;
      applyResponse(prompts[promptId]);
    });
  });

  recordButton.addEventListener('click', () => {
    clearTimeout(recordTimer);
    const simulatedOnly = !navigator.mediaDevices?.getUserMedia;
    const listeningText = simulatedOnly
      ? 'Pretending to listen. Mocchi can practice without microphone permission.'
      : 'Listening in practice mode. No microphone permission needed.';

    recordButton.setAttribute('aria-pressed', 'true');
    recordButton.classList.add('is-recording');
    setMood('listening');
    updateSpeech(listeningText);
    showToast('Voice practice is local demo mode.');

    recordTimer = window.setTimeout(() => {
      recordButton.setAttribute('aria-pressed', 'false');
      recordButton.classList.remove('is-recording');
      applyResponse({
        id: 'feel',
        mood: 'happy',
        response: 'Mocchi heard a brave practice voice.',
        toast: 'Practice complete.',
        audioClip: 'practice-complete'
      });
    }, reducedMotion ? 900 : 1800);
  });
}

function applyResponse(prompt: Prompt): void {
  setMood(prompt.mood);
  updateSpeech(prompt.response);
  showToast(prompt.toast);
  speak(prompt);
}

function setMood(mood: MocchiMood): void {
  currentMood = mood;
  speechBubble.dataset.mood = mood;
  character?.setMood(mood);
  updateAnimationStateLabel();
}

function triggerTap(): void {
  clearTimeout(tapStateTimer);
  tapActive = true;
  character?.triggerTap();
  updateAnimationStateLabel();
  tapStateTimer = window.setTimeout(
    () => {
      tapActive = false;
      updateAnimationStateLabel();
    },
    reducedMotion ? 1 : 460
  );
}

function setSpeaking(active: boolean): void {
  speakingActive = active;
  character?.setSpeaking(active);
  updateAnimationStateLabel();
}

function updateAnimationStateLabel(): void {
  animationStateLabel.textContent = `mood ${currentMood} speaking ${String(speakingActive)} tap ${
    tapActive ? 'active' : 'idle'
  }`;
}

function updateSpeech(text: string): void {
  speechText.textContent = text;
}

function showToast(message: string): void {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.hidden = false;
  toast.classList.add('is-visible');
  toastTimer = window.setTimeout(() => {
    toast.classList.remove('is-visible');
    toast.hidden = true;
  }, reducedMotion ? 1200 : 2200);
}

function speak(prompt: Prompt): void {
  if (!soundEnabled) {
    setSpeaking(false);
    return;
  }

  const run = (speechRun += 1);
  const audio = narrationAudio.get(prompt.audioClip) ?? new Audio(`/audio/mocchi/${prompt.audioClip}.wav`);
  speechAudio?.pause();
  speechAudio = audio;
  clearTimeout(speechStateTimer);
  try {
    audio.currentTime = 0;
  } catch {
    // Some browsers reject seeking before preloaded metadata is available.
  }
  audio.preload = 'auto';
  audio.volume = 0.78;
  audio.onended = () => finishSpeech(run);
  audio.onerror = () => finishSpeech(run);
  setSpeaking(true);
  speechStateTimer = window.setTimeout(
    () => finishSpeech(run),
    Math.max(900, Math.min(5600, prompt.response.length * 75))
  );
  const playPromise = audio.play();
  if (playPromise) {
    playPromise.catch(() => finishSpeech(run));
  }
}

function stopSpeech(): void {
  speechRun += 1;
  clearTimeout(speechStateTimer);
  if (speechAudio) {
    speechAudio.onended = null;
    speechAudio.onerror = null;
    speechAudio.pause();
    try {
      speechAudio.currentTime = 0;
    } catch {
      // Some browsers reject seeking before metadata is available.
    }
  }
  setSpeaking(false);
}

function finishSpeech(run: number): void {
  if (run !== speechRun) {
    return;
  }

  clearTimeout(speechStateTimer);
  setSpeaking(false);
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    showToast('Local session storage is unavailable.');
  }
}

function setupScene(): void {
  if (!supportsWebGL()) {
    canvas.hidden = true;
    fallback.hidden = false;
    return;
  }

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch {
    canvas.hidden = true;
    fallback.hidden = false;
    return;
  }

  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.55, 5.8);

  const ambientLight = new THREE.HemisphereLight(0xffffff, 0xc7eee8, 2.6);
  const keyLight = new THREE.DirectionalLight(0xffffff, 2.8);
  keyLight.position.set(2.5, 4, 3.2);
  const fillLight = new THREE.DirectionalLight(0xffe0d7, 1.4);
  fillLight.position.set(-3, 2, 2);
  scene.add(ambientLight, keyLight, fillLight);

  const landscape = createLandscape();
  scene.add(landscape);

  character = createMocchiCharacter(palette);
  character.group.position.set(0, -0.2, 0);
  scene.add(character.group);
  character.setMood(currentMood);
  character.setSpeaking(speakingActive);

  const clock = new THREE.Clock();

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = Math.max(clientWidth, 1) / Math.max(clientHeight, 1);
    camera.updateProjectionMatrix();
  };

  const render = () => {
    resize();
    const delta = reducedMotion ? 0 : clock.getDelta();
    const elapsed = reducedMotion ? 0 : clock.elapsedTime;
    character?.update(delta, elapsed);
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };

  window.addEventListener('resize', resize, { passive: true });
  render();
}

function createLandscape(): THREE.Group {
  const group = new THREE.Group();
  const groundMaterial = new THREE.MeshStandardMaterial({
    color: palette.aqua,
    roughness: 0.95,
    metalness: 0,
    transparent: true,
    opacity: 0.2
  });
  const sunMaterial = new THREE.MeshStandardMaterial({
    color: palette.sunshine,
    roughness: 0.9,
    transparent: true,
    opacity: 0.45
  });
  const coralMaterial = new THREE.MeshStandardMaterial({
    color: palette.coral,
    roughness: 0.9,
    transparent: true,
    opacity: 0.22
  });

  const hill = new THREE.Mesh(new THREE.SphereGeometry(2.5, 24, 12), groundMaterial);
  hill.scale.set(1.25, 0.18, 0.28);
  hill.position.set(0, -1.22, -1.1);
  group.add(hill);

  const sun = new THREE.Mesh(new THREE.CircleGeometry(0.42, 28), sunMaterial);
  sun.position.set(-1.65, 1.35, -1.7);
  group.add(sun);

  const coralPath = new THREE.Mesh(new THREE.SphereGeometry(0.62, 20, 10), coralMaterial);
  coralPath.scale.set(1.6, 0.12, 0.16);
  coralPath.position.set(1.45, -1.05, -1);
  group.add(coralPath);

  return group;
}
