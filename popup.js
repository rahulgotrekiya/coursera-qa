// UI Elements
const apiSection = document.getElementById("apiSection");
const apiStatusBar = document.getElementById("apiStatusBar");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const changeApiBtn = document.getElementById("changeApiBtn");
const saveApiBtn = document.getElementById("saveApiBtn");
const apiKeyInput = document.getElementById("apiKey");
const solveBtn = document.getElementById("solveBtn");
const copyBtn = document.getElementById("copyBtn");
const statusDiv = document.getElementById("status");
const stateTitle = document.getElementById("stateTitle");
const answersEl = document.getElementById("answers");
const dotsEl = document.getElementById("dots");

// 7x7 dot loader. Each frame lists the cell indices lit on that tick; the
// sequence traces a loop around the grid.
const DOT_FRAMES = [
  [14, 7, 0, 8, 6, 13, 20],
  [14, 7, 13, 20, 16, 27, 21],
  [14, 20, 27, 21, 34, 24, 28],
  [27, 21, 34, 28, 41, 32, 35],
  [34, 28, 41, 35, 48, 40, 42],
  [34, 28, 41, 35, 48, 42, 46],
  [34, 28, 41, 35, 48, 42, 38],
  [34, 28, 41, 35, 48, 30, 21],
  [34, 28, 41, 48, 21, 22, 14],
  [34, 28, 41, 21, 14, 16, 27],
  [34, 28, 21, 14, 10, 20, 27],
  [28, 21, 14, 4, 13, 20, 27],
  [28, 21, 14, 12, 6, 13, 20],
  [28, 21, 14, 6, 13, 20, 11],
  [28, 21, 14, 6, 13, 20, 10],
  [14, 6, 13, 20, 9, 7, 21],
];

let dotTimer = null;

// One entry point, so the timer cannot be started twice or left running.
function setDots(on) {
  clearInterval(dotTimer);
  dotTimer = null;
  dotsEl.hidden = !on;
  if (!on) return;

  if (!dotsEl.children.length) dotsEl.innerHTML = "<i></i>".repeat(49);
  const cells = [...dotsEl.children];
  let f = 0;
  const tick = () => {
    const frame = DOT_FRAMES[f++ % DOT_FRAMES.length];
    cells.forEach((c, i) => c.classList.toggle("active", frame.includes(i)));
  };
  tick();
  dotTimer = setInterval(tick, 100);
}
// The headline is the whole progress display: one word, rewritten in place.
// busy also drives the waveform, so a state cannot animate without saying why.
function setState(word, busy = false) {
  stateTitle.textContent = word;
  setDots(busy);
}

// Which answer went to which question. Renders nothing when empty.
function showAnswers(letters, ok) {
  answersEl.innerHTML = letters
    .map(
      (letter, i) =>
        `<span class="chip ${ok?.[i] ? "" : "miss"}"><b>${i + 1}</b>${letter}</span>`,
    )
    .join("");
}

function clearAnswers() {
  answersEl.innerHTML = "";
}

let currentApiKey = null;

// Initialize on load
document.addEventListener("DOMContentLoaded", async () => {
  await loadApiKey();
});

// Load API key from storage
async function loadApiKey() {
  try {
    const result = await chrome.storage.local.get(["geminiApiKey"]);
    if (result.geminiApiKey) {
      currentApiKey = result.geminiApiKey;
      updateApiStatus(true);
    } else {
      updateApiStatus(false);
      apiSection.classList.remove("hidden");
    }
  } catch (error) {
    console.error("Error loading API key:", error);
    updateApiStatus(false);
    apiSection.classList.remove("hidden");
  }
}

// Update API status bar
function updateApiStatus(hasKey) {
  if (hasKey) {
    statusDot.classList.remove("inactive");
    statusDot.classList.add("active");
    statusText.textContent = "Key saved";
    apiSection.classList.add("hidden");
  } else {
    statusDot.classList.remove("active");
    statusDot.classList.add("inactive");
    statusText.textContent = "No key";
  }
}

// Change API key button
changeApiBtn.addEventListener("click", () => {
  apiSection.classList.toggle("hidden");
  if (!apiSection.classList.contains("hidden")) {
    apiKeyInput.value = "";
    apiKeyInput.focus();
  }
});

