"use strict";

// ==========================================
// NELOY AI VOICE OUTPUT SYSTEM
// File: speech.js
// ==========================================

const SpeechSystem = (() => {

  const DEFAULT_LANGUAGE = "en-US";
  const BANGLA_LANGUAGE = "bn-BD";
  const DEFAULT_RATE = 1.2;

  let availableVoices = [];
  let selectedVoiceGender =
    localStorage.getItem("neloy_voice_gender") || "female";

  let currentUtterance = null;
  let isSpeaking = false;

  // ==========================================
  // GET HTML ELEMENTS
  // ==========================================

  const assistantState =
    document.getElementById("assistantState");

  const assistantVisual =
    document.getElementById("assistantVisual");

  // ==========================================
  // CHECK BROWSER SUPPORT
  // ==========================================

  function isSupported() {
    return "speechSynthesis" in window &&
      "SpeechSynthesisUtterance" in window;
  }

  // ==========================================
  // LOAD AVAILABLE VOICES
  // ==========================================

  function loadVoices() {

    if (!isSupported()) return [];

    availableVoices = window.speechSynthesis.getVoices();

    return availableVoices;
  }

  // ==========================================
  // SELECT VOICE
  // ==========================================

  function selectVoice(language) {

    loadVoices();

    const languageCode =
      language === "bangla"
        ? "bn"
        : "en";

    const matchingVoices = availableVoices.filter(voice =>
      voice.lang.toLowerCase().startsWith(languageCode)
    );

    if (matchingVoices.length === 0) {
      return null;
    }

    if (selectedVoiceGender === "female") {

      const femaleVoice = matchingVoices.find(voice =>
        /female|zira|samantha|susan|aria|jenny|google.*female/i
          .test(voice.name)
      );

      if (femaleVoice) return femaleVoice;

    } else {

      const maleVoice = matchingVoices.find(voice =>
        /male|david|mark|guy|daniel|alex|google.*male/i
          .test(voice.name)
      );

      if (maleVoice) return maleVoice;
    }

    return matchingVoices[0];
  }

  // ==========================================
  // SPEAK TEXT
  // ==========================================

  function speak(text, options = {}) {

    if (!isSupported()) {
      console.error("Speech synthesis is not supported.");
      return;
    }

    const cleanText = String(text || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return;

    // Stop previous speech.
    stop();

    const language =
      options.language ||
      localStorage.getItem("answerLanguage") ||
      "english";

    const utterance =
      new SpeechSynthesisUtterance(cleanText);

    utterance.lang =
      language === "bangla"
        ? BANGLA_LANGUAGE
        : DEFAULT_LANGUAGE;

    utterance.rate =
      options.rate || DEFAULT_RATE;

    utterance.pitch = 1;
    utterance.volume = 1;

    const voice = selectVoice(language);

    if (voice) {
      utterance.voice = voice;
    }

    currentUtterance = utterance;

    utterance.onstart = () => {

      isSpeaking = true;

      if (assistantState) {
        assistantState.textContent =
          "NELOY AI is speaking...";
      }

      if (assistantVisual) {
        assistantVisual.classList.add("speaking");
      }
    };

    utterance.onend = () => {

      isSpeaking = false;
      currentUtterance = null;

      updateReadyStatus();
    };

    utterance.onerror = (event) => {

      console.error("Speech error:", event.error);

      isSpeaking = false;
      currentUtterance = null;

      updateReadyStatus();
    };

    currentUtterance = utterance;

    window.speechSynthesis.speak(utterance);
  }

  // ==========================================
  // STOP SPEECH
  // ==========================================

  function stop() {

    if (isSupported()) {
      window.speechSynthesis.cancel();
    }

    isSpeaking = false;
    currentUtterance = null;

    if (assistantVisual) {
      assistantVisual.classList.remove("speaking");
    }
  }

  // ==========================================
  // PAUSE SPEECH
  // ==========================================

  function pause() {

    if (isSupported() && isSpeaking) {
      window.speechSynthesis.pause();
    }
  }

  // ==========================================
  // RESUME SPEECH
  // ==========================================

  function resume() {

    if (isSupported() && window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  // ==========================================
  // CHANGE VOICE GENDER
  // ==========================================

  function setGender(gender) {

    if (!["male", "female"].includes(gender)) {
      return false;
    }

    selectedVoiceGender = gender;

    localStorage.setItem(
      "neloy_voice_gender",
      gender
    );

    return true;
  }

  // ==========================================
  // UPDATE STATUS
  // ==========================================

  function updateReadyStatus() {

    if (assistantState) {
      assistantState.textContent =
        "Your assistant is ready";
    }

    if (assistantVisual) {
      assistantVisual.classList.remove("speaking");
    }
  }

  // ==========================================
  // INITIALIZE
  // ==========================================

  function initialize() {

    if (!isSupported()) {
      console.warn(
        "This browser does not support speech synthesis."
      );
      return;
    }

    loadVoices();

    window.speechSynthesis.onvoiceschanged = () => {
      loadVoices();
    };
  }

  // ==========================================
  // PUBLIC METHODS
  // ==========================================

  return {
    initialize,
    speak,
    stop,
    pause,
    resume,
    setGender,
    loadVoices,

    isSpeaking() {
      return isSpeaking;
    },

    getGender() {
      return selectedVoiceGender;
    }
  };

})();

// ==========================================
// START SPEECH SYSTEM
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  SpeechSystem.initialize();
});
