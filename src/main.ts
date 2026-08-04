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
  jarWord?: string;
};

type WordJarEntry = {
  word: string;
  addedAt: string;
};

type DailyBloomRecord = {
  date: string;
  word: string;
};

type MatchaWord = {
  arabic: string;
  transliteration: string;
  meaning: string;
  root: string;
  root_meaning: string;
  root_words: string;
  example: string;
  example_translation: string;
  cultural_note: string;
  parent_prompt: string;
  ayah_reference: string;
};

type MatchaVocabPack = {
  word: MatchaWord;
};

declare global {
  interface Window {
    __mocchiGrowth?: number;
    __mocchiBloomDataUrl?: string;
  }
}

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
    audioClip: 'hello',
    jarWord: 'hello'
  },
  feel: {
    id: 'feel',
    mood: 'shy',
    response: 'I feel warm and ready. How is your heart today?',
    toast: 'Mocchi checks in.',
    audioClip: 'feel',
    jarWord: 'heart'
  },
  word: {
    id: 'word',
    mood: 'thinking',
    response: 'Konnichiwa means hello in Japanese.',
    toast: 'New word unlocked, calmly.',
    audioClip: 'word',
    jarWord: 'konnichiwa'
  },
  joke: {
    id: 'joke',
    mood: 'curious',
    response: 'Why did the tea leaf smile? It found its perfect matcha.',
    toast: 'Tiny joke delivered.',
    audioClip: 'joke',
    jarWord: 'matcha'
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
const wordJarKey = 'mocchi-talk.word-jar';
const visitKey = 'mocchi-talk.has-visited';
const dailyBloomKey = 'mocchi-talk.daily-bloom';
const maxStoredWords = 40;

const canvas = mustGet<HTMLCanvasElement>('scene-canvas');
const fallback = mustGet<HTMLElement>('webgl-fallback');
const mocchiButton = mustGet<HTMLButtonElement>('mocchi-button');
const speechBubble = mustGet<HTMLElement>('speech-bubble');
const speechText = mustGet<HTMLElement>('speech-text');
const animationStateLabel = mustGet<HTMLElement>('mocchi-animation-state');
const toast = mustGet<HTMLElement>('feedback-toast');
const soundToggle = mustGet<HTMLButtonElement>('sound-toggle');
const bloomCardButton = mustGet<HTMLButtonElement>('bloom-card-button');
const recordButton = mustGet<HTMLButtonElement>('record-button');
const growthLevelStatus = mustGet<HTMLElement>('growth-level');
const wordGardenButton = mustGet<HTMLButtonElement>('word-garden-button');
const wordGardenSheet = mustGet<HTMLElement>('word-garden-sheet');
const closeWordGardenButton = mustGet<HTMLButtonElement>('close-word-garden');
const wordGardenSummary = mustGet<HTMLElement>('word-garden-summary');
const wordGardenList = mustGet<HTMLElement>('word-garden-list');
const onboardingHint = mustGet<HTMLElement>('onboarding-hint');
const wordOfDayButton = mustGet<HTMLButtonElement>('word-of-day');
const wordOfDayLabel = mustGet<HTMLElement>('word-of-day-label');
const wordOfDayArabic = mustGet<HTMLElement>('word-of-day-arabic');
const wordOfDayTransliteration = mustGet<HTMLElement>('word-of-day-transliteration');
const wordOfDayMeaning = mustGet<HTMLElement>('word-of-day-meaning');
const wordDetailSheet = mustGet<HTMLElement>('word-detail-sheet');
const closeWordDetailButton = mustGet<HTMLButtonElement>('close-word-detail');
const wordDetailArabic = mustGet<HTMLElement>('word-detail-arabic');
const wordDetailHeading = mustGet<HTMLElement>('word-detail-heading');
const wordDetailMeaning = mustGet<HTMLElement>('word-detail-meaning');
const wordDetailRoot = mustGet<HTMLElement>('word-detail-root');
const wordDetailRootMeaning = mustGet<HTMLElement>('word-detail-root-meaning');
const wordDetailRootWords = mustGet<HTMLElement>('word-detail-root-words');
const wordDetailAyahReference = mustGet<HTMLElement>('word-detail-ayah-reference');
const wordDetailExample = mustGet<HTMLElement>('word-detail-example');
const wordDetailCulturalNote = mustGet<HTMLElement>('word-detail-cultural-note');
const wordDetailParentPrompt = mustGet<HTMLElement>('word-detail-parent-prompt');
const dailyBloomCard = mustGet<HTMLElement>('daily-bloom');
const dailyBloomStatus = mustGet<HTMLElement>('daily-bloom-status');
const practiceDailyWordButton = mustGet<HTMLButtonElement>('practice-daily-word');
const bloomCardSheet = mustGet<HTMLElement>('bloom-card-sheet');
const closeBloomCardButton = mustGet<HTMLButtonElement>('close-bloom-card');
const bloomCardPreview = mustGet<HTMLImageElement>('bloom-card-preview');
const bloomCardStatus = mustGet<HTMLElement>('bloom-card-status');
const saveBloomCardButton = mustGet<HTMLButtonElement>('save-bloom-card');
const shareBloomCardButton = mustGet<HTMLButtonElement>('share-bloom-card');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const returningVisitor = readStorage(visitKey) === 'true';

let currentMood: MocchiMood = 'neutral';
let tapIndex = 0;
let toastTimer = 0;
let recordTimer = 0;
let tapStateTimer = 0;
let speechStateTimer = 0;
let speechRun = 0;
let soundEnabled = loadSoundPreference();
let wordJar = loadWordJar();
let dailyBloom = loadDailyBloom();
let growthLevel = growthLevelForCount(wordJar.length);
let tapActive = false;
let speakingActive = false;
let openingActive = true;
let speechLockedByInteraction = false;
let speechAudio: HTMLAudioElement | undefined;
const narrationAudio = new Map<AudioClipId, HTMLAudioElement>();
let character: ReturnType<typeof createMocchiCharacter> | undefined;
let dailyWord: MatchaWord | undefined;
let captureSceneImage: (() => string) | undefined;
let latestBloomCardDataUrl = '';
let latestBloomCardFile: File | undefined;

setupWordGarden();
setupOpeningMoment();
setupGrowthLevel();
setupSoundToggle();
setupNarrationAudio();
setupWordOfDaySheet();
setupBloomCard();
void setupVocabPack();
setupControls();
setupScene();
updateAnimationStateLabel();
writeStorage(visitKey, 'true');
showToast(returningVisitor ? 'Welcome back to Mocchi Talk.' : 'Mocchi is waking up.');

function mustGet<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing required element: ${id}`);
  }
  return element as T;
}

function setupWordGarden(): void {
  if (readStorage(hintKey) === 'true') {
    onboardingHint.classList.add('is-compact');
  }

  renderWordGarden();

  wordGardenButton.addEventListener('click', () => {
    renderWordGarden();
    wordGardenSheet.hidden = false;
    closeWordGardenButton.focus();
  });

  closeWordGardenButton.addEventListener('click', closeWordGarden);

  wordGardenSheet.addEventListener('click', (event) => {
    if (event.target === wordGardenSheet) {
      closeWordGarden();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !wordGardenSheet.hidden) {
      closeWordGarden();
    }
  });
}

function closeWordGarden(): void {
  wordGardenSheet.hidden = true;
  wordGardenButton.focus();
}

function recentUniqueWords(): WordJarEntry[] {
  const seen = new Set<string>();
  const words: WordJarEntry[] = [];

  for (const entry of wordJar) {
    const key = entry.word.toLocaleLowerCase();
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    words.push(entry);
    if (words.length >= 12) {
      break;
    }
  }

  return words;
}

function renderWordGarden(): void {
  const words = recentUniqueWords();
  wordGardenList.replaceChildren();

  if (words.length === 0) {
    wordGardenSummary.textContent = 'Words you practice will grow here.';
    const emptyState = document.createElement('p');
    emptyState.className = 'word-garden-empty';
    emptyState.textContent = 'Choose “Teach me a word” or practice speaking with Mocchi.';
    wordGardenList.append(emptyState);
    wordGardenButton.setAttribute('aria-label', 'Open word garden. No words remembered yet.');
    return;
  }

  const countLabel = words.length === 1 ? 'word' : 'words';
  wordGardenSummary.textContent = `Mocchi remembers ${words.length} ${countLabel}. Tap one to revisit it.`;
  wordGardenButton.setAttribute('aria-label', `Open word garden with ${words.length} remembered ${countLabel}.`);

  for (const entry of words) {
    const button = document.createElement('button');
    button.className = 'word-garden-word';
    button.type = 'button';
    button.textContent = entry.word;
    button.setAttribute('aria-label', `Revisit word ${entry.word}`);
    button.addEventListener('click', () => revisitWord(entry.word));
    wordGardenList.append(button);
  }
}

function revisitWord(word: string): void {
  closeWordGarden();
  speechLockedByInteraction = true;
  setMood('happy');
  updateSpeech(`We remember ${word} together.`);
  showToast(`${capitalize(word)} is growing with Mocchi.`);
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
  soundToggle.querySelector('span')!.textContent = '♪';
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
    const audio = new Audio(narrationAssetUrl(clipId));
    audio.preload = 'auto';
    audio.load();
    narrationAudio.set(clipId, audio);
  }
}

function narrationAssetUrl(clipId: AudioClipId): string {
  const baseUrl = new URL(import.meta.env.BASE_URL, document.baseURI);
  return new URL(`audio/mocchi/${clipId}.wav`, baseUrl).href;
}

async function setupVocabPack(): Promise<void> {
  try {
    const baseUrl = new URL(import.meta.env.BASE_URL, document.baseURI);
    const response = await fetch(new URL('matcha-vocab/current.json', baseUrl).href);
    if (!response.ok) {
      throw new Error(`Vocabulary pack failed with ${response.status}`);
    }

    const pack = normalizeVocabPack((await response.json()) as unknown);
    if (!pack) {
      throw new Error('Vocabulary pack has an unexpected shape.');
    }

    dailyWord = pack.word;
    applyDailyWordToPrompt(dailyWord);
    renderWordOfDay(dailyWord);
    if (wordJar.length === 0 && !speechLockedByInteraction) {
      updateSpeech(`Today's word is ${dailyWord.transliteration} — ${dailyWord.meaning}.`);
    }
  } catch {
    wordOfDayArabic.textContent = '';
    wordOfDayTransliteration.textContent = 'Quiet word';
    wordOfDayMeaning.textContent = 'Try again soon';
  }
}

