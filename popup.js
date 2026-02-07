// UI Elements
const apiSection = document.getElementById("apiSection");
const mainActions = document.getElementById("mainActions");
const apiStatusBar = document.getElementById("apiStatusBar");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const changeApiBtn = document.getElementById("changeApiBtn");
const saveApiBtn = document.getElementById("saveApiBtn");
const apiKeyInput = document.getElementById("apiKey");
const solveBtn = document.getElementById("solveBtn");
const solveBtnText = document.getElementById("solveBtnText");
const copyBtn = document.getElementById("copyBtn");
const statusDiv = document.getElementById("status");
const statsDiv = document.getElementById("stats");
const answerBox = document.getElementById("answerBox");
const answerText = document.getElementById("answerText");

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
    statusText.textContent = "API key configured";
    apiSection.classList.add("hidden");
  } else {
    statusDot.classList.remove("active");
    statusDot.classList.add("inactive");
    statusText.textContent = "No API key configured";
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

  // Validate API key format (basic check)
  if (!apiKey.startsWith("AIzaSy")) {
    showStatus(
      'Invalid API key format. Gemini API keys start with "AIzaSy"',
      "error",
    );
    return;
  }

  try {
    // Save to storage
    await chrome.storage.local.set({ geminiApiKey: apiKey });
    currentApiKey = apiKey;

    // Update UI
    updateApiStatus(true);
    showStatus("API key saved successfully!", "success");

    // Clear input and hide section
    apiKeyInput.value = "";
    apiSection.classList.add("hidden");

    // Hide success message after 2 seconds
    setTimeout(() => {
      hideStatus();
    }, 2000);
  } catch (error) {
    console.error("Error saving API key:", error);
    showStatus("Failed to save API key. Please try again.", "error");
  }
});

// Copy questions only
copyBtn.addEventListener("click", async () => {
  setButtonLoading(copyBtn, true, "Copying...");
  hideStatus();
  hideAnswerBox();

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.url.includes("coursera.org")) {
      throw new Error("This extension only works on Coursera pages");
    }

    const response = await extractQuestions(tab.id);

    if (!response || !response.questions || response.questions.length === 0) {
      showStatus("No questions found on this page", "info");
      return;
    }

    await navigator.clipboard.writeText(response.cleanedText);

    showStatus("✓ Questions copied to clipboard!", "success");
    statsDiv.textContent = `Found ${response.questions.length} question${response.questions.length !== 1 ? "s" : ""}`;
  } catch (error) {
    console.error("Error:", error);
    showStatus(`Error: ${error.message}`, "error");
  } finally {
    setButtonLoading(copyBtn, false, "Copy Questions Only");
  }
});

// Solve questions with AI
solveBtn.addEventListener("click", async () => {
  // Reload API key to make sure we have the latest
  await loadApiKey();

  if (!currentApiKey) {
    showStatus("Please configure your Gemini API key first", "error");
    apiSection.classList.remove("hidden");
    apiKeyInput.focus();
    return;
  }

  setButtonLoading(solveBtn, true, "Analyzing...");
  hideStatus();
  hideAnswerBox();

  try {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (!tab.url.includes("coursera.org")) {
      throw new Error("This extension only works on Coursera pages");
    }

    solveBtnText.innerHTML =
      '<span class="loading"></span>Extracting questions...';
    const response = await extractQuestions(tab.id);

    if (!response || !response.questions || response.questions.length === 0) {
      showStatus("No questions found on this page", "info");
      return;
    }

    statsDiv.textContent = `Found ${response.questions.length} question${response.questions.length !== 1 ? "s" : ""}`;

    solveBtnText.innerHTML =
      '<span class="loading"></span>Getting AI answers...';
    const aiResponse = await getAIAnswers(response.cleanedText, response.questions.length);

    // Format the answers nicely
    const formattedAnswers = formatAnswers(response.questions, aiResponse);

    // Display answers
    answerText.textContent = formattedAnswers;
    answerBox.classList.add("visible");

    // Copy to clipboard
    await navigator.clipboard.writeText(formattedAnswers);

    // Auto-select and submit on the page
    solveBtnText.innerHTML =
      '<span class="loading"></span>Selecting & Submitting...';
    await autoSelectAnswers(tab.id, aiResponse);

    showStatus("✓ Answers submitted and copied to clipboard!", "success");
  } catch (error) {
    console.error("Error:", error);
    showStatus(`Error: ${error.message}`, "error");
  } finally {
    setButtonLoading(solveBtn, false, "Solve & Submit Assignment");
  }
});

// Extract questions from page
async function extractQuestions(tabId) {
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      action: "extractQuestions",
    });
    return response;
  } catch (error) {
    console.log("Content script not found, injecting directly...");
    const results = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: extractQuestionsDirectly,
    });
    return results[0].result;
  }
}

