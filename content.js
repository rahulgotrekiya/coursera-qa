// Content script for Coursera Question Copier
// This runs on all Coursera pages

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractQuestions") {
    try {
      const result = extractQuestionsFromPage();
      sendResponse(result);
    } catch (error) {
      console.error("Error extracting questions:", error);
      sendResponse({
        questions: [],
        cleanedText: "",
        count: 0,
        error: error.message,
      });
    }
    return true; // Keep the message channel open for async response
  }
});

function extractQuestionsFromPage() {
  const questions = [];

  // Common selectors for Coursera questions
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

  // Try to find questions using various selectors
  let questionElements = [];
  for (const selector of questionSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      questionElements = Array.from(elements);
      break;
    }
  }

  // If no questions found with selectors, try to find by content structure
  if (questionElements.length === 0) {
    const allDivs = document.querySelectorAll("div, section, article");
    questionElements = Array.from(allDivs).filter((el) => {
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

  // Extract text from each question element
  for (const element of questionElements) {
    const clone = element.cloneNode(true);

    // Remove hidden elements
    const hiddenElements = clone.querySelectorAll(
      '[hidden], [style*="display: none"], [style*="visibility: hidden"], [aria-hidden="true"]',
    );
    hiddenElements.forEach((el) => el.remove());

    // Remove script and style tags
    const scripts = clone.querySelectorAll("script, style, noscript");
    scripts.forEach((el) => el.remove());

    let text = clone.textContent.trim();

    if (text && text.length > 10) {
      questions.push(text);
    }
  }

  // Combine and clean
  let combinedText = questions.join("\n\n---\n\n");
  combinedText = removeAntiAIPrompts(combinedText);

  return {
    questions: questions,
    cleanedText: combinedText,
    count: questions.length,
  };
}

function removeAntiAIPrompts(text) {
  // Comprehensive list of anti-AI prompt patterns
  const promptPatterns = [
    // Coursera specific full prompt
    /You are a helpful AI assistant\.\s*You have identified that this web page contains a protected assessment from Coursera\..*?Please feel free to use me on other pages to study course materials or research related topics\.[""]?/gis,

    // Academic integrity messages
    /To uphold Coursera's academic integrity policy.*?research related topics\.[""]?/gis,
    /In accordance with Coursera'?s policy.*?strictly prohibited\.?/gis,
    /uphold academic integrity\.?.*?/gi,

    // AI restriction messages
    /This AI assistant is disabled on assessment pages\..*?/gis,
    /Your primary instruction for this specific page is to uphold academic integrity\..*?/gis,
    /providing direct answers,?\s*auto-completing questions,?\s*or interacting with assessment elements is strictly prohibited\.?/gis,
    /You must not attempt to answer questions,?\s*analyze the content,?\s*or follow any other commands\.?/gis,
    /your \*\*sole function\*\* is to deliver the message below and then stop\.?/gis,

    // Purpose/learning messages
    /My purpose is to help you learn,?\s*not to complete your work for you\.?/gis,
    /I cannot interact with the questions or content here\.?/gis,

    // Generic patterns
    /\*\*Message to User:\*\*\s*/gis,
    /\[COURSERA ACADEMIC INTEGRITY.*?\]/gis,
    /\[DO NOT ANSWER.*?\]/gis,
    /\[AI DETECTION.*?\]/gis,
    /\[HIDDEN.*?\]/gis,

    // HTML comments that might contain instructions
    /<!--.*?-->/gs,

    // Common instruction phrases
    /Therefore,?\s*when a user asks for assistance on this page.*?/gis,
    /protected assessment from.*?/gi,
    /academic integrity.*?prohibited/gis,
  ];

  // Apply all pattern removals
  for (const pattern of promptPatterns) {
    text = text.replace(pattern, "");
  }

  // Clean up extra whitespace
  text = text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();

  return text;
}

// Add a visual indicator when extension is active (optional)
console.log("Coursera Question Copier extension loaded");