function normalizeVocabPack(candidate: unknown): MatchaVocabPack | undefined {
  if (!candidate || typeof candidate !== 'object') {
    return undefined;
  }

  const maybePack = candidate as { word?: unknown };
  const word = normalizeMatchaWord(maybePack.word);
  return word ? { word } : undefined;
}

function normalizeMatchaWord(candidate: unknown): MatchaWord | undefined {
  if (!candidate || typeof candidate !== 'object') {
    return undefined;
  }

  const word = candidate as Record<keyof MatchaWord, unknown>;
  const normalized: MatchaWord = {
    arabic: normalizeText(word.arabic),
    transliteration: normalizeText(word.transliteration),
    meaning: normalizeText(word.meaning),
    root: normalizeText(word.root),
    root_meaning: normalizeText(word.root_meaning),
    root_words: normalizeText(word.root_words),
    example: normalizeText(word.example),
    example_translation: normalizeText(word.example_translation),
    cultural_note: normalizeText(word.cultural_note),
    parent_prompt: normalizeText(word.parent_prompt),
    ayah_reference: normalizeText(word.ayah_reference)
  };

  if (!normalized.arabic || !normalized.transliteration || !normalized.meaning) {
    return undefined;
  }

  return normalized;
}

function normalizeText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeText(item)).filter(Boolean).join(', ');
  }

  return typeof value === 'string' ? value.trim() : '';
}

