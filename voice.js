"use strict";

// ==========================================
// NELOY AI VOICE SYSTEM
// ==========================================

const VoiceSystem = (() => {

  const DEFAULT_LANGUAGE = "en-US";
  const BANGLA_LANGUAGE = "bn-BD";

  let recognition = null;
  let isRecording = false;
  let recognizedTranscript = "";

  const startButton =
    document.getElementById("startRecordButton");

  const stopButton =
    document.getElementById("stopRecordButton");

  const processButton =
    document.getElementById("processVoiceButton");

  const recognizedText =
    document.getElementById("recognizedText");

  const recordingStatus =
    document.getElementById("recordingStatus");

  const assistantState =
    document.getElementById("assistantState");

  const assistantVisual =
    document.getElementById("assistantVisual");

  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  // ==========================================
  // CHECK BROWSER SUPPORT
  // ==========================================

  function initialize() {

    if (!SpeechRecognition) {
      recordingStatus.textContent =
        "Speech recognition is not supported by this browser.";

      startButton.disabled = true;
      stopButton.disabled = true;
      processButton.disabled = true;

      return;
    }

    recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = DEFAULT_LANGUAGE;

    recognition.onstart = handleStart;
    recognition.onresult = handleResult;
    recognition.onerror = handleError;
    recognition.onend = handleEnd;

    startButton.addEventListener("click", startRecording);
    stopButton.addEventListener("click", stopRecording);
    processButton.addEventListener("click", processVoice);

    stopButton.disabled = true;
    processButton.disabled = true;
  }

  // ==========================================
  // START RECORDING
  // ==========================================

  function startRecording() {

    if (!recognition || isRecording) return;

    if (typeof isProcessing !== "undefined" && isProcessing) {
      return;
    }

    recognizedTranscript = "";
    recognizedText.textContent = "Listening...";
    recordingStatus.textContent = "Starting microphone...";

    const language =
      typeof answerLanguage !== "undefined"
        ? answerLanguage
        : "english";

    recognition.lang =
      language === "bangla"
        ? BANGLA_LANGUAGE
        : DEFAULT_LANGUAGE;

    try {
      recognition.start();
    } catch (error) {
      console.error("Recording start error:", error);

      recordingStatus.textContent =
        "Unable to start recording. Please try again.";
    }
  }

  function handleStart() {

    isRecording = true;

    recordingStatus.textContent =
      "Listening... Speak now.";

    assistantState.textContent =
      "Listening to your voice...";

    assistantVisual.classList.add("recording");

    startButton.disabled = true;
    stopButton.disabled = false;
    processButton.disabled = true;
  }

  // ==========================================
  // RECOGNIZE SPEECH
  // ==========================================

  function handleResult(event) {

    let interimTranscript = "";

    for (
      let i = event.resultIndex;
      i < event.results.length;
      i++
    ) {

      const transcript =
        event.results[i][0].transcript;

      if (event.results[i].isFinal) {
        recognizedTranscript += transcript + " ";
      } else {
        interimTranscript += transcript;
      }
    }

    recognizedText.textContent =
      (recognizedTranscript + interimTranscript).trim() ||
      "Listening...";
  }

  // ==========================================
  // RECORDING ERROR
  // ==========================================

  function handleError(event) {

    console.error("Speech recognition error:", event.error);

    const errors = {
      "not-allowed":
        "Please allow microphone access in your browser.",

      "no-speech":
        "No speech detected. Please try again.",

      "audio-capture":
        "Microphone not found. Check your microphone.",

      "network":
        "Speech recognition network error. Please try again."
    };

    recordingStatus.textContent =
      errors[event.error] ||
      "Recording error: " + event.error;
  }

  // ==========================================
  // STOP RECORDING
  // ==========================================

  function stopRecording() {

    if (!recognition || !isRecording) return;

    recordingStatus.textContent =
      "Stopping microphone...";

    recognition.stop();
  }

  function handleEnd() {

    isRecording = false;

    assistantVisual.classList.remove("recording");

    assistantState.textContent =
      "Your assistant is ready";

    startButton.disabled = false;
    stopButton.disabled = true;

    const hasText = recognizedTranscript.trim().length > 0;

    processButton.disabled = !hasText;

    if (hasText) {
      recordingStatus.textContent =
        "Voice captured. Press Process Voice.";
    } else {
      recordingStatus.textContent =
        "No speech detected. Please record again.";
    }
  }

  // ==========================================
  // PROCESS RECOGNIZED VOICE
  // ==========================================

  function processVoice() {

    const message = recognizedTranscript.trim();

    if (!message) {
      recordingStatus.textContent =
        "No voice detected. Please record again.";

      return;
    }

    if (typeof sendMessage !== "function") {
      recordingStatus.textContent =
        "AI connection function was not found.";

      return;
    }

    processButton.disabled = true;

    recordingStatus.textContent =
      "Sending your voice to NELOY AI...";

    sendMessage(message);
  }

  // ==========================================
  // PUBLIC METHODS
  // ==========================================

  return {
    initialize,
    startRecording,
    stopRecording,
    processVoice,

    getTranscript() {
      return recognizedTranscript.trim();
    },

    isRecording() {
      return isRecording;
    }
  };

})();

// ==========================================
// INITIALIZE VOICE SYSTEM
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  VoiceSystem.initialize();
});
