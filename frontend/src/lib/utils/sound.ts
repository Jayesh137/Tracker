import { writable } from 'svelte/store';

const SOUND_ENABLED_KEY = 'hl-tracker-sound-enabled';

export const soundEnabled = writable<boolean>(
  localStorage.getItem(SOUND_ENABLED_KEY) === 'true'
);

soundEnabled.subscribe(value => {
  localStorage.setItem(SOUND_ENABLED_KEY, String(value));
});

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function playAlertSound() {
  try {
    const ctx = getAudioContext();

    // Resume context if suspended (needed for iOS)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Create a two-tone alert sound (like a message beep)
    const frequencies = [880, 1100]; // A5 and C#6 - attention-grabbing

    frequencies.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = freq;
      oscillator.type = 'sine';

      // Each tone: 0.15s with fade
      const startTime = now + (i * 0.18);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, startTime + 0.15);

      oscillator.start(startTime);
      oscillator.stop(startTime + 0.15);
    });

    // Second beep after short pause (double-beep pattern)
    setTimeout(() => {
      frequencies.forEach((freq, i) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.frequency.value = freq;
        oscillator.type = 'sine';

        const startTime = ctx.currentTime + (i * 0.18);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0, startTime + 0.15);

        oscillator.start(startTime);
        oscillator.stop(startTime + 0.15);
      });
    }, 300);

  } catch (e) {
    console.error('Failed to play alert sound:', e);
  }
}

export function testSound() {
  playAlertSound();
}