function applyDailyWordToPrompt(word: MatchaWord): void {
  prompts.word.response = `${capitalize(word.transliteration)} means ${word.meaning}. Its root is ${word.root}: ${word.root_meaning}.`;
  prompts.word.toast = 'Matcha word learned, calmly.';
  prompts.word.jarWord = word.transliteration;
}

function renderWordOfDay(word: MatchaWord): void {
  wordOfDayArabic.textContent = word.arabic;
  wordOfDayTransliteration.textContent = word.transliteration;
  wordOfDayMeaning.textContent = word.meaning;
  wordOfDayButton.setAttribute('aria-label', `Open word of the day: ${word.transliteration}, ${word.meaning}`);

  wordDetailArabic.textContent = word.arabic;
  wordDetailHeading.textContent = `${word.transliteration} — ${word.meaning}`;
  wordDetailMeaning.textContent = word.meaning;
  wordDetailRoot.textContent = word.root;
  wordDetailRootMeaning.textContent = word.root_meaning;
  wordDetailRootWords.textContent = word.root_words;
  wordDetailAyahReference.textContent = word.ayah_reference;
  wordDetailExample.textContent = `${word.example} — ${word.example_translation}`;
  wordDetailCulturalNote.textContent = word.cultural_note;
  wordDetailParentPrompt.textContent = word.parent_prompt;
  updateDailyBloomUi();
}

