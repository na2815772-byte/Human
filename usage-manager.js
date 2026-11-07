/* =====================================================
   NELOY AI VOICE ASSISTANT
   FILE: js/usage-manager.js
   PURPOSE: AI Provider Usage & Status Manager
===================================================== */

(function () {
    "use strict";

    const CONFIG = {
        MODELS_URL: "js/models.json",

        PROVIDERS: ["gemini", "groq"],

        STATUS: {
            READY: "Ready",
            LOADING: "Processing...",
            COMPLETED: "Completed",
            ERROR: "Error",
            QUOTA_EXHAUSTED: "Quota Exhausted",
            DISABLED: "Disabled"
        }
    };

    let models = [];
    let usageData = {
        gemini: {
            requests: 0,
            success: 0,
            errors: 0,
            quotaExhausted: false,
            status: "Ready"
        },

        groq: {
            requests: 0,
            success: 0,
            errors: 0,
            quotaExhausted: false,
            status: "Ready"
        }
    };

    let initialized = false;

    /* LOAD MODEL CONFIGURATION */

    async function loadModels() {
        try {
            const response = await fetch(
                CONFIG.MODELS_URL,
                { cache: "no-store" }
            );

            if (!response.ok) {
                throw new Error("Could not load models.json");
            }

            const data = await response.json();

            models = Array.isArray(data.models)
                ? data.models
                : [];

            initialized = true;

            return models;

        } catch (error) {
            console.error(
                "Usage Manager Model Loading Error:",
                error
            );

            initialized = false;
            return [];
        }
    }

    /* GET PROVIDER DATA */

    function getProvider(provider) {
        if (!CONFIG.PROVIDERS.includes(provider)) {
            return null;
        }

        return usageData[provider];
    }

    /* RECORD REQUEST */

    function startRequest(provider) {
        const data = getProvider(provider);

        if (!data) return false;

        if (data.quotaExhausted) {
            data.status = CONFIG.STATUS.QUOTA_EXHAUSTED;
            return false;
        }

        data.requests++;
        data.status = CONFIG.STATUS.LOADING;

        updateUI(provider);

        return true;
    }

    /* RECORD SUCCESS */

    function recordSuccess(provider) {
        const data = getProvider(provider);

        if (!data) return;

        data.success++;
        data.status = CONFIG.STATUS.COMPLETED;
        data.quotaExhausted = false;

        updateUI(provider);
    }

    /* RECORD ERROR */

    function recordError(provider, error) {
        const data = getProvider(provider);

        if (!data) return;

        data.errors++;

        const message = String(
            error?.message || error || ""
        ).toLowerCase();

        if (
            message.includes("quota") ||
            message.includes("rate limit") ||
            message.includes("resource exhausted") ||
            message.includes("429")
        ) {
            data.quotaExhausted = true;
            data.status = CONFIG.STATUS.QUOTA_EXHAUSTED;
        } else {
            data.status = CONFIG.STATUS.ERROR;
        }

        updateUI(provider);
    }

    /* SET PROVIDER STATUS */

    function setStatus(provider, status) {
        const data = getProvider(provider);

        if (!data) return;

        data.status = status;

        if (status === CONFIG.STATUS.QUOTA_EXHAUSTED) {
            data.quotaExhausted = true;
        }

        updateUI(provider);
    }

    /* UPDATE PROVIDER UI */

    function updateUI(provider) {
        const data = getProvider(provider);

        if (!data) return;

        const statusElement = document.getElementById(
            provider + "Status"
        );

        if (statusElement) {
            statusElement.textContent = data.status;
        }

        const resultStatus = document.getElementById(
            provider + "ResultStatus"
        );

        if (resultStatus) {
            resultStatus.textContent = data.status;
        }

        document.dispatchEvent(
            new CustomEvent("neloy:usage-update", {
                detail: {
                    provider: provider,
                    usage: { ...data }
                }
            })
        );
    }

    /* UPDATE BOTH PROVIDERS */

    function updateAllUI() {
        CONFIG.PROVIDERS.forEach(updateUI);
    }

    /* CHECK WHETHER BOTH PROVIDERS ARE EXHAUSTED */

    function areAllProvidersExhausted() {
        return CONFIG.PROVIDERS.every(provider => {
            return usageData[provider].quotaExhausted;
        });
    }

    /* CHECK WHETHER A PROVIDER IS AVAILABLE */

    function isProviderAvailable(provider) {
        const data = getProvider(provider);

        return !!data && !data.quotaExhausted;
    }

    /* GET USAGE SUMMARY */

    function getUsage(provider) {
        if (provider) {
            const data = getProvider(provider);
            return data ? { ...data } : null;
        }

        return {
            gemini: { ...usageData.gemini },
            groq: { ...usageData.groq }
        };
    }

    /* RESET USAGE */

    function resetUsage(provider) {
        if (provider) {
            if (!CONFIG.PROVIDERS.includes(provider)) {
                return;
            }

            usageData[provider] = {
                requests: 0,
                success: 0,
                errors: 0,
                quotaExhausted: false,
                status: CONFIG.STATUS.READY
            };

            updateUI(provider);
            return;
        }

        CONFIG.PROVIDERS.forEach(name => {
            usageData[name] = {
                requests: 0,
                success: 0,
                errors: 0,
                quotaExhausted: false,
                status: CONFIG.STATUS.READY
            };
        });

        updateAllUI();
    }

    /* INITIALIZE */

    async function init() {
        await loadModels();
        updateAllUI();

        return initialized;
    }

    /* PUBLIC API */

    window.UsageManager = {
        init,
        loadModels,
        getModels: () => [...models],

        startRequest,
        recordSuccess,
        recordError,

        setStatus,
        updateUI,
        updateAllUI,

        getUsage,
        resetUsage,

        isProviderAvailable,
        areAllProvidersExhausted,

        getStatus: provider => {
            const data = getProvider(provider);
            return data ? data.status : null;
        },

        isInitialized: () => initialized
    };

    /* AUTO INITIALIZE */

    if (document.readyState === "loading") {
        document.addEventListener(
            "DOMContentLoaded",
            init,
            { once: true }
        );
    } else {
        init();
    }

})();
