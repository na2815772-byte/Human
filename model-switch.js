/* =====================================================
   NELOY AI VOICE ASSISTANT
   File: js/model-switch.js

   Features:
   1. Load models from models.json
   2. Manage Gemini and Groq
   3. Display separate model results
   4. Display individual model status
   5. Support future model additions
===================================================== */

"use strict";

const ModelSwitch = (() => {

    const CONFIG = {
        MODELS_URL: "js/models.json",

        DEFAULT_MODEL: "gemini",

        RESULT_IDS: {
            gemini: "geminiResult",
            groq: "groqResult"
        },

        STATUS_IDS: {
            gemini: "geminiResultStatus",
            groq: "groqResultStatus"
        }
    };

    let models = [];
    let activeModel = CONFIG.DEFAULT_MODEL;

    const results = {};
    const statuses = {};

    // ==========================================
    // LOAD MODEL CONFIGURATION
    // ==========================================

    async function loadModels() {

        try {

            const response = await fetch(CONFIG.MODELS_URL, {
                cache: "no-store"
            });

            if (!response.ok) {
                throw new Error("Unable to load models.json");
            }

            const data = await response.json();

            if (!Array.isArray(data.models)) {
                throw new Error("Invalid models.json format");
            }

            models = data.models.filter(model =>
                model.enabled === true &&
                model.provider &&
                model.model_id
            );

            models.forEach(model => {

                results[model.provider] = "";
                statuses[model.provider] = "Waiting";

            });

            renderInitialStatus();

            return models;

        } catch (error) {

            console.error("Model loading error:", error);

            showError(
                "Model configuration could not be loaded."
            );

            return [];

        }

    }

    // ==========================================
    // FIND MODEL
    // ==========================================

    function getModel(provider) {

        return models.find(model =>
            model.provider.toLowerCase() ===
            String(provider).toLowerCase()
        );

    }

    // ==========================================
    // RESULT ELEMENT
    // ==========================================

    function getResultElement(provider) {

        const model = getModel(provider);

        if (!model) return null;

        const id =
            model.result_id ||
            CONFIG.RESULT_IDS[provider];

        return id ? document.getElementById(id) : null;

    }

    // ==========================================
    // STATUS ELEMENT
    // ==========================================

    function getStatusElement(provider) {

        const model = getModel(provider);

        if (!model) return null;

        const id =
            model.status_id ||
            CONFIG.STATUS_IDS[provider];

        return id ? document.getElementById(id) : null;

    }

    // ==========================================
    // DISPLAY RESULT
    // ==========================================

    function setResult(provider, answer) {

        const model = getModel(provider);

        if (!model) return;

        results[provider] = String(answer || "");

        statuses[provider] = "Completed";

        const element = getResultElement(provider);

        if (element) {
            element.textContent =
                results[provider] || "Empty response.";
        }

        updateStatus(provider, "Completed");

    }

    // ==========================================
    // DISPLAY ERROR
    // ==========================================

    function setError(provider, message) {

        if (!getModel(provider)) return;

        results[provider] = String(
            message || "Unable to get response."
        );

        statuses[provider] = "Error";

        const element = getResultElement(provider);

        if (element) {
            element.textContent = results[provider];
        }

        updateStatus(provider, "Error");

    }

    // ==========================================
    // LOADING STATUS
    // ==========================================

    function setLoading(provider) {

        if (!getModel(provider)) return;

        results[provider] = "";

        statuses[provider] = "Processing";

        const element = getResultElement(provider);

        if (element) {
            element.textContent = "Generating response...";
        }

        updateStatus(provider, "Processing");

    }

    // ==========================================
    // UPDATE STATUS
    // ==========================================

    function updateStatus(provider, status) {

        if (!getModel(provider)) return;

        statuses[provider] = status;

        const element = getStatusElement(provider);

        if (element) {
            element.textContent = status;
        }

    }

    // ==========================================
    // RESET RESULTS
    // ==========================================

    function reset() {

        models.forEach(model => {

            const provider = model.provider;

            results[provider] = "";

            statuses[provider] = "Waiting";

            const resultElement =
                getResultElement(provider);

            if (resultElement) {
                resultElement.textContent =
                    "Waiting for response...";
            }

            updateStatus(provider, "Waiting");

        });

    }

    // ==========================================
    // SET ACTIVE MODEL
    // ==========================================

    function setActive(provider) {

        if (!getModel(provider)) {
            return false;
        }

        activeModel = provider;

        document.querySelectorAll("[data-provider]").forEach(element => {

            element.classList.toggle(
                "selected",
                element.dataset.provider === provider
            );

        });

        return true;

    }

    // ==========================================
    // UPDATE FROM BACKEND
    // ==========================================

    function update(data = {}) {

        if (!data || typeof data !== "object") return;

        models.forEach(model => {

            const provider = model.provider;

            const modelData = data[provider];

            if (!modelData) return;

            if (typeof modelData === "string") {

                setResult(provider, modelData);

            } else if (typeof modelData === "object") {

                if (modelData.status === "error") {

                    setError(
                        provider,
                        modelData.answer || modelData.message
                    );

                } else if (
                    modelData.status === "processing"
                ) {

                    setLoading(provider);

                } else if (modelData.answer) {

                    setResult(provider, modelData.answer);

                } else if (modelData.status) {

                    updateStatus(
                        provider,
                        modelData.status
                    );

                }

            }

        });

    }

    // ==========================================
    // INITIAL DISPLAY
    // ==========================================

    function renderInitialStatus() {

        models.forEach(model => {

            const provider = model.provider;

            const resultElement =
                getResultElement(provider);

            if (resultElement) {
                resultElement.textContent =
                    "Waiting for response...";
            }

            updateStatus(provider, "Waiting");

        });

    }

    // ==========================================
    // NOTICE
    // ==========================================

    function showError(message) {

        const notice =
            document.getElementById("noticeMessage");

        if (notice) {
            notice.textContent = message;
            notice.className = "notice-message error";
        }

    }

    // ==========================================
    // GETTERS
    // ==========================================

    function getModels() {
        return models.map(model => ({ ...model }));
    }

    function getResults() {
        return { ...results };
    }

    function getStatuses() {
        return { ...statuses };
    }

    function getActiveModel() {
        return activeModel;
    }

    // ==========================================
    // PUBLIC FUNCTIONS
    // ==========================================

    return {
        loadModels,
        getModel,
        getModels,
        getResults,
        getStatuses,
        getActiveModel,
        setActive,
        setResult,
        setError,
        setLoading,
        updateStatus,
        update,
        reset
    };

})();

window.ModelSwitch = ModelSwitch;

// Load models when page is ready
document.addEventListener("DOMContentLoaded", () => {
    ModelSwitch.loadModels();
});