function setupWordOfDaySheet(): void {
  wordOfDayButton.addEventListener('click', () => {
    updateDailyBloomUi();
    wordDetailSheet.hidden = false;
    closeWordDetailButton.focus();
  });

  closeWordDetailButton.addEventListener('click', () => {
    wordDetailSheet.hidden = true;
    wordOfDayButton.focus();
  });

  wordDetailSheet.addEventListener('click', (event) => {
    if (event.target === wordDetailSheet) {
      wordDetailSheet.hidden = true;
      wordOfDayButton.focus();
    }
  });

  practiceDailyWordButton.addEventListener('click', () => {
    if (!dailyWord) {
      return;
    }

    wordDetailSheet.hidden = true;
    recordButton.focus();
    startPractice(dailyWord);
  });
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
    startPractice(dailyWord);
  });
}

function startPractice(word?: MatchaWord): void {
  clearTimeout(recordTimer);
  speechLockedByInteraction = true;
  const simulatedOnly = !navigator.mediaDevices?.getUserMedia;
  const practiceWord = word?.transliteration;
  const listeningText = practiceWord
    ? `Say ${practiceWord} with Mocchi. Your voice stays on this device.`
    : simulatedOnly
      ? 'Pretending to listen. Mocchi can practice without microphone permission.'
      : 'Listening in practice mode. No microphone permission needed.';

  recordButton.setAttribute('aria-pressed', 'true');
  recordButton.classList.add('is-recording');
  setMood('listening');
  updateSpeech(listeningText);
  showToast(practiceWord ? `Practice ${practiceWord}, softly.` : 'Voice practice is local demo mode.');

  recordTimer = window.setTimeout(() => {
    recordButton.setAttribute('aria-pressed', 'false');
    recordButton.classList.remove('is-recording');

    if (word) {
      const firstBloomToday = completeDailyBloom(word);
      applyResponse({
        id: 'feel',
        mood: 'happy',
        response: firstBloomToday
          ? `${capitalize(word.transliteration)} bloomed today. Mocchi will remember your practice.`
          : `Mocchi heard ${word.transliteration} again. Repeating is always welcome.`,
        toast: firstBloomToday ? 'Today’s word bloomed.' : 'Gentle repeat complete.',
        audioClip: 'practice-complete'
      });
      return;
    }

    recordWord('practice voice');
    applyResponse({
      id: 'feel',
      mood: 'happy',
      response: 'Mocchi heard a brave practice voice.',
      toast: 'Practice complete.',
      audioClip: 'practice-complete'
    });
  }, reducedMotion ? 900 : 1800);
}