// Save API key
saveApiBtn.addEventListener("click", async () => {
  const apiKey = apiKeyInput.value.trim();

  if (!apiKey) {
    showStatus("Please enter an API key", "error");
    return;
  }

  // Basic validation - just check minimum length, let the API itself reject invalid keys
  if (apiKey.length < 10) {
    showStatus(
      "API key seems too short. Please paste your full key from Google AI Studio.",
      "error",
    );
    return;
  }

  try {
    // Listing models both validates the key and tells us which models
    // actually exist, so hardcoded names cannot rot.
    showStatus("Checking key…", "info");
    saveApiBtn.disabled = true;

    // A new key must be checked against Google, not against a cached list.
    await chrome.storage.local.remove(["models", "modelsAt"]);
    const check = await chrome.runtime.sendMessage({ type: "validateKey", apiKey });
    saveApiBtn.disabled = false;

    if (!check?.ok) {
      showStatus(
        `Google rejected the key: ${check?.error || "no response"}. Check it, and that the Generative Language API is enabled.`,
        "error",
      );
      return;
    }

    // Key is valid — save to storage
    await chrome.storage.local.set({ geminiApiKey: apiKey });
    currentApiKey = apiKey;

    // Update UI
    updateApiStatus(true);
    showStatus("Key saved.", "info");

    // Clear input and hide section
    apiKeyInput.value = "";
    apiSection.classList.add("hidden");

    // Hide success message after 2 seconds
    setTimeout(() => {
      hideStatus();
    }, 2000);
  } catch (error) {
    saveApiBtn.disabled = false;
    console.error("Error saving API key:", error);
    showStatus("Failed to save API key. Please try again.", "error");
  }
});

// Copy questions only
copyBtn.addEventListener("click", async () => {
  copyBtn.disabled = true;
  solveBtn.disabled = true;
  hideStatus();
  clearAnswers();
  setState("Reading", true);

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.url.includes("coursera.org")) {
      throw new Error("This only works on a Coursera quiz page.");
    }

    const response = await chrome.runtime.sendMessage({ type: "extract", tabId: tab.id });
    if (response?.error) throw new Error(response.error);

    if (!response || !response.questions || response.questions.length === 0) {
      setState("Nothing here");
      showStatus("No questions found on this page.", "info");
      return;
    }

    await navigator.clipboard.writeText(response.cleanedText);

    const n = response.questions.length;
    setState("Copied");
    showStatus(`${n} question${n === 1 ? "" : "s"} on your clipboard`, "info");
  } catch (error) {
    console.error("Error:", error);
    setState("Failed");
    showStatus(error.message, "error");
  } finally {
    setDots(false);
    copyBtn.disabled = false;
    solveBtn.disabled = false;
  }
});

// Solve questions with AI
solveBtn.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab.url.includes("coursera.org")) {
    render({ word: "Wrong page", detail: "Open a Coursera quiz first.", error: true });
    return;
  }
  // Fire and forget: the worker owns the run from here, so closing this popup
  // no longer stops it.
  chrome.runtime.sendMessage({ type: "solve", tabId: tab.id });
});

// ------------------------------------------------------------------ render
// Single source of truth is chrome.storage.local["run"], written by the worker.

function render(run) {
  stateTitle.textContent = run.word;
  setDots(!!run.busy);
  solveBtn.disabled = !!run.busy;
  copyBtn.disabled = !!run.busy;

  if (run.detail) {
    statusDiv.textContent = run.detail;
    statusDiv.className = run.error ? "error" : "info";
    statusDiv.style.display = "block";
  } else {
    statusDiv.style.display = "none";
  }

  if (run.answers?.length) showAnswers(run.answers, run.ok || []);
  else clearAnswers();
}

// Reattach on open, then follow the run live while the popup happens to be up.
chrome.storage.local.get("run").then(({ run }) => render(run || { word: "Ready" }));

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.run) render(changes.run.newValue);
});

// Utility: Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = type;
  statusDiv.style.display = "block";
}

// Utility: Hide status message
function hideStatus() {
  statusDiv.style.display = "none";
}


