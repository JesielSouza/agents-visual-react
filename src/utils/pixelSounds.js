import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'soundSettings';

const DEFAULT_SETTINGS = {
  enabled: true,
  volume: 50,
  categories: {
    movement: true,
    ui: true,
    notifications: true,
    meetings: true,
  },
  bgm: {
    enabled: false,
    volume: 25,
  },
};

let cachedSettings = null;
let audioCtx = null;
let masterGain = null;
let bgmState = null;
const listeners = new Set();

function canUseWindow() {
  return typeof window !== 'undefined';
}

function cloneSettings(settings) {
  return {
    ...settings,
    categories: { ...settings.categories },
    bgm: { ...settings.bgm },
  };
}

function getDefaultSettings() {
  return cloneSettings(DEFAULT_SETTINGS);
}

function mergeSettings(next) {
  const base = getDefaultSettings();
  const source = next || {};
  return {
    ...base,
    ...source,
    categories: {
      ...base.categories,
      ...(source.categories || {}),
    },
    bgm: {
      ...base.bgm,
      ...(source.bgm || {}),
    },
  };
}

function readStoredSettings() {
  if (!canUseWindow()) return getDefaultSettings();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultSettings();
    return mergeSettings(JSON.parse(raw));
  } catch {
    return getDefaultSettings();
  }
}

function persistSettings(settings) {
  if (!canUseWindow()) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage failures
  }
}

export function getSoundSettings() {
  if (!cachedSettings) cachedSettings = readStoredSettings();
  return cachedSettings;
}

function notifyListeners() {
  listeners.forEach((listener) => listener(getSoundSettings()));
}

function getAudioContextCtor() {
  if (!canUseWindow()) return null;
  return window.AudioContext || window.webkitAudioContext || null;
}

async function ensureAudio() {
  const AudioContextCtor = getAudioContextCtor();
  if (!AudioContextCtor) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextCtor();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 1;
    masterGain.connect(audioCtx.destination);
  }

  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch {
      return null;
    }
  }

  return audioCtx;
}

function disconnectNode(node, delayMs = 120) {
  if (!node) return;
  window.setTimeout(() => {
    try {
      node.disconnect();
    } catch {
      // ignore disconnect race
    }
  }, delayMs);
}

function categoryAllowed(category) {
  const settings = getSoundSettings();
  if (!settings.enabled) return false;
  if (!category) return true;
  return settings.categories[category] !== false;
}

function normalizedVolume(level, category) {
  const settings = getSoundSettings();
  if (!categoryAllowed(category)) return 0;
  const globalVolume = Math.max(0, Math.min(1, settings.volume / 100));
  return Math.max(0, Math.min(1, level * globalVolume));
}

function createGain(ctx, volume) {
  const gain = ctx.createGain();
  gain.gain.value = volume;
  gain.connect(masterGain);
  return gain;
}

