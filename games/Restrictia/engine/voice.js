// ═══════════════════════════════════════════════════════════════
// The Chronicles of Restrictia: Island Overdrive 3D
// Voice Engine — Tomodachi Life-Style Speech Synthesis
// ═══════════════════════════════════════════════════════════════

export class VoiceEngine {
  constructor() {
    this.synth = window.speechSynthesis || null;
    this.queue = [];
    this.isSpeaking = false;
    this.enabled = true;
    this.currentUtterance = null;

    // Check support
    this.supported = !!this.synth;
  }

  /**
   * Speak a line in Tomodachi Life style
   * Breaks text into syllable-sized chunks and speaks each
   * with pitch wobble to recreate the robotic cadence
   */
  speak(text, character) {
    if (!this.supported || !this.enabled || !text) return;

    // Cancel any current speech
    this.synth.cancel();

    const voice = character.voice;

    // Break text into syllable-like chunks (2-3 chars each)
    const chunks = this._syllabify(text);
    let chunkIndex = 0;

    const speakNextChunk = () => {
      if (chunkIndex >= chunks.length) {
        this.isSpeaking = false;
        return;
      }

      const chunk = chunks[chunkIndex];
      const utterance = new SpeechSynthesisUtterance(chunk);

      // Apply character voice profile with Tomodachi-style variation
      const pitchWobble = (Math.random() - 0.5) * 2 * voice.pitchVariance;
      utterance.pitch = Math.max(0, Math.min(2, voice.pitch + pitchWobble));
      utterance.rate = voice.rate + (Math.random() - 0.5) * 0.3;
      utterance.volume = voice.volume;

      // Try to find a robotic-sounding voice
      const voices = this.synth.getVoices();
      const robotVoice = voices.find(v =>
        v.name.includes('Google') || v.name.includes('Microsoft') ||
        v.name.includes('Zira') || v.name.includes('David')
      );
      if (robotVoice) {
        utterance.voice = robotVoice;
      }

      utterance.onend = () => {
        chunkIndex++;
        // Small pause between syllables for Tomodachi effect
        setTimeout(speakNextChunk, voice.syllableSpeed * 0.3);
      };

      utterance.onerror = () => {
        chunkIndex++;
        speakNextChunk();
      };

      this.currentUtterance = utterance;
      this.isSpeaking = true;
      this.synth.speak(utterance);
    };

    speakNextChunk();
  }

  /**
   * Break text into syllable-like chunks
   * Mimics the Tomodachi Life approach of speaking 2-3 chars at a time
   */
  _syllabify(text) {
    const chunks = [];
    const words = text.split(' ');

    for (const word of words) {
      if (word.length <= 3) {
        chunks.push(word);
      } else {
        // Break into 2-3 char chunks
        for (let i = 0; i < word.length; i += 2 + Math.floor(Math.random() * 2)) {
          const chunk = word.substring(i, Math.min(i + 3, word.length));
          if (chunk.length > 0) chunks.push(chunk);
        }
      }
    }

    return chunks;
  }

  /**
   * Stop all speech immediately
   */
  stop() {
    if (this.synth) {
      this.synth.cancel();
    }
    this.isSpeaking = false;
  }

  /**
   * Toggle voice on/off
   */
  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled) this.stop();
    return this.enabled;
  }
}
