/**
 * QueNombo Voice Announcer & Airport Chime Synthesizer Engine (Fasa 18)
 * Generates procedural zero-latency airport chimes & speech synthesis.
 */

const DIGIT_MAP_MS: Record<string, string> = {
  "0": "sifar",
  "1": "satu",
  "2": "dua",
  "3": "tiga",
  "4": "empat",
  "5": "lima",
  "6": "enam",
  "7": "tujuh",
  "8": "lapan",
  "9": "sembilan",
};

const DIGIT_MAP_EN: Record<string, string> = {
  "0": "zero",
  "1": "one",
  "2": "two",
  "3": "three",
  "4": "four",
  "5": "five",
  "6": "six",
  "7": "seven",
  "8": "eight",
  "9": "nine",
};

export function formatTicketSpelling(ticketNo: string, language: "ms" | "en" = "ms"): string {
  const map = language === "ms" ? DIGIT_MAP_MS : DIGIT_MAP_EN;
  const chars = ticketNo.trim().toUpperCase().split("");

  return chars
    .map((char) => {
      if (map[char]) {
        return map[char];
      }
      return char;
    })
    .join(", ");
}

/**
 * Plays a pleasant procedural dual-tone airport chime using Web Audio API
 */
export function playAirportChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      if (typeof window === "undefined") {
        return resolve();
      }

      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        return resolve();
      }

      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Note 1: D5 (587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.55);

      // Note 2: A5 (880.00 Hz) - played 0.22s after Note 1
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880.0, now + 0.22);
      gain2.gain.setValueAtTime(0, now + 0.22);
      gain2.gain.linearRampToValueAtTime(0.28, now + 0.27);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.22);
      osc2.stop(now + 0.85);

      setTimeout(() => {
        try {
          ctx.close();
        } catch {
          // Ignore
        }
        resolve();
      }, 850);
    } catch {
      resolve();
    }
  });
}

class AnnouncementQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  public enqueue(task: () => Promise<void>) {
    this.queue.push(task);
    if (!this.isProcessing) {
      this.processNext();
    }
  }

  private async processNext() {
    if (this.queue.length === 0) {
      this.isProcessing = false;
      return;
    }

    this.isProcessing = true;
    const task = this.queue.shift();
    if (task) {
      try {
        await task();
      } catch (err) {
        console.error("Announcement error:", err);
      }
    }

    setTimeout(() => {
      this.processNext();
    }, 400);
  }
}

export const globalAudioQueue = new AnnouncementQueue();

/**
 * Announce ticket number and counter using Chime + SpeechSynthesis
 */
export function announceQueueNumber(params: {
  ticketNo: string;
  counterNo: string;
  language?: "ms" | "en" | "bilingual";
  chime?: boolean;
}): Promise<void> {
  return new Promise((resolve) => {
    globalAudioQueue.enqueue(async () => {
      const { ticketNo, counterNo, language = "ms", chime = true } = params;

      // 1. Play Airport Chime
      if (chime) {
        await playAirportChime();
        await new Promise((r) => setTimeout(r, 150));
      }

      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        return resolve();
      }

      const synth = window.speechSynthesis;
      const voices = synth.getVoices();

      // Find appropriate voice
      const findVoice = (langCode: string) => {
        return (
          voices.find((v) => v.lang.toLowerCase().startsWith(langCode.toLowerCase())) ||
          voices.find((v) => v.lang.toLowerCase().includes(langCode.toLowerCase())) ||
          null
        );
      };

      const speakText = (text: string, lang: string): Promise<void> => {
        return new Promise((res) => {
          const utter = new SpeechSynthesisUtterance(text);
          utter.lang = lang;
          utter.rate = 0.88; // Professional cadence
          utter.pitch = 1.0;
          const voice = findVoice(lang);
          if (voice) {
            utter.voice = voice;
          }

          utter.onend = () => res();
          utter.onerror = () => res();
          synth.speak(utter);
        });
      };

      // 2. Pronounce in Malay
      if (language === "ms" || language === "bilingual") {
        const spelled = formatTicketSpelling(ticketNo, "ms");
        const phrase = `Nombor giliran, ${spelled}. Sila ke kaunter, ${counterNo}.`;
        await speakText(phrase, "ms-MY");
      }

      // 3. Pronounce in English if selected
      if (language === "en" || language === "bilingual") {
        if (language === "bilingual") {
          await new Promise((r) => setTimeout(r, 400));
        }
        const spelled = formatTicketSpelling(ticketNo, "en");
        const phrase = `Queue number, ${spelled}. Please proceed to counter, ${counterNo}.`;
        await speakText(phrase, "en-US");
      }

      resolve();
    });
  });
}

/**
 * Spoken guidance cue for Kiosk or other user interactions
 */
export function speakKioskGuidance(text: string, language: "ms" | "en" = "ms") {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = language === "ms" ? "ms-MY" : "en-US";
  utter.rate = 0.95;
  synth.speak(utter);
}