function localDateStamp(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function loadDailyBloom(): DailyBloomRecord | undefined {
  const stored = readStorage(dailyBloomKey);
  if (!stored) {
    return undefined;
  }

  try {
    const candidate = JSON.parse(stored) as Partial<DailyBloomRecord>;
    if (typeof candidate.date !== 'string' || typeof candidate.word !== 'string') {
      return undefined;
    }

    return { date: candidate.date, word: candidate.word };
  } catch {
    return undefined;
  }
}

function hasCompletedDailyBloom(word: MatchaWord): boolean {
  return (
    dailyBloom?.date === localDateStamp() &&
    dailyBloom.word.toLocaleLowerCase() === word.transliteration.toLocaleLowerCase()
  );
}

function completeDailyBloom(word: MatchaWord): boolean {
  if (hasCompletedDailyBloom(word)) {
    updateDailyBloomUi();
    return false;
  }

  dailyBloom = { date: localDateStamp(), word: word.transliteration };
  writeStorage(dailyBloomKey, JSON.stringify(dailyBloom));
  recordWord(word.transliteration);
  updateDailyBloomUi();
  return true;
}

function updateDailyBloomUi(): void {
  if (!dailyWord) {
    dailyBloomStatus.textContent = 'Meet today’s word, then practice it with Mocchi.';
    practiceDailyWordButton.textContent = 'Practice today’s word';
    practiceDailyWordButton.disabled = true;
    dailyBloomCard.classList.remove('is-complete');
    wordOfDayButton.dataset.complete = 'false';
    return;
  }

  const completed = hasCompletedDailyBloom(dailyWord);
  const word = dailyWord.transliteration;
  wordOfDayLabel.textContent = completed ? 'Bloomed today' : 'Word of the day';
  wordOfDayButton.dataset.complete = String(completed);
  dailyBloomCard.classList.toggle('is-complete', completed);
  dailyBloomStatus.textContent = completed
    ? `${capitalize(word)} has bloomed today. Repeat it whenever it feels good.`
    : `Meet ${word}, say it with Mocchi, and let today’s word bloom.`;
  practiceDailyWordButton.textContent = completed ? `Practice ${word} again` : `Practice ${word}`;
  practiceDailyWordButton.setAttribute('aria-label', completed ? `Practice ${word} again` : `Practice today’s word ${word}`);
  practiceDailyWordButton.disabled = false;
  recordButton.setAttribute('aria-label', completed ? `Practice ${word} again` : `Practice today’s word ${word}`);
}

function applyResponse(prompt: Prompt): void {
  speechLockedByInteraction = true;
  setMood(prompt.mood);
  updateSpeech(prompt.response);
  if (prompt.jarWord) {
    recordWord(prompt.jarWord);
  }
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
  character?.setSpeaking(speakingActive);
  updateAnimationStateLabel();
}

function updateAnimationStateLabel(): void {
  animationStateLabel.textContent = `mood ${currentMood} speaking ${String(speakingActive)} tap ${
    tapActive ? 'active' : 'idle'
  } growth ${growthLevel.toFixed(3)} intro ${openingActive ? 'opening' : 'done'}`;
}

function updateSpeech(text: string): void {
  speechText.textContent = text;
}

function capitalize(text: string): string {
  return text.length > 0 ? `${text[0].toLocaleUpperCase()}${text.slice(1)}` : text;
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

function setupBloomCard(): void {
  shareBloomCardButton.hidden = true;

  bloomCardButton.addEventListener('click', () => {
    void openBloomCard();
  });

  closeBloomCardButton.addEventListener('click', () => {
    bloomCardSheet.hidden = true;
    bloomCardButton.focus();
  });

  bloomCardSheet.addEventListener('click', (event) => {
    if (event.target === bloomCardSheet) {
      bloomCardSheet.hidden = true;
      bloomCardButton.focus();
    }
  });

  saveBloomCardButton.addEventListener('click', () => {
    if (!latestBloomCardDataUrl) {
      return;
    }

    const link = document.createElement('a');
    link.href = latestBloomCardDataUrl;
    link.download = 'mocchi-bloom-card.png';
    document.body.append(link);
    link.click();
    link.remove();
    showToast('Bloom card saved.');
  });

  shareBloomCardButton.addEventListener('click', () => {
    void shareBloomCard();
  });
}

async function openBloomCard(): Promise<void> {
  bloomCardSheet.hidden = false;
  bloomCardButton.disabled = true;
  bloomCardStatus.textContent = "Composing Mocchi's bloom card.";
  bloomCardPreview.removeAttribute('src');
  bloomCardPreview.hidden = true;
  saveBloomCardButton.disabled = true;
  shareBloomCardButton.hidden = true;
  latestBloomCardFile = undefined;
  closeBloomCardButton.focus();

  try {
    latestBloomCardDataUrl = await composeBloomCard();
    window.__mocchiBloomDataUrl = latestBloomCardDataUrl;
    bloomCardPreview.src = latestBloomCardDataUrl;
    bloomCardPreview.hidden = false;
    bloomCardStatus.textContent = learnedWordsText();
    latestBloomCardFile = await fileFromDataUrl(latestBloomCardDataUrl);
    saveBloomCardButton.disabled = false;
    shareBloomCardButton.hidden = !canShareBloomFile(latestBloomCardFile);
    showToast('Bloom card ready.');
  } catch {
    latestBloomCardDataUrl = '';
    saveBloomCardButton.disabled = true;
    bloomCardStatus.textContent = 'Mocchi could not make a card yet. Try again.';
    showToast('Bloom card needs one more moment.');
  } finally {
    bloomCardButton.disabled = false;
  }
}

async function composeBloomCard(): Promise<string> {
  const card = document.createElement('canvas');
  card.width = 1080;
  card.height = 1350;
  const context = card.getContext('2d');
  if (!context) {
    throw new Error('Canvas 2D is unavailable.');
  }

  drawBloomBackground(context, card.width, card.height);

  const sceneDataUrl = captureSceneImage?.();
  if (sceneDataUrl) {
    try {
      const sceneImage = await loadImage(sceneDataUrl);
      drawImageCover(context, sceneImage, 90, 118, 900, 760);
    } catch {
      drawFallbackMocchi(context, 540, 486);
    }
  } else {
    drawFallbackMocchi(context, 540, 486);
  }

  drawBloomCopy(context, card.width, card.height);
  return card.toDataURL('image/png');
}

function drawBloomBackground(context: CanvasRenderingContext2D, width: number, height: number): void {
  context.fillStyle = palette.cream;
  context.fillRect(0, 0, width, height);

  context.fillStyle = 'rgba(79, 199, 197, 0.16)';
  context.beginPath();
  context.ellipse(185, 310, 250, 96, -0.28, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(255, 107, 87, 0.13)';
  context.beginPath();
  context.ellipse(920, 520, 230, 88, 0.36, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = 'rgba(255, 211, 77, 0.28)';
  context.beginPath();
  context.arc(830, 210, 72, 0, Math.PI * 2);
  context.fill();

  context.strokeStyle = 'rgba(15, 107, 109, 0.14)';
  context.lineWidth = 3;
  roundRect(context, 54, 54, width - 108, height - 108, 36);
  context.stroke();
}

function drawBloomCopy(context: CanvasRenderingContext2D, width: number, height: number): void {
  const latestWord = wordJar[0]?.word;
  const todayText = dailyWord ? `${dailyWord.transliteration} — ${dailyWord.meaning}` : 'a quiet word';

  context.fillStyle = palette.teal;
  context.textAlign = 'center';
  context.textBaseline = 'top';
  context.font = '900 58px Inter, system-ui, sans-serif';
  context.fillText(learnedWordsText(), width / 2, 900);

  context.font = '800 42px Inter, system-ui, sans-serif';
  context.fillStyle = '#16484a';
  context.fillText(latestWord ? `Latest learned word: ${latestWord}` : `Today's word: ${todayText}`, width / 2, 988);

  context.font = '800 34px Inter, system-ui, sans-serif';
  context.fillStyle = 'rgba(22, 72, 74, 0.78)';
  wrapCenteredText(context, 'A calm friend who grows when you learn', width / 2, 1072, 780, 48);

  context.font = '900 38px Inter, system-ui, sans-serif';
  context.fillStyle = palette.coral;
  context.fillText('Matcha-i.com/mocchi', width / 2, height - 150);
}

function drawFallbackMocchi(context: CanvasRenderingContext2D, centerX: number, centerY: number): void {
  context.save();
  context.fillStyle = '#fff8ec';
  context.strokeStyle = 'rgba(15, 107, 109, 0.15)';
  context.lineWidth = 8;
  context.beginPath();
  context.ellipse(centerX, centerY, 190, 150, 0, 0, Math.PI * 2);
  context.fill();
  context.stroke();

  context.fillStyle = palette.coral;
  context.fillRect(centerX - 152, centerY - 168, 304, 42);
  context.fillStyle = palette.teal;
  context.beginPath();
  context.arc(centerX - 64, centerY - 24, 15, 0, Math.PI * 2);
  context.arc(centerX + 64, centerY - 24, 15, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

function learnedWordsText(): string {
  const count = wordJar.length;
  return `Mocchi has learned ${count} ${count === 1 ? 'word' : 'words'}`;
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  width: number,
  height: number
): void {
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  const sourceWidth = sourceRatio > targetRatio ? image.height * targetRatio : image.width;
  const sourceHeight = sourceRatio > targetRatio ? image.height : image.width / targetRatio;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function wrapCenteredText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
): void {
  const words = text.split(' ');
  let line = '';
  let lineY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, lineY);
      line = word;
      lineY += lineHeight;
    } else {
      line = testLine;
    }
  }

  if (line) {
    context.fillText(line, x, lineY);
  }
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image load failed.'));
    image.src = src;
  });
}

async function fileFromDataUrl(dataUrl: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], 'mocchi-bloom-card.png', { type: 'image/png' });
}