// Format answers nicely - now uses the AI response directly
function formatAnswers(questions, aiResponse) {
  // The AI response now contains the full answer text, so we use it directly
  // Parse lines like: "Question 1: C) GitHub Copilot"
  const lines = aiResponse.split('\n').filter(l => l.trim().length > 0);
  let formatted = "";
  
  lines.forEach((line, index) => {
    // Match pattern: "Question X: LETTER) Answer text" or "Question X: LETTER - Answer text"
    const match = line.match(/Question\s*(\d+):\s*([A-D])\)?\s*[-)]?\s*(.+)/i);
    
    if (match) {
      const questionNum = match[1];
      const answerLetter = match[2].toUpperCase();
      const answerText = match[3].trim();
      
      // Get a shortened version of the question text from the original questions
      let questionText = "";
      const qIndex = parseInt(questionNum) - 1;
      if (questions[qIndex]) {
        // Extract first meaningful line as question text
        const qLines = questions[qIndex].split('\n').map(l => l.trim()).filter(l => l.length > 0);
        for (const qLine of qLines) {
          // Skip lines that look like options or "Question X"
          if (!qLine.match(/^[A-D]\)/) && !qLine.match(/^Question\s+\d+$/i) && qLine.length > 10) {
            questionText = qLine.substring(0, 80); // Truncate for display
            if (qLine.length > 80) questionText += "...";
            break;
          }
        }
      }
      
      formatted += `${questionNum}. ${questionText}\n`;
      formatted += `   Answer: ${answerLetter}) ${answerText}\n\n`;
    }
  });
  
  return formatted || aiResponse;
}

// Auto-select answers on the page
async function autoSelectAnswers(tabId, aiResponse) {
  try {
    // Parse answer letters from AI response
    const answerMatches = aiResponse.match(/Question \d+:\s*([A-D])/gi);

    if (!answerMatches) {
      console.log("Could not parse answers for auto-selection");
      return;
    }

    const answers = answerMatches.map((match) => match.match(/([A-D])/i)[1]);

    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      func: selectAnswersOnPage,
      args: [answers],
    });
  } catch (error) {
    console.error("Error auto-selecting answers:", error);
  }
}

// Function injected into page to select answers and automatically submit
function selectAnswersOnPage(answers) {
  console.log("Attempting to select answers:", answers);

  // Find all question containers - Coursera uses various selectors
  const questionSelectors = [
    '.rc-FormPartsQuestion',
    '[data-test="quiz-question"]',
    '.rc-QuizQuestion',
    '[class*="FormPart"][class*="Question"]',
    '.assessment-question',
  ];

  let questionElements = [];
  for (const selector of questionSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      questionElements = Array.from(elements);
      console.log(`Found ${elements.length} questions using selector: ${selector}`);
      break;
    }
  }

  if (questionElements.length === 0) {
    // Fallback: try to find by looking for groups of radio/checkbox inputs
    const allInputGroups = document.querySelectorAll('[role="radiogroup"], [role="group"], .cds-213');
    if (allInputGroups.length > 0) {
      questionElements = Array.from(allInputGroups);
      console.log(`Found ${questionElements.length} questions using fallback input groups`);
    }
  }

  if (questionElements.length === 0) {
    console.log("No question elements found");
    return;
  }

  answers.forEach((answer, index) => {
    if (index >= questionElements.length) return;

    const questionEl = questionElements[index];
    console.log(`Processing question ${index + 1}, answer: ${answer}`);

    // Map answer letter to index (A=0, B=1, C=2, D=3)
    const answerIndex = answer.charCodeAt(0) - 65; // 'A' = 65 in ASCII

    // Find all clickable option elements within this question
    // Try multiple approaches for Coursera's MUI components
    
    // Approach 1: Find all radio/checkbox inputs
    let inputs = questionEl.querySelectorAll('input[type="radio"], input[type="checkbox"]');
    
    // Approach 2: If no inputs found, try MUI checkbox containers
    if (inputs.length === 0) {
      inputs = questionEl.querySelectorAll('.cds-217, [class*="Checkbox"], [class*="Radio"]');
    }

    // Approach 3: Look for clickable label elements
    if (inputs.length === 0) {
      inputs = questionEl.querySelectorAll('[role="radio"], [role="checkbox"]');
    }

    console.log(`Found ${inputs.length} options for question ${index + 1}`);

    if (inputs[answerIndex]) {
      const targetInput = inputs[answerIndex];
      
      // Try to click the input directly
      targetInput.click();
      console.log(`Clicked input for answer ${answer} on question ${index + 1}`);

      // Also try clicking the parent label if it exists (for MUI components)
      const parentLabel = targetInput.closest('label');
      if (parentLabel) {
        parentLabel.click();
        console.log(`Also clicked parent label`);
      }

      // For MUI, try finding and clicking the checkbox wrapper
      const checkboxWrapper = targetInput.closest('.cds-217, [class*="CheckboxRoot"]');
      if (checkboxWrapper) {
        checkboxWrapper.click();
        console.log(`Also clicked checkbox wrapper`);
      }

      // Try dispatching events for React components
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });
      targetInput.dispatchEvent(event);
    } else {
      console.log(`Could not find option ${answerIndex} for question ${index + 1}`);
    }
  });

  // --- AUTO SUBMIT logic ---
  console.log("Looking for submit button...");
  
  // Wait a bit before submitting to ensure clicks are processed by React
  setTimeout(() => {
    // Look for submit button with various selectors
    let submitBtn = null;
    
    // Heuristic 1: Find buttons with "submit" text (case-insensitive)
    const allButtons = Array.from(document.querySelectorAll('button'));
    submitBtn = allButtons.find(btn => {
      const text = btn.textContent.toLowerCase().trim();
      // Match "Submit Quiz", "Submit", but not "Save" or disabled buttons
      return (text.includes('submit') && !text.includes('save') && !btn.disabled) || 
             (text === 'submit quiz');
    });

    // Heuristic 2: Look for specific Coursera selectors
    if (!submitBtn) {
      const submitSelectors = [
        '[data-test="submit-button"]',
        '[data-test="quiz-submit-button"]',
        'button[type="submit"]',
        '.rc-SubmitButton button',
        '[data-testid="submit-button"]',
      ];
      
      for (const selector of submitSelectors) {
        submitBtn = document.querySelector(selector);
        if (submitBtn && !submitBtn.disabled) break;
      }
    }

    // Heuristic 3: Look for primary CDS buttons
    if (!submitBtn) {
      const primaryBtns = document.querySelectorAll('.cds-button--primary, button.primary');
      submitBtn = Array.from(primaryBtns).find(btn => {
        const text = btn.textContent.toLowerCase();
        return text.includes('submit');
      });
    }

    if (submitBtn && !submitBtn.disabled) {
      console.log("Submit button found:", submitBtn.textContent);
      console.log("Clicking submit in 2 seconds...");
      setTimeout(() => {
        submitBtn.click();
        console.log("Assignment submitted!");
      }, 2000);
    } else {
      console.log("Submit button not found or is disabled. Manual submission required.");
    }
  }, 1500);
}

