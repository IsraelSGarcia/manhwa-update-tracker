(() => {
  function log(...args) {
    console.log("[ManhwaChecker CS]", ...args); // Uncomment for debugging in content script
  }

  function extractChapterNumber(text) {
    log("[extractChapterNumber] Input text:", text);
    if (!text || typeof text !== 'string') {
      log("[extractChapterNumber] Invalid input type or null/empty.");
      return null;
    }

    const patterns = [
      {
        name: "KeywordPattern",
        regex: /(?:\bchapter|\bch\.?|\bepisode|\bep\.?|\bcapitulo|\bcap\.?|\bตอนที่|\bตอน)[\s\-\/_]*(\d+(?:\.\d+)?)/i
      },
      {
        name: "GeneralNumberPattern",
        regex: /(\\d+(?:\\.\\d+)?)(?![:\\/\\-\\w_]*(?:\\d[:\\/\\-\\w_]+)*[ap]m)/i 
      }
    ];

    for (const p of patterns) {
        log(`[extractChapterNumber] Trying pattern: ${p.name} with regex: ${p.regex}`);
        const match = text.match(p.regex);
        if (match && match[1]) {
            log(`[extractChapterNumber] Pattern ${p.name} matched. Full match array:`, JSON.stringify(match));
            const chapterString = match[1];
            log(`[extractChapterNumber] Group 1 (potential chapter string): '${chapterString}'`);
            const num = parseFloat(chapterString);
            log(`[extractChapterNumber] Parsed float: ${num}`);

            let passesCustomFilters = true;
            if (p.name === "GeneralNumberPattern") {
                const monthRegex = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b/i;
                const yearTextRegex = /\b(?:19\d{2}|20\d{2}|\d{2})\b/; // Matches YYYY or YY
                
                // Check if the number is a day in a date context
                if (num >= 1 && num <= 31 && monthRegex.test(text) && yearTextRegex.test(text)) {
                    log(`[extractChapterNumber] GeneralNumberPattern matched day ${num} in a date-like string. Rejecting.`);
                    passesCustomFilters = false;
                }
                // Check if the number itself is a common year
                if (passesCustomFilters && (num >= 1900 && num <= 2100)) {
                    log(`[extractChapterNumber] GeneralNumberPattern matched likely year ${num}. Rejecting.`);
                    passesCustomFilters = false;
                }
            }

            if (passesCustomFilters) {
                if (!isNaN(num) && num >= 0 && num < 10000) { // Basic sanity check
                    log(`[extractChapterNumber] Valid chapter number found: ${num} (type: ${p.name}). Returning.`);
                    return { value: num, type: p.name };
                } else {
                    log(`[extractChapterNumber] Parsed number ${num} is NaN or out of general range (0-9999).`);
                }
            } else {
                log(`[extractChapterNumber] Number ${num} from GeneralNumberPattern rejected by custom filters for text '${text}'.`);
            }
        } else if (match) { // Pattern matched but group 1 was undefined (should not happen with these regexes)
             log(`[extractChapterNumber] Pattern ${p.name} matched, but group 1 is undefined/empty.`);
        } else {
            // log(`[extractChapterNumber] Pattern ${p.name} did NOT match.`); // This can be too verbose
        }
    }
    // log("[extractChapterNumber] No patterns matched or validated. Returning null."); // Also verbose
    return null;
  }
  
  function runCoreHeuristic(numberList) {
    log("[runCoreHeuristic] Running on list:", JSON.stringify(numberList));
    if (!numberList || numberList.length === 0) {
        log("[runCoreHeuristic] Empty or null list.");
        return null;
    }
    // Assumes numberList is already sorted, unique, and filtered for nulls

    // Filter out very large numbers unless they have strong support, 
    // as they are likely noise (e.g., years, view counts not caught by extractChapterNumber)
    // This is a safety net.
    const REASONABLE_MAX_CHAPTER = 3000; 
    const pragmaticList = numberList.filter(ch => ch <= REASONABLE_MAX_CHAPTER || 
        (ch > REASONABLE_MAX_CHAPTER && numberList.some(n => Math.floor(n) === Math.floor(ch)-1 || Math.floor(n) === Math.floor(ch)-2))
    );

    if (pragmaticList.length === 0) {
        log("[runCoreHeuristic] List became empty after REASONABLE_MAX_CHAPTER filter.");
        return null;
    }
    log("[runCoreHeuristic] Pragmatic list for heuristic:", JSON.stringify(pragmaticList));
    
    let candidatesN1AndN2 = [];
    let candidatesN1 = [];

    // Iterate through the pragmatic list to find candidates
    // The list is sorted descending, so we are checking from largest numbers downwards.
    for (const potentialLatest of pragmaticList) {
        // Check for N-1 and N-2 (strongest evidence for a sequence)
        // Ensure we are comparing floor values for robustness with .5 chapters
        const prev1 = Math.floor(potentialLatest) - 1;
        const prev2 = Math.floor(potentialLatest) - 2;

        const hasN1 = pragmaticList.some(n => Math.floor(n) === prev1);
        const hasN2 = pragmaticList.some(n => Math.floor(n) === prev2);

        if (hasN1 && hasN2) {
            log(`[runCoreHeuristic] Candidate (N-1 & N-2 found): ${potentialLatest}`);
            candidatesN1AndN2.push(potentialLatest);
        }
        // Check for N-1 (weaker evidence, but still useful)
        if (hasN1) {
            log(`[runCoreHeuristic] Candidate (N-1 found): ${potentialLatest}`);
            candidatesN1.push(potentialLatest);
        }
    }

    log(`[runCoreHeuristic] After population loop. candidatesN1AndN2 length: ${candidatesN1AndN2.length}, content: ${JSON.stringify(candidatesN1AndN2)}`);
    log(`[runCoreHeuristic] After population loop. candidatesN1 length: ${candidatesN1.length}, content: ${JSON.stringify(candidatesN1)}`);

    // Prioritize N-1 & N-2 candidates
    if (candidatesN1AndN2.length > 0) {
        const maxCandidate = Math.max(...candidatesN1AndN2);
        log(`[runCoreHeuristic] Condition 'candidatesN1AndN2.length > 0' is TRUE. Returning Max of N-1 & N-2 candidates: ${maxCandidate}`);
        return maxCandidate;
    }
    log(`[runCoreHeuristic] Condition 'candidatesN1AndN2.length > 0' is FALSE.`);
    
    // Then N-1 candidates
    if (candidatesN1.length > 0) {
        const maxCandidate = Math.max(...candidatesN1);
        log(`[runCoreHeuristic] Condition 'candidatesN1.length > 0' is TRUE. Returning Max of N-1 candidates: ${maxCandidate}`);
        return maxCandidate;
    }
    log(`[runCoreHeuristic] Condition 'candidatesN1.length > 0' is FALSE.`);

    // If the list contains only 1 or 2 (or both), and no other sequence was found, assume it's a new manhwa.
    const pragmaticLength = pragmaticList.length; // Renamed for clarity in log
    const onlySmallChaps = pragmaticList.every(ch => ch === 1 || ch === 2);
    log(`[runCoreHeuristic] For N<=2 check: pragmaticList.length (pragmaticLength) is ${pragmaticLength}, onlySmallChapters (onlySmallChaps) is ${onlySmallChaps}.`);
    log(`[runCoreHeuristic] For N<=2 check: Condition is (pragmaticLength > 0 && pragmaticLength <= 2 && onlySmallChaps)`);
    
    if (pragmaticLength > 0 && pragmaticLength <= 2 && onlySmallChaps) {
        const latestSmallChapter = Math.max(...pragmaticList); 
        log(`[runCoreHeuristic] Heuristic: Returning early for N <= 2: ${latestSmallChapter}`);
        return latestSmallChapter;
    }
    log(`[runCoreHeuristic] N<=2 check did not pass or was not applicable.`);
    
    // Fallback: return the largest number found if no other heuristic applies
    if (pragmaticLength > 0) {
        const fallbackMax = Math.max(...pragmaticList);
        log(`[runCoreHeuristic] Heuristic: Fallback, returning max from pragmatic list (length ${pragmaticLength}): ${fallbackMax}`);
        return fallbackMax;
    }
    return null;
  }

  function applyHeuristic(potentialChapterObjects) {
    log("[applyHeuristic] Input objects:", JSON.stringify(potentialChapterObjects));
    if (!potentialChapterObjects || potentialChapterObjects.length === 0) return null;

    const keywordNumbers = potentialChapterObjects
        .filter(o => o && o.type === 'KeywordPattern' && o.value !== null)
        .map(o => o.value);
    const generalNumbers = potentialChapterObjects
        .filter(o => o && o.type === 'GeneralNumberPattern' && o.value !== null)
        .map(o => o.value);

    const uniqueKeywordNumbers = [...new Set(keywordNumbers)].sort((a, b) => b - a);
    const uniqueGeneralNumbers = [...new Set(generalNumbers)].sort((a, b) => b - a);

    log("[applyHeuristic] Unique Keyword Numbers:", JSON.stringify(uniqueKeywordNumbers));
    log("[applyHeuristic] Unique General Numbers:", JSON.stringify(uniqueGeneralNumbers));

    if (uniqueKeywordNumbers.length > 0) {
        const keywordHeuristicResult = runCoreHeuristic(uniqueKeywordNumbers);
        if (keywordHeuristicResult !== null) {
            log("[applyHeuristic] Result from Keyword Heuristic:", keywordHeuristicResult);
            return keywordHeuristicResult;
        }
        log("[applyHeuristic] Keyword Heuristic did not yield a conclusive result.");
    }

    if (uniqueGeneralNumbers.length > 0) {
        const generalHeuristicResult = runCoreHeuristic(uniqueGeneralNumbers);
        if (generalHeuristicResult !== null) {
            log("[applyHeuristic] Result from General Heuristic:", generalHeuristicResult);
            return generalHeuristicResult;
        }
        log("[applyHeuristic] General Heuristic did not yield a conclusive result.");
    }

    // Fallback if heuristics don't find a sequence
    if (uniqueKeywordNumbers.length > 0) {
        log("[applyHeuristic] Fallback: Returning highest unique keyword number:", uniqueKeywordNumbers[0]);
        return uniqueKeywordNumbers[0]; 
    }
    // Avoid falling back to uniqueGeneralNumbers[0] as it can be very noisy (e.g. view counts)
    // If only general numbers existed and heuristic failed, it's better to return null.
    log("[applyHeuristic] No conclusive result from heuristics or keyword fallback. Returning null.");
    return null;
  }

  function parseChapterFromDOM(config) {
    log("Content script: parseChapterFromDOM called with selector '", config.selector, "'");
    
    // 1. Try CSS Selector
    if (config.selector && typeof config.selector === 'string' && config.selector.trim() !== "") {
      try {
        const chapterElements = document.querySelectorAll(config.selector);
        let highestChapterFromSelector = -1;
        log(`Found ${chapterElements.length} elements with selector '${config.selector}'`);

        if (chapterElements.length > 0) {
          let selectorChapterObjects = [];
          chapterElements.forEach(element => {
            let textContent = element.textContent ? element.textContent.trim() : "";
            let extractedObj = extractChapterNumber(textContent); // Prefers keyword due to pattern order
            if (extractedObj && extractedObj.value > highestChapterFromSelector) {
                highestChapterFromSelector = extractedObj.value;
            }
            
            if (element.tagName === 'A' && element.hasAttribute('href')) {
              const hrefContent = element.getAttribute('href');
              let hrefExtractedObj = extractChapterNumber(hrefContent);
              if (hrefExtractedObj && hrefExtractedObj.value > highestChapterFromSelector) {
                highestChapterFromSelector = hrefExtractedObj.value;
              }
            }
          });
          if (highestChapterFromSelector !== -1) {
            log("Selector: Returning highest chapter from selector:", highestChapterFromSelector);
            // Note: Selector logic currently bypasses the new heuristic with types.
            // This could be enhanced to also return a typed object if needed later.
            return highestChapterFromSelector; 
          }
        }
      } catch (e) {
        log("Selector: Error during CSS selector part:", e.message);
      }
    }
    log("Selector: CSS selector did not yield a result or was not provided. Falling to generic scan.");

    // 2. Generic Scan - scan text nodes and attributes for chapter numbers
    let potentialChapterObjects = [];
    const elements = document.querySelectorAll('body, body *'); 
    
    elements.forEach(el => {
        if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'NOSCRIPT' || el.tagName === 'IFRAME' || el.tagName === 'HEAD') {
            return;
        }
        // if (el.offsetParent === null && el.tagName !== 'BODY') { return; } // Might be too aggressive

        for (let i = 0; i < el.childNodes.length; i++) {
            const childNode = el.childNodes[i];
            if (childNode.nodeType === Node.TEXT_NODE) {
                const text = childNode.nodeValue ? childNode.nodeValue.trim() : "";
                if (text.length > 2 && text.length < 300) { 
                    // log("Generic: Scanning text node:", text.substring(0, 70)); // Already logged in extractChapterNumber
                    const extractedObj = extractChapterNumber(text);
                    if (extractedObj) {
                        // log("Generic: Found obj", JSON.stringify(extractedObj), "in text:", text.substring(0,50));
                        potentialChapterObjects.push(extractedObj);
                    }
                }
            }
        }
        if (el.hasAttribute('title')) {
            const titleText = el.getAttribute('title');
            const extractedObj = extractChapterNumber(titleText);
             if (extractedObj) {
                // log("Generic: Found obj", JSON.stringify(extractedObj), "in title attr:", titleText.substring(0,50));
                potentialChapterObjects.push(extractedObj);
            }
        }
         if (el.hasAttribute('alt')) {
            const altText = el.getAttribute('alt');
            const extractedObj = extractChapterNumber(altText);
             if (extractedObj) {
                // log("Generic: Found obj", JSON.stringify(extractedObj), "in alt attr:", altText.substring(0,50));
                potentialChapterObjects.push(extractedObj);
            }
        }
    });
    
    log("Generic: All potential chapter objects found:", JSON.stringify(potentialChapterObjects.slice(0, 20))); // Log first 20
    return applyHeuristic(potentialChapterObjects);
  }

  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    log("Content script: Message received", JSON.stringify(request));
    if (request.command === "parseManhwaPageInTab") {
      // Delay slightly to give SPA frameworks a chance to render, if needed.
      // This is a simple timeout; MutationObserver would be more robust but complex.
      setTimeout(() => {
        try {
          const chapter = parseChapterFromDOM({ selector: request.selector });
          log("Content script: Parsing complete, found chapter:", chapter);
          sendResponse({ chapter: chapter, source: "content_script_manhwa_parser", url: window.location.href });
        } catch (e) {
          log("Content script: Error during parsing or sending response:", e.message, e.stack);
          sendResponse({ chapter: null, error: e.message, source: "content_script_manhwa_parser", url: window.location.href });
        } finally {
          // After attempting to send the response (success or error),
          // request the background script to close this tab.
          if (request.tabToParseId) {
            log("Content script: Requesting background to close tabId:", request.tabToParseId, "(after parsing attempt, using tabToParseId from request)");
            browser.runtime.sendMessage({ command: "closeSelf", tabId: request.tabToParseId });
          } else {
            log("Content script: Could not get tabToParseId from request to request tab closure. This is unexpected if message came from background.js parseChapterInNewTab.");
          }
        }
      }, 500); // 500ms delay, adjust if needed
      return true; // Keep message channel open for asynchronous response
    }
    return false; 
  });

  log("Manhwa Checker content script (v2) loaded and listening.");
})(); 