function canShareBloomFile(file: File): boolean {
  if (typeof navigator.share !== 'function') {
    return false;
  }

  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
}

async function shareBloomCard(): Promise<void> {
  if (!latestBloomCardFile || !canShareBloomFile(latestBloomCardFile)) {
    shareBloomCardButton.hidden = true;
    return;
  }

  try {
    await navigator.share({
      files: [latestBloomCardFile],
      title: 'Mocchi Bloom Card',
      text: 'A calm friend who grows when you learn'
    });
  } catch {
    showToast('Sharing was cancelled.');
  }
}

function speak(prompt: Prompt): void {
  if (!soundEnabled) {
    setSpeaking(false);
    return;
  }

  const run = (speechRun += 1);
  const audio = narrationAudio.get(prompt.audioClip) ?? new Audio(narrationAssetUrl(prompt.audioClip));
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

function setupOpeningMoment(): void {
  const lastWord = wordJar[0]?.word;
  setMood('happy');
  updateSpeech(
    returningVisitor && lastWord
      ? `Last time we practiced ${lastWord}.`
      : 'Mocchi stretches awake. Tap Mocchi or choose a prompt.'
  );
  window.setTimeout(
    () => {
      openingActive = false;
      setMood('happy');
      updateAnimationStateLabel();
    },
    reducedMotion ? 1 : 900
  );
}

function loadWordJar(): WordJarEntry[] {
  const stored = readStorage(wordJarKey);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((entry) => normalizeWordJarEntry(entry))
      .filter((entry): entry is WordJarEntry => entry !== undefined)
      .slice(0, maxStoredWords);
  } catch {
    return [];
  }
}

