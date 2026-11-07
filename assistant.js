"use strict";

// ==========================================
// NELOY AI ASSISTANT CONTROLLER
// File: assistant.js
// ==========================================

const NeloyAssistant = (() => {

  // ==========================================
  // CONFIGURATION
  // ==========================================

  const CONFIG = {
    CHAT_API: "/api/chat",

    LIMIT_MESSAGE:
      "Your usage limit has been reached. Please try again after 24 hours.",

    IDENTITY_ANSWER:
      "I am an AI assistant created and presented by Neloy.",

    FALLBACK_MESSAGE:
      "Sorry, I could not process your question. Please try again."
  };

  let isProcessing = false;

  // ==========================================
  // HTML ELEMENTS
  // ==========================================

  const userMessageElement =
    document.getElementById("userMessage");

  const aiAnswerElement =
    document.getElementById("aiAnswer");

  const loadingArea =
    document.getElementById("loadingArea");

  const assistantState =
    document.getElementById("assistantState");

  const assistantVisual =
    document.getElementById("assistantVisual");

  const noticeMessage =
    document.getElementById("noticeMessage");

  const submitButton =
    document.getElementById("submitButton");

  const textInput =
    document.getElementById("textInput");

  const startRecordButton =
    document.getElementById("startRecordButton");

  const processVoiceButton =
    document.getElementById("processVoiceButton");

  // ==========================================
  // NOTICE MESSAGE
  // ==========================================

  function showNotice(message, type = "info") {

    if (!noticeMessage) return;

    noticeMessage.textContent = message;
    noticeMessage.className =
      "notice-message " + type;
  }

  // ==========================================
  // UPDATE ASSISTANT STATUS
  // ==========================================

  function updateStatus(message, className = "") {

    if (assistantState) {
      assistantState.textContent = message;
    }

    if (assistantVisual) {
      assistantVisual.classList.remove(
        "thinking",
        "speaking",
        "recording"
      );

      if (className) {
        assistantVisual.classList.add(className);
      }
    }
  }

  // ==========================================
  // DISPLAY ANSWER
  // ==========================================

  function displayAnswer(answer) {

    if (aiAnswerElement) {
      aiAnswerElement.textContent = answer;
    }
  }

  // ==========================================
  // SPEAK ANSWER
  // ==========================================

  function speakAnswer(answer) {

    if (
      typeof SpeechSystem !== "undefined" &&
      typeof SpeechSystem.speak === "function"
    ) {
      SpeechSystem.speak(answer);
      return;
    }

    // Browser fallback if speech.js is unavailable.
    if ("speechSynthesis" in window) {

      const utterance =
        new SpeechSynthesisUtterance(answer);

      utterance.lang = "en-US";
      utterance.rate = 1.2;

      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    }
  }

  // ==========================================
  // IDENTITY QUESTION DETECTION
  // ==========================================

  function normalize(text) {

    return text
      .toLowerCase()
      .trim()
      .replace(/[?!.,،؟]/g, "")
      .replace(/\s+/g, " ");
  }

  function isIdentityQuestion(message) {

    const text = normalize(message);

    const patterns = [
      /^who are you$/,
      /^what are you$/,
      /^are you an ai$/,
      /^are you artificial intelligence$/,
      /^who created you$/,
      /^who made you$/,
      /^who presented you$/,
      /^tell me about yourself$/,
      /^introduce yourself$/,
      /^what is your name$/,
      /^তুমি কে$/,
      /^তোমার পরিচয় কি$/,
      /^তোমার নাম কি$/,
      /^তোমাকে কে তৈরি করেছে$/,
      /^তোমাকে কে বানিয়েছে$/,
      /^নিজের পরিচয় দাও$/
    ];

    return patterns.some(pattern => pattern.test(text));
  }

  // ==========================================
  // DISABLE / ENABLE CONTROLS
  // ==========================================

  function setControlsDisabled(disabled) {

    if (submitButton) {
      submitButton.disabled = disabled;
    }

    if (textInput) {
      textInput.disabled = disabled;
    }

    if (startRecordButton) {
      startRecordButton.disabled = disabled;
    }

    if (processVoiceButton) {
      processVoiceButton.disabled = disabled;
    }
  }

  // ==========================================
  // CHECK 24-HOUR LOCK RESPONSE
  // ==========================================

  function handleLimitResponse(data) {

    const message =
      data.message || CONFIG.LIMIT_MESSAGE;

    displayAnswer(message);
    showNotice(message, "error");

    updateStatus("Usage limit reached");

    // Speak the English limit message.
    speakAnswer(message);

    // The server must enforce the lock.
    // Do not rely on browser storage for security.
  }

  // ==========================================
  // PROVIDER STATUS
  // ==========================================

  function updateProvider(provider) {

    if (!provider) return;

    const name = provider.toLowerCase();

    const geminiStatus =
      document.getElementById("geminiStatus");

    const groqStatus =
      document.getElementById("groqStatus");

    const geminiIndicator =
      document.getElementById("geminiIndicator");

    const groqIndicator =
      document.getElementById("groqIndicator");

    if (name.includes("gemini")) {

      if (geminiStatus) {
        geminiStatus.textContent = "Active";
      }

      if (groqStatus) {
        groqStatus.textContent = "Standby";
      }

      if (geminiIndicator) {
        geminiIndicator.classList.add("active");
      }

      if (groqIndicator) {
        groqIndicator.classList.remove("active");
      }

    } else if (name.includes("groq")) {

      if (geminiStatus) {
        geminiStatus.textContent = "Fallback";
      }

      if (groqStatus) {
        groqStatus.textContent = "Active";
      }

      if (geminiIndicator) {
        geminiIndicator.classList.remove("active");
      }

      if (groqIndicator) {
        groqIndicator.classList.add("active");
      }
    }
  }

  // ==========================================
  // SEND MESSAGE TO BACKEND
  // ==========================================

  async function sendMessage(message) {

    const question = String(message || "").trim();

    if (!question) {
      showNotice("Please enter or speak a question.", "error");
      return;
    }

    if (isProcessing) return;

    isProcessing = true;

    setControlsDisabled(true);

    if (userMessageElement) {
      userMessageElement.textContent = question;
    }

    displayAnswer("Thinking...");

    if (loadingArea) {
      loadingArea.hidden = false;
    }

    updateStatus("NELOY AI is thinking...", "thinking");

    showNotice("");

    try {

      // --------------------------------------
      // Handle fixed identity questions locally
      // --------------------------------------

      if (isIdentityQuestion(question)) {

        displayAnswer(CONFIG.IDENTITY_ANSWER);

        updateStatus("Your assistant is ready");

        speakAnswer(CONFIG.IDENTITY_ANSWER);

        return;
      }

      // --------------------------------------
      // Send other questions to backend
      // --------------------------------------

      const response = await fetch(CONFIG.CHAT_API, {

        method: "POST",

        credentials: "same-origin",

        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },

        body: JSON.stringify({
          message: question,
          answerLanguage:
            localStorage.getItem("answerLanguage") || "english"
        })

      });

      const data = await response.json();

      // --------------------------------------
      // 24-HOUR LIMIT
      // --------------------------------------

      if (
        response.status === 429 ||
        data.locked === true
      ) {

        handleLimitResponse(data);
        return;
      }

      // --------------------------------------
      // Other server errors
      // --------------------------------------

      if (!response.ok) {

        throw new Error(
          data.message || CONFIG.FALLBACK_MESSAGE
        );
      }

      // --------------------------------------
      // Get AI answer
      // --------------------------------------

      const answer =
        data.answer || data.response;

      if (!answer) {
        throw new Error(CONFIG.FALLBACK_MESSAGE);
      }

      displayAnswer(answer);

      updateProvider(data.provider);

      updateStatus("Your assistant is ready");

      // Always speak the answer.
      speakAnswer(answer);

    } catch (error) {

      console.error("NELOY AI Error:", error);

      const errorMessage =
        error.message || CONFIG.FALLBACK_MESSAGE;

      displayAnswer(errorMessage);

      showNotice(errorMessage, "error");

      speakAnswer(errorMessage);

      updateStatus("Something went wrong");

    } finally {

      isProcessing = false;

      if (loadingArea) {
        loadingArea.hidden = true;
      }

      setControlsDisabled(false);
    }
  }

  // ==========================================
  // PUBLIC METHODS
  // ==========================================

  return {

    sendMessage,

    isIdentityQuestion,

    isProcessing() {
      return isProcessing;
    },

    getIdentityAnswer() {
      return CONFIG.IDENTITY_ANSWER;
    },

    getLimitMessage() {
      return CONFIG.LIMIT_MESSAGE;
    }

  };

})();

// ==========================================
// GLOBAL CONNECTION FOR voice.js
// ==========================================

// voice.js calls sendMessage(message).
// This keeps the voice and text systems connected.

function sendMessage(message) {
  return NeloyAssistant.sendMessage(message);
}

// ==========================================
// TEXT SUBMIT BUTTON
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

  const submitButton =
    document.getElementById("submitButton");

  const textInput =
    document.getElementById("textInput");

  if (submitButton && textInput) {

    submitButton.addEventListener("click", () => {

      const message = textInput.value.trim();

      if (!message) return;

      textInput.value = "";

      sendMessage(message);
    });

    textInput.addEventListener("keydown", event => {

      if (event.key === "Enter" && !event.shiftKey) {

        event.preventDefault();

        submitButton.click();
      }
    });
  }

});