export async function playBlip(options = {}) {
  const {
    volume = 0.2,
    category = 'ui',
    frequency = 800,
    pitchOffset = 0,
    duration = 0.05,
    type = 'square',
  } = options;

  const finalVolume = normalizedVolume(volume, category);
  if (finalVolume <= 0) return;

  const ctx = await ensureAudio();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = createGain(ctx, finalVolume);

  osc.type = type;
  osc.frequency.value = frequency + pitchOffset;

  gain.gain.setValueAtTime(finalVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, finalVolume * 0.2), ctx.currentTime + duration);

  osc.connect(gain);
  osc.onended = () => disconnectNode(osc, 0);
  disconnectNode(gain, Math.ceil(duration * 1000) + 40);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export async function playSuccess(options = {}) {
  const {
    volume = 0.4,
    category = 'notifications',
    from = 400,
    to = 800,
    duration = 0.2,
  } = options;

  const finalVolume = normalizedVolume(volume, category);
  if (finalVolume <= 0) return;

  const ctx = await ensureAudio();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = createGain(ctx, finalVolume);

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(from, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(to, ctx.currentTime + duration);

  gain.gain.setValueAtTime(finalVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

  osc.connect(gain);
  osc.onended = () => disconnectNode(osc, 0);
  disconnectNode(gain, Math.ceil(duration * 1000) + 40);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export async function playNotification(options = {}) {
  const volume = options.volume ?? 0.3;
  await playBlip({ volume, category: 'notifications', frequency: 760, duration: 0.045 });
  if (!canUseWindow()) return;
  window.setTimeout(() => {
    playBlip({ volume, category: 'notifications', frequency: 920, duration: 0.045 });
  }, 100);
}

export async function playWalk(options = {}) {
  const {
    volume = 0.2,
    category = 'movement',
    duration = 0.05,
  } = options;

  const finalVolume = normalizedVolume(volume, category);
  if (finalVolume <= 0) return;

  const ctx = await ensureAudio();
  if (!ctx) return;

  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const output = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i += 1) {
    output[i] = (Math.random() * 2 - 1) * 0.12 * (1 - i / bufferSize);
  }

  const noise = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = createGain(ctx, finalVolume);

  filter.type = 'highpass';
  filter.frequency.value = 420;
  gain.gain.setValueAtTime(finalVolume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

  noise.buffer = buffer;
  noise.connect(filter);
  filter.connect(gain);

  noise.onended = () => disconnectNode(noise, 0);
  disconnectNode(filter, Math.ceil(duration * 1000) + 40);
  disconnectNode(gain, Math.ceil(duration * 1000) + 40);

  noise.start();
  noise.stop(ctx.currentTime + duration);
}

export function playUiHover() {
  playBlip({ volume: 0.1, category: 'ui', frequency: 700, duration: 0.03 });
}

export function playUiClick() {
  playBlip({ volume: 0.2, category: 'ui', frequency: 800, pitchOffset: 200, duration: 0.045 });
}

export function playMeetingStarted() {
  playBlip({ volume: 0.5, category: 'meetings', frequency: 650, duration: 0.05 });
  if (!canUseWindow()) return;
  window.setTimeout(() => {
    playSuccess({ volume: 0.5, category: 'meetings', from: 450, to: 900, duration: 0.22 });
  }, 60);
}

export function playMeetingEnded() {
  playBlip({ volume: 0.3, category: 'meetings', frequency: 520, duration: 0.05 });
}

function stopBackgroundMusic() {
  const Tone = canUseWindow() ? window.Tone : null;
  if (bgmState?.pattern) {
    try {
      bgmState.pattern.stop(0);
      bgmState.pattern.dispose();
    } catch {
      // ignore
    }
  }
  if (bgmState?.synth) {
    try {
      bgmState.synth.dispose();
    } catch {
      // ignore
    }
  }
  if (bgmState?.gain) {
    try {
      bgmState.gain.dispose();
    } catch {
      // ignore
    }
  }
  bgmState = null;

  if (Tone?.Transport?.state === 'started') {
    Tone.Transport.stop();
    Tone.Transport.cancel();
  }
}

async function syncBackgroundMusic() {
  const settings = getSoundSettings();
  const Tone = canUseWindow() ? window.Tone : null;

  if (!settings.enabled || !settings.bgm.enabled || !Tone) {
    stopBackgroundMusic();
    return;
  }

  try {
    await Tone.start();
  } catch {
    return;
  }

  if (!bgmState) {
    const gain = new Tone.Gain(Math.max(0, Math.min(1, settings.bgm.volume / 100))).toDestination();
    const synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.2, release: 0.3 },
    }).connect(gain);
    const pattern = new Tone.Pattern((time, note) => {
      synth.triggerAttackRelease(note, '8n', time, 0.35);
    }, ['C4', 'E4', 'G4', 'B4'], 'upDown');

    pattern.interval = '4n';
    pattern.start(0);
    bgmState = { gain, synth, pattern };
  }

  bgmState.gain.gain.rampTo(Math.max(0, Math.min(1, settings.bgm.volume / 100)), 0.1);

  if (Tone.Transport.state !== 'started') {
    Tone.Transport.start();
  }
}

export function setSoundSettings(update) {
  const prev = getSoundSettings();
  const next = typeof update === 'function' ? update(prev) : update;
  cachedSettings = mergeSettings(next);
  persistSettings(cachedSettings);
  notifyListeners();
  syncBackgroundMusic();
  return cachedSettings;
}

export function subscribeSoundSettings(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSoundSettings() {
  const [settings, setSettings] = useState(() => getSoundSettings());

  useEffect(() => subscribeSoundSettings(setSettings), []);

  const updateSettings = useCallback((update) => setSoundSettings(update), []);

  return [settings, updateSettings];
}