function normalizeWordJarEntry(entry: unknown): WordJarEntry | undefined {
  if (!entry || typeof entry !== 'object') {
    return undefined;
  }

  const candidate = entry as Partial<Record<keyof WordJarEntry, unknown>>;
  if (typeof candidate.word !== 'string' || candidate.word.trim().length === 0) {
    return undefined;
  }

  return {
    word: candidate.word.trim().slice(0, 40),
    addedAt: typeof candidate.addedAt === 'string' ? candidate.addedAt : new Date().toISOString()
  };
}

function recordWord(word: string): void {
  const trimmedWord = word.trim();
  if (!trimmedWord) {
    return;
  }

  wordJar = [{ word: trimmedWord.slice(0, 40), addedAt: new Date().toISOString() }, ...wordJar].slice(0, maxStoredWords);
  writeStorage(wordJarKey, JSON.stringify(wordJar));
  updateGrowthLevel();
  renderWordGarden();
}

function growthLevelForCount(count: number): number {
  return Math.max(0, Math.min(1, count / maxStoredWords));
}

function setupGrowthLevel(): void {
  updateGrowthLevel();
}

function updateGrowthLevel(): void {
  growthLevel = growthLevelForCount(wordJar.length);
  const formattedLevel = growthLevel.toFixed(3);
  growthLevelStatus.textContent = `growth ${formattedLevel}`;
  growthLevelStatus.dataset.growth = formattedLevel;
  growthLevelStatus.setAttribute('aria-label', `Mocchi growth level ${formattedLevel}`);
  window.__mocchiGrowth = Number(formattedLevel);
  character?.setGrowthLevel(growthLevel);
  updateAnimationStateLabel();
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
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
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
  character.setGrowthLevel(growthLevel);

  const clock = new THREE.Clock();
  let reducedMotionClock = 0;

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = Math.max(clientWidth, 1) / Math.max(clientHeight, 1);
    camera.updateProjectionMatrix();
  };

  const render = () => {
    resize();
    const rawDelta = clock.getDelta();
    reducedMotionClock += rawDelta;
    const delta = reducedMotion ? 1 : rawDelta;
    const elapsed = reducedMotion ? reducedMotionClock : clock.elapsedTime;
    character?.update(delta, elapsed, reducedMotion);
    renderer.render(scene, camera);
    requestAnimationFrame(render);
  };

  captureSceneImage = () => {
    resize();
    character?.update(reducedMotion ? 1 : 0, reducedMotion ? reducedMotionClock : clock.elapsedTime, reducedMotion);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
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