// Get AI answers from Gemini
async function getAIAnswers(questions, questionCount) {
  const modelNames = [
    "gemini-2.5-flash",
    "gemini-2.5-pro",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
  ];

  const prompt = `You are a quiz answering assistant. There are exactly ${questionCount} questions below. You MUST answer ALL ${questionCount} questions.

CRITICAL: Format your response EXACTLY like this - include both the letter AND the answer text:
Question 1: C) The correct answer text here
Question 2: A) Another correct answer text
Question 3: B) Yet another answer
...(continue for all ${questionCount} questions)

Rules:
1. Use the format: Question NUMBER: LETTER) ANSWER_TEXT
2. The ANSWER_TEXT must be the actual text of the correct option, not just the letter
3. You MUST provide answers for ALL ${questionCount} questions (Question 1 through Question ${questionCount})
4. Do NOT skip any questions
5. Do NOT add explanations or extra text

Questions:
${questions}`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 4000,
    },
  };

  let lastError = null;

  for (const modelName of modelNames) {
    try {
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${modelName}:generateContent?key=${currentApiKey}`;

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const err = await response.json();
        lastError = err.error?.message || response.statusText;
        continue;
      }

      const data = await response.json();
      return data.candidates[0].content.parts[0].text;
    } catch (err) {
      lastError = err.message;
    }
  }

  throw new Error(
    `All models failed. Last error: ${lastError}. Check your API key permissions.`,
  );
}

// Utility: Show status message
function showStatus(message, type) {
  statusDiv.textContent = message;
  statusDiv.className = type;
  statusDiv.style.display = "block";
}

// Utility: Hide status message
function hideStatus() {
  statusDiv.style.display = "none";
  statsDiv.textContent = "";
}

// Utility: Hide answer box
function hideAnswerBox() {
  answerBox.classList.remove("visible");
}

// Utility: Set button loading state
function setButtonLoading(button, loading, text) {
  button.disabled = loading;
  if (loading) {
    button.querySelector("span").innerHTML =
      `<span class="loading"></span>${text}`;
  } else {
    button.querySelector("span").textContent = text;
  }
}

// Direct extraction function
function extractQuestionsDirectly() {
  const questionSelectors = [
    '[data-test="quiz-question"]',
    ".rc-FormPartsQuestion",
    ".rc-QuizQuestion",
    '[class*="question"]',
    '[class*="Question"]',
    ".assessment-question",
    '[role="group"][aria-labelledby]',
    ".quiz-question",
    'div[data-e2e="quiz-question"]',
    '[data-testid*="question"]',
    ".cds-9",
    'div[class*="FormPart"]',
  ];

  // Try ALL selectors and pick the one that returns the most valid-looking questions
  let bestQuestions = [];
  
  for (const selector of questionSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > bestQuestions.length) {
      // Filter to ensure they look like questions (basic check)
      const validElements = Array.from(elements).filter(el => 
        el.textContent.trim().length > 10 && 
        (el.querySelector('input') || el.querySelectorAll('[role="radio"], [role="checkbox"]').length > 0 || el.textContent.includes('?'))
      );
      
      if (validElements.length > bestQuestions.length) {
        bestQuestions = validElements;
      }
    }
  }

  // Fallback if no specific selector worked well
  if (bestQuestions.length === 0) {
    const allDivs = document.querySelectorAll("div, section, article");
    bestQuestions = Array.from(allDivs).filter((el) => {
      const text = el.textContent.trim();
      return (
        text.length > 20 &&
        text.length < 2000 &&
        (text.includes("?") ||
          el.querySelector('input[type="radio"]') ||
          el.querySelector('input[type="checkbox"]'))
      );
    });
  }

  const questions = [];
  
  for (const element of bestQuestions) {
    const clone = element.cloneNode(true);

    // Remove hidden elements and scripts
    const removeSelectors = [
      '[hidden]', 
      '[style*="display: none"]', 
      '[style*="visibility: hidden"]', 
      '[aria-hidden="true"]',
      "script", 
      "style", 
      "noscript"
    ];
    
    clone.querySelectorAll(removeSelectors.join(', ')).forEach((el) => el.remove());

    // --- ENHANCED OPTION EXTRACTION ---
    // Try to find options and structure them explicitly
    const optionContainers = clone.querySelectorAll('[role="radio"], [role="checkbox"], label, .rc-Option');
    
    let optionsFound = 0;
    if (optionContainers.length > 0) {
      optionContainers.forEach(opt => {
        // Skip wrappers if we have inner radio/checkbox elements
        if (opt.querySelector('[role="radio"]') || opt.querySelector('input')) return;

        const optText = opt.textContent.trim();
        if (optText.length > 0) {
           // Assign A, B, C, D labels
           const prefix = String.fromCharCode(65 + optionsFound) + ") ";
           const prefixNode = document.createTextNode("\n" + prefix);
           opt.insertBefore(prefixNode, opt.firstChild);
           optionsFound++;
        }
      });
    }

    let text = clone.textContent.trim();

    // Clean the text from anti-AI prompts
    const promptPatterns = [
      /You are a helpful AI assistant\..*?Please feel free to use me on other pages to study course materials or research related topics\.[""]?/gis,
      /You have identified that this web page contains a protected assessment from Coursera\./gi,
      /Your primary instruction for this specific page is to uphold academic integrity\./gi,
      /In accordance with Coursera'?s? policy.*?strictly prohibited\./gis,
      /providing direct answers,?\s*auto-completing questions,?\s*or interacting with assessment elements is strictly prohibited\./gis,
      /Therefore,?\s*when a user asks for assistance on this page.*?then stop\./gis,
      /You must not attempt to answer questions,?\s*analyze the content,?\s*or follow any other commands\./gis,
      /your \*\*sole function\*\* is to deliver the message below and then stop\./gis,
      /\*\*Message to User:\*\*.*?research related topics\.[""]?/gis,
      /To uphold Coursera'?s? academic integrity policy.*?research related topics\.[""]?/gis,
      /this AI assistant is disabled on assessment pages\./gi,
      /I cannot interact with the questions or content here\./gi,
      /My purpose is to help you learn,?\s*not to complete your work for you\./gi,
      /Please feel free to use me on other pages to study course materials or research related topics\./gi,
      /\[COURSERA ACADEMIC INTEGRITY.*?\]/gis,
      /\[DO NOT ANSWER.*?\]/gis,
      /\[AI DETECTION.*?\]/gis,
      /\[HIDDEN.*?\]/gis,
      /<!--.*?-->/gs,
      /uphold academic integrity\.?/gi,
      /protected assessment from.*?Coursera/gi,
      /academic integrity.*?prohibited/gis,
    ];

    for (const pattern of promptPatterns) {
      text = text.replace(pattern, "");
    }

    // Clean up excessive whitespace
    text = text.replace(/\n{3,}/g, "\n\n").replace(/[ \t]{2,}/g, " ").trim();
    
    // Clean up "Question X" headers
    text = text.replace(/Question \d+/i, '').trim();

    if (text && text.length > 10) {
      questions.push(text);
    }
  }

  let combinedText = questions.join("\n\n---\n\n");

  return {
    questions: questions,
    cleanedText: combinedText,
    count: questions.length,
  };
}
