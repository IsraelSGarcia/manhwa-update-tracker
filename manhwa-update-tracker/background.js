const DEFAULT_MANHWA_LIST = [];
// Determine environment once
const IS_PC_ENVIRONMENT = typeof browser !== "undefined" && typeof browser.history !== "undefined" && typeof browser.history.search === 'function';

async function getManhwaList() {
  try {
    let data = await browser.storage.local.get("manhwaList");
    if (browser.runtime.lastError) {
      throw browser.runtime.lastError; 
    }
    
    if (data && data.manhwaList) { 
      return data.manhwaList;
    } else {
      await browser.storage.local.set({ manhwaList: DEFAULT_MANHWA_LIST }); 
      if (browser.runtime.lastError) {
        // Error setting initial list
      }
      return DEFAULT_MANHWA_LIST;
    }
  } catch (error) {
    return DEFAULT_MANHWA_LIST; 
  }
}

async function saveManhwaList(list) {
  try {
    await browser.storage.local.set({ manhwaList: list });
    if (browser.runtime.lastError) {
      throw browser.runtime.lastError; 
    }
  } catch (error) {
    // Critical error saving
  }
}

async function fetchHtml(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); 
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${url}`);
    }
    return await response.text();
  } catch (error) {
    return null;
  }
}

// Helper function to fetch JSON data
async function fetchJson(url) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); 
    const response = await fetch(url, { 
        signal: controller.signal,
        headers: { 'Accept': 'application/json' } 
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${url}`);
    }
    return await response.json();
  } catch (error) {
    return null;
  }
}

// Helper function to extract series slug from Omega Scans URL
function getOmegaScansSeriesSlug(url) {
    try {
        const path = new URL(url).pathname;
        const parts = path.split('/');
        if (parts.length >= 3 && parts[1] === 'series') {
            return parts[2];
        }
    } catch (e) {
        // Error parsing slug
    }
    return null;
}

// Helper function to parse latest chapter from Omega Scans API (LOGGING VERSION)
async function parseLatestChapterFromOmegaScansAPI(item) {
    const seriesSlug = getOmegaScansSeriesSlug(item.url);
    if (!seriesSlug) {
        return null;
    }

    const seriesDetailsUrl = `https://api.omegascans.org/series/${seriesSlug}`;
    const seriesData = await fetchJson(seriesDetailsUrl);

    if (!seriesData) {
        return null;
    }
    
    const seriesId = seriesData.id; 

    if (!seriesId) {
        return null;
    }

    // Fetch up to 5 latest chapters to check for non-premium ones
    const chaptersApiUrl = `https://api.omegascans.org/chapter/query?page=1&perPage=5&series_id=${seriesId}`;
    const chaptersResponse = await fetchJson(chaptersApiUrl);

    if (!chaptersResponse || !chaptersResponse.data || !Array.isArray(chaptersResponse.data) || chaptersResponse.data.length === 0) {
        return null;
    }

    // Iterate through fetched chapters to find the latest non-premium one
    for (const chapterEntry of chaptersResponse.data) {
        // A chapter is premium if its price is greater than 0.
        const isPremium = chapterEntry.price !== undefined && chapterEntry.price > 0;

        if (!isPremium && chapterEntry.chapter_name && typeof chapterEntry.chapter_name === 'string') {
            const nameMatch = chapterEntry.chapter_name.match(/Chapter\s*(\d+(\.\d+)?)/i);
            if (nameMatch && nameMatch[1]) {
                const numFromName = parseFloat(nameMatch[1]);
                if (!isNaN(numFromName)) {
                    return numFromName; // Return the first non-premium chapter number found
                }
            }
        }
    }
    // If all fetched chapters are premium or no valid chapter number found
    return null;
}

// New function to parse chapter by opening the URL in a new, inactive tab
async function parseChapterInNewTab(item) {
  console.log(`[DEBUG parseChapterInNewTab] Called for ${item.url}`);
  return new Promise(async (resolve, reject) => {
    let tempTabId = null;
    const onTabUpdatedListener = (tabId, changeInfo, tab) => {
      if (tabId === tempTabId && changeInfo.status === 'complete') {
        console.log(`[DEBUG parseChapterInNewTab] Tab ${tabId} loaded complete for ${item.url}. Sending message to content script.`);
        browser.tabs.sendMessage(tabId, {
          command: "parseManhwaPageInTab",
          selector: item.siteConfig.latestChapterSelector, // Send configured selector
          tabToParseId: tabId // <<< ADDED THIS LINE
        }).then(response => {
          console.log(`[DEBUG parseChapterInNewTab] Response from content script for ${item.url}:`, response);
          if (browser.runtime.lastError) {
            console.error(`[DEBUG parseChapterInNewTab] Error sending message or receiving response for ${item.url}:`, browser.runtime.lastError.message);
            resolve(null); // Resolve with null on error
          } else if (response && response.chapter !== undefined) {
            resolve(response.chapter);
          } else {
            console.warn(`[DEBUG parseChapterInNewTab] Invalid or no response from content script for ${item.url}.`);
            resolve(null);
          }
        }).catch(err => {
          console.error(`[DEBUG parseChapterInNewTab] Error in sendMessage promise for ${item.url}:`, err.message);
          resolve(null);
        }).finally(() => {
          browser.tabs.onUpdated.removeListener(onTabUpdatedListener); // Remove listener
          // Tab closing is now handled by the 'closeSelf' message from content_script,
          // so no direct tab removal here in the finally block of parseChapterInNewTab.
          // The tempTabId is still cleared if it was set.
          if (tempTabId) {
            // console.log(`[DEBUG parseChapterInNewTab] Tab ${tempTabId} processing finished. Closure handled by content_script via closeSelf.`);
            tempTabId = null;
          }
        });
      }
    };

    try {
      browser.tabs.onUpdated.addListener(onTabUpdatedListener);
      const createdTab = await browser.tabs.create({ url: item.url, active: false });
      tempTabId = createdTab.id;
      console.log(`[DEBUG parseChapterInNewTab] Created inactive tab ${tempTabId} for ${item.url}`);
      // Add a timeout in case the tab never completes or content script fails to respond
      setTimeout(() => {
        if (tempTabId) { // If tab still exists and listener hasn't cleaned up
          console.warn(`[DEBUG parseChapterInNewTab] Timeout waiting for tab or content script for ${item.url}.`);
          browser.tabs.onUpdated.removeListener(onTabUpdatedListener);
          // No direct tab removal on timeout here either; rely on content script's finally block to send closeSelf
          // or if it never even loaded/sent a message, the tab might remain (edge case).
          // For now, let's assume content script will always try to send closeSelf.
          // console.log(`[DEBUG parseChapterInNewTab] Tab ${tempTabId} for ${item.url} timed out. Closure relies on content_script.`);
          tempTabId = null;
          resolve(null); // Resolve with null on timeout
        }
      }, 30000); // 30 second timeout
    } catch (error) {
      console.error(`[DEBUG parseChapterInNewTab] Error creating tab or setting up listener for ${item.url}:`, error.message);
      if (tempTabId) {
        browser.tabs.remove(tempTabId).catch(e => console.warn(`[DEBUG parseChapterInNewTab] Failed to remove tab on error ${tempTabId}:`, e.message));
      }
      browser.tabs.onUpdated.removeListener(onTabUpdatedListener);
      resolve(null); // Resolve with null on error
    }
  });
}

async function parseLatestChapterFromSite(htmlContent, item) {
  console.log(`[DEBUG] parseLatestChapterFromSite CALLED for URL: ${item ? item.url : 'ITEM_UNDEFINED'}, Title: ${item ? item.title : 'ITEM_UNDEFINED'}`);
  if (!item || !item.siteConfig) {
    console.log("[DEBUG] parseLatestChapterFromSite: Exiting early - item or item.siteConfig is null/undefined.");
    return null;
  }
  
  // OmegaScans uses its API, so it bypasses the tab parsing logic for now.
  if (item.url.includes("omegascans.org")) {
    const apiChapter = await parseLatestChapterFromOmegaScansAPI(item);
    if (apiChapter !== null) {
        return apiChapter; 
    }
    // If API fails, don't fall back to generic HTML parsing for OmegaScans for now
    return null; 
  }

  if (!htmlContent) { 
    console.log(`[DEBUG] parseLatestChapterFromSite: htmlContent is null for ${item.url}. This is expected if it's a tab-parse site and called directly by checkAllManhwa initially.`);
    return null;
  }

  const { latestChapterSelector } = item.siteConfig;
  const generalChapterNumberRegex = /(\d+(\.\d+)?)/; // General regex for chapter numbers
  const keywordChapterRegex = /(?:chapter|ch\.?|episode|ep\.?|capitulo|cap\.?|ตอนที่|ตอน)[\s\-\/_]*(\d+(?:\.\d+)?)/i; // More specific

  // BATO.TO / MTO.TO SPECIFIC LOGIC ATTEMPT
  if (item.url.includes("bato.to/") || item.url.includes("mto.to/")) {
    console.log(`[DEBUG parseLatestChapterFromSite] Bato.to/mto.to site detected: ${item.url}. Attempting Bato-specific parsing.`);
    let highestChapterFromBatoPath = -1;
    let successfulBatoStrategy = "";

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlContent, "text/html");

        // Strategy 1: Links with "/chapter/" in href
        let strategy1Elements = Array.from(doc.querySelectorAll('a[href*="/chapter/"]'));
        if (strategy1Elements.length > 0) {
            console.log(`[DEBUG parseLatestChapterFromSite] Bato Strategy 1 (a[href*="/chapter/"]): Found ${strategy1Elements.length} elements for ${item.url}.`);
            strategy1Elements.forEach(element => {
                const textContent = element.textContent.trim();
                let num = -1;
                const keywordMatch = textContent.match(keywordChapterRegex);
                if (keywordMatch && keywordMatch[1]) {
                    num = parseFloat(keywordMatch[1]);
                } else {
                    const generalMatch = textContent.match(generalChapterNumberRegex);
                    if (generalMatch && generalMatch[1]) {
                        num = parseFloat(generalMatch[1]);
                    }
                }
                if (!isNaN(num) && num > highestChapterFromBatoPath) {
                    highestChapterFromBatoPath = num;
                    successfulBatoStrategy = 'a[href*="/chapter/"] with keyword/general number match';
                }
            });
        } else {
            console.log(`[DEBUG parseLatestChapterFromSite] Bato Strategy 1 (a[href*="/chapter/"]): No elements found for ${item.url}.`);
        }

        // Strategy 2: All 'a' tags, but strict keyword match, only if Strategy 1 failed to find a chapter
        if (highestChapterFromBatoPath === -1) {
            console.log(`[DEBUG parseLatestChapterFromSite] Bato Strategy 1 failed to find a chapter for ${item.url}. Attempting Bato Strategy 2 (all 'a' tags with strict keyword match).`);
            let strategy2Elements = Array.from(doc.querySelectorAll('a'));
            if (strategy2Elements.length > 0) {
                 console.log(`[DEBUG parseLatestChapterFromSite] Bato Strategy 2 (all 'a' tags): Found ${strategy2Elements.length} elements for ${item.url}.`);
                strategy2Elements.forEach(element => {
                    const textContent = element.textContent.trim();
                    let num = -1;
                    const keywordMatch = textContent.match(keywordChapterRegex);
                    if (keywordMatch && keywordMatch[1]) {
                        num = parseFloat(keywordMatch[1]);
                    }
                    // No general number match fallback here for stricter parsing
                    if (!isNaN(num) && num > highestChapterFromBatoPath) {
                        highestChapterFromBatoPath = num;
                        successfulBatoStrategy = 'all "a" tags with strict keyword match';
                    }
                });
            } else {
                console.log(`[DEBUG parseLatestChapterFromSite] Bato Strategy 2 (all 'a' tags): No 'a' elements found at all for ${item.url}.`);
            }
        }
      
        if (highestChapterFromBatoPath !== -1) {
            console.log(`[DEBUG parseLatestChapterFromSite] For ${item.url}, (Bato.to Specific Path using strategy: "${successfulBatoStrategy}") found: ${highestChapterFromBatoPath}.`);
            return highestChapterFromBatoPath;
        } else {
            console.log(`[DEBUG parseLatestChapterFromSite] For ${item.url}, (Bato.to Specific Path) both strategies failed. Will proceed to other methods.`);
        }
    } catch (e) {
        console.error(`[DEBUG parseLatestChapterFromSite] For ${item.url}, (Bato.to Specific Path) error: ${e.message}`);
    }
    // If Bato-specific path fails to return, it will fall through.
  }

  // Priority path for Madara-like themes (e.g., webtoonscan)
  if (latestChapterSelector && latestChapterSelector.includes('li.wp-manga-chapter a')) {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");
      const madaraChapterElements = doc.querySelectorAll('li.wp-manga-chapter a');
      let highestChapterFromMadaraPath = -1;

      if (madaraChapterElements.length > 0) {
        madaraChapterElements.forEach(element => {
          const textContent = element.textContent.trim();
          let num = -1;
          const keywordMatch = textContent.match(keywordChapterRegex);
          if (keywordMatch && keywordMatch[1]) {
            num = parseFloat(keywordMatch[1]);
          } else {
            // Fallback to general number match if specific keyword pattern not found in link text
            const generalMatch = textContent.match(generalChapterNumberRegex);
            if (generalMatch && generalMatch[1]) {
              num = parseFloat(generalMatch[1]);
            }
          }

          if (!isNaN(num) && num > highestChapterFromMadaraPath) {
            highestChapterFromMadaraPath = num;
          }
        });

        if (highestChapterFromMadaraPath !== -1) {
          console.log(`[DEBUG parseLatestChapterFromSite] For ${item.url}, (Madara Priority Path) CSS selector found: ${highestChapterFromMadaraPath}.`);
          return highestChapterFromMadaraPath;
        }
      }
    } catch (e) {
      console.error(`[DEBUG parseLatestChapterFromSite] For ${item.url}, (Madara Priority Path) error: ${e.message}`);
    }
  }

  // Original broader selector logic (if Madara path failed or wasn't applicable)
  if (latestChapterSelector && latestChapterSelector.trim() !== "") {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, "text/html");
      // Query all elements matching the full selector string
      const chapterElements = doc.querySelectorAll(latestChapterSelector); 
      
      let highestChapterFromSelector = -1;
      let elementSourceForHighestChapter = ""; 

      if (chapterElements.length > 0) {
        chapterElements.forEach(element => {
            let num = -1;
            const textContent = element.textContent.trim();
            // Try specific keyword match first within the broader selection's text
            const keywordMatch = textContent.match(keywordChapterRegex);
            if (keywordMatch && keywordMatch[1]) {
                num = parseFloat(keywordMatch[1]);
            } else {
                // Fallback to general number match
                const generalMatch = textContent.match(generalChapterNumberRegex);
                if (generalMatch && generalMatch[1]) {
                    num = parseFloat(generalMatch[1]);
                }
            }

            if (!isNaN(num) && num > highestChapterFromSelector) {
                highestChapterFromSelector = num;
                elementSourceForHighestChapter = textContent; 
            }
        });

        if (highestChapterFromSelector !== -1) {
            console.log(`[DEBUG parseLatestChapterFromSite] For ${item.url}, (General Selector Path) CSS selector found: ${highestChapterFromSelector}. Extracted from text: "${elementSourceForHighestChapter.substring(0, 100)}"`);
            return highestChapterFromSelector; 
        }
      }
    } catch (e) {
      console.error(`[DEBUG parseLatestChapterFromSite] For ${item.url}, (General Selector Path) CSS selector error: ${e.message}`);
    }
  }

  // Fallback: Generic regex parsing on the whole body text if CSS selectors fail
  // This is the original fallback logic using a broad regex on body text
  console.log(`[DEBUG parseLatestChapterFromSite] For ${item.url}, falling back to generic body text regex parsing (direct HTML).`);
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, "text/html");
    
    doc.querySelectorAll('script, style, noscript, iframe, head').forEach(el => el.remove());
    
    console.log(`[DEBUG parseLatestChapterFromSite] For ${item.url}, body.innerHTML for generic search (direct HTML, first 2000 chars): ${doc.body ? doc.body.innerHTML.substring(0,2000) : 'NO_BODY_TAG'}`);
    const bodyText = doc.body ? doc.body.textContent : htmlContent; 
    console.log(`[DEBUG parseLatestChapterFromSite] For ${item.url}, bodyText for generic search (direct HTML, first 500 chars): ${bodyText.substring(0,500)}`);

    const genericChapterRegex = new RegExp(
        '(?:\b(?:Chapter|Ch\.|Ch|Episode|Ep\.|Ep|Capítulo|Capitulo|Cap\.|Cap|ตอนที่|ตอน)\s*\:?\s*)(\d+)(?:\.(\d+))?',
        'gi' 
    );

    let potentialChapters = [];
    let match;
    while ((match = genericChapterRegex.exec(bodyText)) !== null) {
        let chapterNumberString = match[1];
        if (match[2]) { 
            chapterNumberString += "." + match[2];
        }
        const chapterNum = parseFloat(chapterNumberString);
        if (!isNaN(chapterNum)) {
            potentialChapters.push(chapterNum);
        }
    }
    console.log(`[DEBUG parseLatestChapterFromSite] For ${item.url}, potential chapters from generic regex (direct HTML): ${JSON.stringify(potentialChapters)}`);

    if (potentialChapters.length === 0) {
      console.log(`[DEBUG parseLatestChapterFromSite] For ${item.url}, no potential chapters found by generic regex (direct HTML).`);
      return null;
    }

    const uniqueChapters = [...new Set(potentialChapters)].sort((a, b) => b - a);
    console.log(`[DEBUG parseLatestChapterFromSite] For ${item.url}, unique sorted chapters (direct HTML): ${JSON.stringify(uniqueChapters)}`);

    for (const potentialLatest of uniqueChapters) {
      const N = Math.floor(potentialLatest); 

      if (N <= 2) { 
        console.log(`[DEBUG parseLatestChapterFromSite] For ${item.url}, returning early for N <= 2 (direct HTML): ${potentialLatest}`);
        return potentialLatest;
      }

      const precedingFound = uniqueChapters.some(ch => Math.floor(ch) === N - 1 || Math.floor(ch) === N - 2);
      
      if (precedingFound) {
        console.log(`[DEBUG parseLatestChapterFromSite] For ${item.url}, heuristic pass for ${potentialLatest} (direct HTML)`);
        return potentialLatest;
      }
    }

    if (uniqueChapters.length > 0) {
        console.log(`[DEBUG parseLatestChapterFromSite] For ${item.url}, returning largest unique chapter (heuristic failed, direct HTML): ${uniqueChapters[0]}`);
        return uniqueChapters[0];
    }

  } catch (e) {
    console.error(`[DEBUG parseLatestChapterFromSite] For ${item.url}, generic parsing error (direct HTML): ${e.message}`);
  }

  return null; 
}

// New function to attempt fetching chapters for mangaforfree.com via AJAX
async function fetchChaptersViaMangaForFreeAjax(item) {
  console.log(`[DEBUG fetchChaptersViaMangaForFreeAjax] Attempting AJAX chapter fetch for ${item.title}`);
  try {
    // 1. Fetch the main manga page to get the post ID
    const mainPageHtml = await fetchHtml(item.url);
    if (!mainPageHtml) {
      console.log(`[DEBUG fetchChaptersViaMangaForFreeAjax] Failed to fetch main page HTML for ${item.url}`);
      return null;
    }

    // 2. Parse the main page HTML to find the post_id from data-id attribute
    const postIdMatch = mainPageHtml.match(/id="manga-chapters-holder"[^>]*data-id="(\d+)"/);
    const postId = postIdMatch ? postIdMatch[1] : null;

    if (!postId) {
      console.log(`[DEBUG fetchChaptersViaMangaForFreeAjax] Could not find post_id (data-id) on ${item.url}`);
      return null;
    }
    console.log(`[DEBUG fetchChaptersViaMangaForFreeAjax] Found post_id: ${postId} for ${item.url}`);

    // 3. Prepare data for the AJAX request
    const formData = new FormData();
    formData.append('action', 'manga_get_chapters');
    formData.append('manga', postId); // Corrected parameter name from 'post' to 'manga'

    // 4. Make the AJAX request to load chapters
    const ajaxUrl = new URL('/wp-admin/admin-ajax.php', item.url).href; // Assumes same domain
    const response = await fetch(ajaxUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.log(`[DEBUG fetchChaptersViaMangaForFreeAjax] AJAX request failed for ${item.url} - Status: ${response.status}`);
      return null;
    }

    const chaptersHtml = await response.text();
    if (!chaptersHtml) {
      console.log(`[DEBUG fetchChaptersViaMangaForFreeAjax] AJAX response contained no HTML for ${item.url}`);
      return null;
    }

    // 5. Parse the returned HTML snippet (which contains the chapter list)
    const parser = new DOMParser();
    const doc = parser.parseFromString(chaptersHtml, "text/html");
    // Query directly on the parsed document/fragment.
    // The response is a list of LIs inside a UL, potentially wrapped in other divs.
    const chapterElements = doc.querySelectorAll('ul.version-chap li.wp-manga-chapter a'); 
    
    if (chapterElements.length === 0) {
      // Fallback selector if the primary one fails (e.g. if the UL itself is the root of the fragment)
      const fallbackElements = doc.querySelectorAll('li.wp-manga-chapter a');
      if (fallbackElements.length > 0) {
         console.log(`[DEBUG fetchChaptersViaMangaForFreeAjax] Using fallback selector for chapter elements for ${item.url}`);
         chapterElements = fallbackElements; 
      } else {
        console.log(`[DEBUG fetchChaptersViaMangaForFreeAjax] No chapter elements found in AJAX response (main and fallback selectors) for ${item.url}`);
        console.log("[DEBUG fetchChaptersViaMangaForFreeAjax] AJAX Response HTML (first 500 chars):", chaptersHtml.substring(0,500));
        return null;
      }
    }

    let highestChapter = -1;
    const keywordChapterRegex = /(?:chapter|ch\.?|episode|ep\.?|capitulo|cap\.?|ตอนที่|ตอน)[\s\-\/_]*(\d+(?:\.\d+)?)/i;
    const generalChapterNumberRegex = /(\d+(?:\.\d+)?)/;

    chapterElements.forEach(element => {
      const textContent = element.textContent.trim();
      let num = -1;
      const keywordMatch = textContent.match(keywordChapterRegex);
      if (keywordMatch && keywordMatch[1]) {
        num = parseFloat(keywordMatch[1]);
        } else {
        const generalMatch = textContent.match(generalChapterNumberRegex);
        if (generalMatch && generalMatch[1]) {
          num = parseFloat(generalMatch[1]);
        }
      }
      if (!isNaN(num) && num > highestChapter) {
        highestChapter = num;
      }
    });

    if (highestChapter !== -1) {
      console.log(`[DEBUG fetchChaptersViaMangaForFreeAjax] Successfully extracted highest chapter: ${highestChapter} for ${item.title}`);
      return highestChapter;
    }
    console.log(`[DEBUG fetchChaptersViaMangaForFreeAjax] Could not extract a chapter number from AJAX response for ${item.title}`);
    return null;

  } catch (error) {
    console.error(`[DEBUG fetchChaptersViaMangaForFreeAjax] Error during AJAX chapter fetch for ${item.title}:`, error);
    return null;
  }
}

// SHARED private helper function for chapter parsing from a list of history items
function _parseChapterFromHistoryItems(historyItems, seriesUrl, debugPrefix = "HISTORY", seriesTitle = "") {
  let latestReadChapter = 0;
  if (!historyItems || historyItems.length === 0) {
    return latestReadChapter;
  }

  const chapterNumberRegex = /(?:chapter|ch\.?|episode|ep\.?|capitulo|cap\.?|ตอนที่|ตอน|chap|章|화|ตอนที่|ตอน)[\s\-\/_:]*(\d+(?:\.\d+)?)/i;
  const urlChapterRegex = /[\/\-_](\d+(?:\.\d+)?)(?:[\/\-_#?].*)?$/i;

  // Sort items if they have a timestamp; standard browser history items from search might not.
  // Custom history items do have a .timestamp property.
  const sortableItems = [...historyItems]; // Clone to avoid mutating original if it came from elsewhere
  if (sortableItems[0] && typeof sortableItems[0].timestamp === 'number') {
      sortableItems.sort((a,b) => b.timestamp - a.timestamp); 
  }
  // If no timestamps, process in the order received (browser.history.search often returns recent first anyway)

  // For Bato.to/Mto.to, check if the item's title significantly matches the provided seriesTitle
  // This is an additional filter specific to Bato/Mto broader history search results
  const isBatoOrMto = seriesUrl.includes("bato.to") || seriesUrl.includes("mto.to");

  for (const item of sortableItems) { // item is from a history source
    let chapterNumber = 0;
    let parsedFrom = "";

    // If it's Bato/Mto and a seriesTitle was provided for context, 
    // ensure the history item title is a close match to the series title before proceeding.
    if (isBatoOrMto && seriesTitle && item.title) {
      // Normalize titles for comparison: lowercase and remove common non-alphanumeric characters
      const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/gi, '').replace(/\s+/g, ' ').trim();
      const normalizedItemTitle = normalize(item.title);
      const normalizedSeriesTitle = normalize(seriesTitle);
      
      // Check if the item title starts with a significant portion of the series title
      // (e.g., at least the first 3 words or 15 characters, whichever is shorter and relevant)
      const seriesTitleWords = normalizedSeriesTitle.split(' ');
      const comparisonLength = Math.min(15, normalizedSeriesTitle.length);
      const significantSeriesTitleStart = normalizedSeriesTitle.substring(0, comparisonLength);
      
      // A simple startsWith check might be too strict. Let's check for inclusion of key parts.
      // More robust: check if item title contains a good chunk of series title.
      // For now, let's ensure the item title *contains* the significant start of the series title.
      if (!normalizedItemTitle.includes(significantSeriesTitleStart)) {
        // console.log(`[${debugPrefix} DEBUG BATO SKIP] History item title "${item.title.substring(0,50)}" does not sufficiently match series "${seriesTitle.substring(0,50)}". Skipping.`);
        continue; // Skip this history item if titles don't align for Bato/Mto
      }
    }

    // Bato.to/Mto.to specific logging for this item if relevant (only for standard history, custom history does its own item logging before this function)
    if (debugPrefix === "HISTORY" && item.url && (item.url.includes('bato.to') || item.url.includes('mto.to'))) {
        console.log(`[${debugPrefix} DEBUG BATO] Processing Bato/Mto history item: URL='${item.url}', Title='${item.title ? item.title.substring(0,100) : 'N/A'}'`);
    }

    // 1. Try parsing from title
    if (item.title) {
      const titleMatch = item.title.match(chapterNumberRegex);
      if (titleMatch && titleMatch[1]) {
        chapterNumber = parseFloat(titleMatch[1]);
        parsedFrom = "title";
      }
    }

    // 2. If not found in title, try parsing from URL
    if (chapterNumber === 0 && item.url) {
        const urlKeywordMatch = item.url.match(chapterNumberRegex);
        if (urlKeywordMatch && urlKeywordMatch[1]) {
            chapterNumber = parseFloat(urlKeywordMatch[1]);
            parsedFrom = "URL with keyword";
        } else {
            const urlGenericMatch = item.url.match(urlChapterRegex);
            if (urlGenericMatch && urlGenericMatch[1]) {
                const potentialChapter = parseFloat(urlGenericMatch[1]);
                const batoSeriesIdPattern = /(?:bato\.to\/series|mto\.to\/title)\/(\d+)/i;
                const historyItemBatoMatch = item.url.match(batoSeriesIdPattern);

                if (historyItemBatoMatch && historyItemBatoMatch[1] === urlGenericMatch[1]) {
                    console.log(`[${debugPrefix} DEBUG] Ignored generic URL match ${potentialChapter} for Bato.to URL ${item.url} as it matches a series ID pattern in the history item URL.`);
                } else if (!seriesUrl.endsWith(urlGenericMatch[1]) && !seriesUrl.endsWith(urlGenericMatch[1] + '/')) {
                    chapterNumber = potentialChapter;
                    parsedFrom = "URL generic";
                }
            }
        }
    }

    if (chapterNumber > 0) {
      console.log(`[${debugPrefix} DEBUG] Parsed chapter ${chapterNumber} from history item (${parsedFrom}): URL='${item.url}', Title='${item.title ? item.title.substring(0,50) : 'N/A'}'`);
    }

    if (!isNaN(chapterNumber) && chapterNumber > latestReadChapter) {
      latestReadChapter = chapterNumber;
    }
  }
  return latestReadChapter;
}

// Function to get chapter from standard browser history
async function getChapterFromHistory(seriesUrl, seriesTitle) {
  console.log(`[HISTORY DEBUG] getChapterFromHistory called for URL: ${seriesUrl}, Title: ${seriesTitle}`);

  if (typeof browser === "undefined" || typeof browser.history === "undefined") {
    console.warn("[HISTORY DEBUG] browser.history API is undefined. Cannot search history. Returning 0.");
    return 0;
  }

  if (!seriesUrl) {
    console.log("[HISTORY DEBUG] Exiting getChapterFromHistory: seriesUrl is null or empty.");
    return 0;
  }

  let latestReadChapterInHistory = 0;
  try {
    // Step 1: Get history items from browser.history API
    const seriesHostname = new URL(seriesUrl).hostname;
    let historyItems = [];

    if (seriesHostname.includes("bato.to") || seriesHostname.includes("mto.to")) {
      console.log(`[HISTORY DEBUG] Bato.to/Mto.to series. Searching history with hostname: '${seriesHostname}' and full series title: '${seriesTitle}'`);
      historyItems = await browser.history.search({
        text: seriesHostname, // Broader search for Bato
        maxResults: 100, // Potentially more items to sift through
        startTime: 0 
      });
      // Further filter in memory because 'text' search on hostname alone can be too broad.
      // We need items that are likely related to *any* series on that host,
      // and then _parseChapterFromHistoryItems will use the specific seriesTitle.
      // This is a bit of a heuristic. The title check in _parseChapterFromHistoryItems becomes crucial.
      historyItems = historyItems.filter(hItem => hItem.title && hItem.title.toLowerCase().includes(seriesTitle.toLowerCase().substring(0, Math.min(seriesTitle.length, 20)))); // Match first 20 chars of title
       console.log(`[HISTORY DEBUG] Found ${historyItems.length} history items potentially related to '${seriesTitle}' on host '${seriesHostname}' after initial filter.`);
        } else {
      const searchText = seriesUrl; 
      console.log(`[HISTORY DEBUG] Searching browser history with searchText: '${searchText}' (using seriesUrl)`);
      historyItems = await browser.history.search({
          text: searchText, 
          maxResults: 50, 
          startTime: 0 
      });
    }
    console.log(`[HISTORY DEBUG] Found ${historyItems.length} history items from browser search for processing.`);

    // Step 2: Process these items using the shared parser
    // Pass seriesTitle to _parseChapterFromHistoryItems for Bato/Mto matching refinement.
    latestReadChapterInHistory = _parseChapterFromHistoryItems(historyItems, seriesUrl, "HISTORY", seriesTitle);

  } catch (error) {
    console.error(`[HISTORY DEBUG] Error accessing browser history or processing items for ${seriesUrl}: ${error.name}: ${error.message}`, error);
  }
  console.log(`[HISTORY DEBUG] Returning latestReadChapterInHistory: ${latestReadChapterInHistory} for ${seriesUrl}`);
  return latestReadChapterInHistory;
}

// New function to get chapter from custom extension history
async function getChapterFromExtensionHistory(seriesUrl, seriesTitle) {
  console.log(`[CUSTOM HISTORY DEBUG] getChapterFromExtensionHistory called for URL: ${seriesUrl}, Title: ${seriesTitle}`);
  if (!seriesUrl) {
    console.log("[CUSTOM HISTORY DEBUG] Exiting getChapterFromExtensionHistory: seriesUrl is null or empty.");
    return 0;
  }

  let latestReadChapterInCustomHistory = 0;
  try {
    const data = await browser.storage.local.get("manhwaExtensionHistory");
    const fullCustomHistory = data.manhwaExtensionHistory || [];

    if (fullCustomHistory.length === 0) {
      console.log("[CUSTOM HISTORY DEBUG] manhwaExtensionHistory is empty. No items to process.");
      return 0;
    }
    console.log(`[CUSTOM HISTORY DEBUG] Full manhwaExtensionHistory contains ${fullCustomHistory.length} items. Filtering for series: ${seriesUrl}...`);

    let relevantHistoryItemsForSeries = [];
    const seriesHostname = new URL(seriesUrl).hostname;

    if (seriesHostname.includes("bato.to") || seriesHostname.includes("mto.to")) {
        console.log(`[CUSTOM HISTORY DEBUG] Bato.to/Mto.to series. Filtering by hostname: ${seriesHostname} for series starting with ${seriesUrl}`);
        relevantHistoryItemsForSeries = fullCustomHistory.filter(hItem => {
            try {
                // For Bato/Mto, we check hostname and then the parsing logic inside _parseChapterFromHistoryItems
                // will attempt to link based on title or chapter ID in URL, since chapter URLs aren't nested.
                // The seriesUrl is still passed to _parseChapterFromHistoryItems for context (e.g. series ID check).
                return hItem.url && new URL(hItem.url).hostname === seriesHostname;
            } catch (e) {
                console.warn(`[CUSTOM HISTORY DEBUG] Error during Bato/Mto URL check in filter (hItem.url: ${hItem.url}):`, e.message);
                return false;
            }
        });
    } else {
        console.log(`[CUSTOM HISTORY DEBUG] Standard site. Filtering by seriesUrl prefix: ${seriesUrl}`);
        relevantHistoryItemsForSeries = fullCustomHistory.filter(hItem => {
            try {
                return hItem.url && hItem.url.startsWith(seriesUrl);
    } catch (e) {
                console.warn(`[CUSTOM HISTORY DEBUG] Error during standard URL check in filter (seriesUrl: ${seriesUrl}, hItem.url: ${hItem.url}):`, e.message);
                return false;
            }
        });
    }
    
    console.log(`[CUSTOM HISTORY DEBUG] Found ${relevantHistoryItemsForSeries.length} history items for ${seriesUrl} after site-specific filtering.`);

    latestReadChapterInCustomHistory = _parseChapterFromHistoryItems(relevantHistoryItemsForSeries, seriesUrl, "CUSTOM HISTORY");
    
  } catch (error) {
    console.error("[CUSTOM HISTORY DEBUG] Error accessing or processing manhwaExtensionHistory:", error);
  }
  console.log(`[CUSTOM HISTORY DEBUG] Returning latestReadChapterInCustomHistory: ${latestReadChapterInCustomHistory} for ${seriesUrl}`);
  return latestReadChapterInCustomHistory;
}

async function checkAllManhwa(options = {}) {
  console.log("[BACKGROUND] checkAllManhwa triggered");
  const { foldersToCheck } = options;
  const startTime = performance.now();
  let overallCheckStatus = "Processing...";
  let newUpdatesFoundOverall = 0;
  let newChapterDetails = []; 
  let newChaptersByFolder = {};
  let noNewChaptersByFolder = {};
  let updatedManhwaInfoForStorage = false; // Initialize here
  
  // Determine global history source based on environment
  let globalHistorySource;
  let deviceEnvironmentString;
  if (IS_PC_ENVIRONMENT) {
    globalHistorySource = "Standard Browser History";
    deviceEnvironmentString = "PC (using Standard History)";
  } else {
    globalHistorySource = "Custom Extension History (Mobile/Fallback)";
    deviceEnvironmentString = "Mobile/Fallback (using Custom History)";
  }
  console.log(`[BACKGROUND] Device Environment: ${deviceEnvironmentString}`);

  try {
    if (browser && browser.runtime) {
        browser.runtime.sendMessage({ command: "updateCheckStatus", status: "Starting checks...", source: "background" });
    }
    let manhwaList = await getManhwaList();

    // Filter manhwaList if foldersToCheck is provided
    if (foldersToCheck && foldersToCheck.length > 0) {
      console.log(`[BACKGROUND] Checking only for specific folders: ${foldersToCheck.join(', ')}`)
      manhwaList = manhwaList.filter(item => {
        const itemFolderName = item.bookmarkFolderName || "_NoFolder_";
        return foldersToCheck.includes(itemFolderName);
      });
      if (manhwaList.length === 0) {
        overallCheckStatus = `No tracked manhwa found in the selected folder(s): ${foldersToCheck.join(', ')}`;
      } else {
        overallCheckStatus = `Checking manhwa in selected folder(s): ${foldersToCheck.join(', ')}`;
      }
    } else {
      console.log("[BACKGROUND] Checking for all tracked manhwa.");
    }

    if (!manhwaList || manhwaList.length === 0) {
      // Adjust message if it was due to filtering
      if (foldersToCheck && foldersToCheck.length > 0 && overallCheckStatus.startsWith("No tracked manhwa found")) {
        // Message already set
      } else {
        overallCheckStatus = "No manhwa series being tracked (or none in selected folders).";
      }
      
      if (browser && browser.runtime) {
        browser.runtime.sendMessage({ command: "updateCheckStatus", status: overallCheckStatus, source: "background" });
      }
      await browser.storage.local.set({ 
          newChapterUpdates: [], 
          lastCheckStats: { 
              duration: (performance.now() - startTime) / 1000, 
              checkedAt: new Date().toISOString(), 
              updatesFound: 0,
              status: overallCheckStatus, // Save the more specific status
              foldersChecked: foldersToCheck // Optionally store which folders were checked
          },
          groupedCheckResults: { 
              newChaptersByFolder: {},
              noNewChaptersByFolder: {}
          }
      });
      if (browser && browser.runtime) {
        browser.runtime.sendMessage({ 
          command: "fullCheckCompleted", 
          status: overallCheckStatus, 
          duration: (performance.now() - startTime) / 1000,
          newUpdatesCount: 0,
          groupedResults: { 
              newChaptersByFolder: {},
              noNewChaptersByFolder: {}
          },
          foldersChecked: foldersToCheck // Send this info too
        });
      }
      return;
    }

    let checkedCount = 0;
    const totalCount = manhwaList.length;

    for (const item of manhwaList) {
      checkedCount++;
      const progressMessage = `Checking ${item.title} (${checkedCount}/${totalCount})...`;
      console.log(`[BACKGROUND] ${progressMessage}`);
      if (browser && browser.runtime) {
        browser.runtime.sendMessage({ command: "updateCheckStatus", status: progressMessage, source: "background" });
      }

    let latestChapterOnSite = null;
      let htmlContent = null;
      let effectiveLastReadChapter = item.lastReadChapter || 0;
      let chapterFromHistory = 0; 
      let historySourceAttempted = globalHistorySource; // Use the globally determined source

      try {
        if (IS_PC_ENVIRONMENT) {
          // Always use Standard Browser History on PC
          console.log(`[BACKGROUND] Using ${historySourceAttempted} for ${item.title}`);
          chapterFromHistory = await getChapterFromHistory(item.url, item.title);
        } else {
          // Always use Custom Extension History on Mobile/Fallback
          console.log(`[BACKGROUND] Using ${historySourceAttempted} for ${item.title}`);
          chapterFromHistory = await getChapterFromExtensionHistory(item.url, item.title);
        }

        if (chapterFromHistory > 0) {
            console.log(`[BACKGROUND] Chapter ${chapterFromHistory} found via ${historySourceAttempted} for ${item.title}.`);
        } else {
            console.log(`[BACKGROUND] No chapter found via ${historySourceAttempted} for ${item.title}.`);
        }
        
        if (chapterFromHistory > effectiveLastReadChapter) {
          console.log(`[BACKGROUND] Updating last read for ${item.title} from history (${historySourceAttempted}): ${chapterFromHistory} (was ${effectiveLastReadChapter})`);
          effectiveLastReadChapter = chapterFromHistory;
          item.lastReadChapter = effectiveLastReadChapter; // Update the item in the manhwaList directly
          updatedManhwaInfoForStorage = true; // Set to true if any item's lastReadChapter is updated
        }
    } catch (e) {
        console.warn(`[BACKGROUND] Error during history fetching for ${item.title} (attempted: ${historySourceAttempted}): ${e.message}.`);
        historySourceAttempted += " (Error)"; 
      }

      let directParseResult = null;
      latestChapterOnSite = null; // Initialize latestChapterOnSite

      if (item.url.includes("mangaforfree.com")) {
        console.log(`[BACKGROUND] mangaforfree.com detected. Attempting AJAX parse for ${item.url}.`);
        directParseResult = await fetchChaptersViaMangaForFreeAjax(item);
        latestChapterOnSite = directParseResult;
        if (latestChapterOnSite !== null) {
          console.log(`[BACKGROUND] mangaforfree.com AJAX parse success for ${item.url}, Chapter: ${latestChapterOnSite}`);
        } else {
          console.log(`[BACKGROUND] mangaforfree.com AJAX parse failed for ${item.url}. Will fall back to tab parsing.`);
        }
      } else {
        // For OmegaScans and all other sites, attempt direct fetch/parse first.
        // OmegaScans has its API logic within parseLatestChapterFromSite.
        if (!item.url.includes("omegascans.org")) { 
            htmlContent = await fetchHtml(item.url);
        } 
        
        directParseResult = await parseLatestChapterFromSite(htmlContent, item);
        latestChapterOnSite = directParseResult;
      }
      
      // Fallback to tab-based parsing if direct parse (including AJAX attempt for mangaforfree) resulted in null/0
      if (latestChapterOnSite === null || latestChapterOnSite === 0) { 
        console.log(`[BACKGROUND] Direct/AJAX parse result for ${item.title} was ${latestChapterOnSite}. Attempting tab-based parsing.`);
        const tabParseResult = await parseChapterInNewTab(item);
        if (tabParseResult !== null) {
          console.log(`[BACKGROUND] Tab-based parsing for ${item.title} found: ${tabParseResult}. Direct parse was: ${directParseResult}.`);
          if (directParseResult === null || tabParseResult > directParseResult) {
            latestChapterOnSite = tabParseResult;
            console.log(`[BACKGROUND] Using tab result (${latestChapterOnSite}) for ${item.title}.`);
          } else {
            console.log(`[BACKGROUND] Tab result (${tabParseResult}) not better than or equal to direct (${directParseResult}). Sticking with direct for ${item.title}.`);
          }
    } else {
          console.log(`[BACKGROUND] Tab-based parsing did not yield a chapter for ${item.title}. Sticking with direct parse result: ${directParseResult}`);
        }
      }

      const folderName = item.bookmarkFolderName || "_NoFolder_";
      const processedManhwaInfo = {
        id: item.id,
        title: item.title,
        url: item.url,
        latestChapterOnSite: latestChapterOnSite, 
        lastReadChapter: effectiveLastReadChapter,
        bookmarkFolderName: item.bookmarkFolderName, 
        historySourceUsed: historySourceAttempted // Add the history source information
      };

      if (latestChapterOnSite !== null && latestChapterOnSite > effectiveLastReadChapter) {
        console.log(`[BACKGROUND] New chapter found for ${item.title}: ${latestChapterOnSite} (last read: ${effectiveLastReadChapter})`);
        // Add to flat list for existing features (badge, simple notifications)
        newChapterDetails.push({
          id: item.id,
          title: item.title,
          url: item.url,
          latestChapterOnSite: latestChapterOnSite,
          lastReadChapter: effectiveLastReadChapter, 
          timestamp: new Date().toISOString(),
          bookmarkFolderId: item.bookmarkFolderId,
          bookmarkFolderName: item.bookmarkFolderName
        });

        // Add to new grouped structure
        if (!newChaptersByFolder[folderName]) {
          newChaptersByFolder[folderName] = [];
        }
        newChaptersByFolder[folderName].push(processedManhwaInfo);
      } else {
        if (latestChapterOnSite === null) {
          console.log(`[BACKGROUND] Could not determine latest chapter for ${item.title} after all attempts.`);
        } else {
          console.log(`[BACKGROUND] No new chapter for ${item.title}. Latest on site: ${latestChapterOnSite}, last read: ${effectiveLastReadChapter}`);
        }
        // Add to new grouped structure for items with no new chapters
        if (!noNewChaptersByFolder[folderName]) {
          noNewChaptersByFolder[folderName] = [];
        }
        noNewChaptersByFolder[folderName].push(processedManhwaInfo);
      }
    }

    // Persist manhwaList if any lastReadChapter was updated from history
    if (updatedManhwaInfoForStorage) {
      await saveManhwaList(manhwaList); // manhwaList now contains updated lastReadChapter values
      console.log("[BACKGROUND] Updated manhwaList with latest lastReadChapter values saved to storage.");
    }

    newUpdatesFoundOverall = newChapterDetails.length; // Update count based on the flat list

    if (newUpdatesFoundOverall > 0) {
      if (browser && browser.browserAction) {
        browser.browserAction.setBadgeText({ text: newUpdatesFoundOverall.toString() });
        browser.browserAction.setBadgeBackgroundColor({ color: '#28a745' }); // Green for success
      } else {
        console.warn("[BACKGROUND] browser.browserAction API not available to set badge for updates.");
      }
      overallCheckStatus = `Check complete. ${newUpdatesFoundOverall} new chapter(s) found.`;
    } else {
      if (browser && browser.browserAction) {
        browser.browserAction.setBadgeText({ text: '' }); // Clear badge if no updates
      } else {
        console.warn("[BACKGROUND] browser.browserAction API not available to clear badge.");
      }
      overallCheckStatus = "Check complete. No new chapters found.";
    }
    console.log(`[BACKGROUND] ${overallCheckStatus}`);

  } catch (error) {
    console.error("[BACKGROUND] Error in checkAllManhwa:", error);
    overallCheckStatus = "Error during check. See browser console.";
    if (browser && browser.browserAction) {
      browser.browserAction.setBadgeText({ text: 'ERR' });
      browser.browserAction.setBadgeBackgroundColor({ color: '#dc3545' }); // Red for error
    } else {
      console.warn("[BACKGROUND] browser.browserAction API not available to set badge for error.");
    }
  } finally {
    const endTime = performance.now();
    const durationSeconds = (endTime - startTime) / 1000;
    console.log(`[BACKGROUND] checkAllManhwa finished in ${durationSeconds.toFixed(2)} seconds.`);
    
    const finalStatusMessage = overallCheckStatus; // Use the status determined earlier

    // Clear the custom extension history after the check is complete
    try {
      await browser.storage.local.remove("manhwaExtensionHistory");
      console.log("[BACKGROUND] Cleared manhwaExtensionHistory.");
    } catch (e) {
      console.error("[BACKGROUND] Error clearing manhwaExtensionHistory:", e);
    }

    await browser.storage.local.set({ 
        lastCheckStats: { 
            duration: durationSeconds, 
            checkedAt: new Date().toISOString(),
            updatesFound: newUpdatesFoundOverall,
            status: finalStatusMessage,
            foldersChecked: foldersToCheck, // Store which folders were checked
            // Add global device/history info to lastCheckStats
            deviceEnvironment: deviceEnvironmentString,
            historySourceUsedGlobal: globalHistorySource 
        },
        newChapterUpdates: newChapterDetails, 
        groupedCheckResults: { 
            newChaptersByFolder: newChaptersByFolder,
            noNewChaptersByFolder: noNewChaptersByFolder
        }
    });

    if (browser && browser.runtime) {
        browser.runtime.sendMessage({
          command: "fullCheckCompleted",
          status: finalStatusMessage,
          duration: durationSeconds,
          newUpdatesCount: newUpdatesFoundOverall,
          groupedResults: { 
              newChaptersByFolder: newChaptersByFolder,
              noNewChaptersByFolder: noNewChaptersByFolder
          },
          foldersChecked: foldersToCheck, // Send this info too
          source: "background"
        });
    }
  }
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === "closeSelf" && request.tabId) {
    console.log(`[DEBUG background] Received closeSelf command for tabId: ${request.tabId}`);
    if (browser && browser.tabs) {
        browser.tabs.remove(request.tabId).then(() => {
          console.log(`[DEBUG background] Tab ${request.tabId} closed successfully.`);
        }).catch(err => {
          console.error(`[DEBUG background] Error closing tab ${request.tabId}:`, err.message);
        });
    } else {
        console.warn("[BACKGROUND] browser.tabs API not available to close tab.");
    }
    return false; 
  } else if (request.command === "checkManhwa") {
    console.log("[BACKGROUND] 'checkManhwa' command received.", request);
    // Pass folders from request to checkAllManhwa
    checkAllManhwa({ foldersToCheck: request.folders }); 
    sendResponse({ status: "Check process initiated by background script for specified folders." });
    return false; 
  } else if (request.command === "getBookmarkFolders") {
    console.log("[BACKGROUND] 'getBookmarkFolders' command received.");
    getManhwaList().then(manhwaList => {
      const folderNames = new Set();
      if (manhwaList && manhwaList.length > 0) {
        manhwaList.forEach(item => {
          folderNames.add(item.bookmarkFolderName || "_NoFolder_");
        });
      }
      const sortedFolders = Array.from(folderNames).sort();
      sendResponse({ folders: sortedFolders });
    }).catch(error => {
      console.error("[BACKGROUND] Error fetching manhwa list for getBookmarkFolders:", error);
      sendResponse({ folders: [], error: error.message });
    });
    return true; // Indicates that sendResponse will be called asynchronously.
  }
  // return true; // Keep this commented unless other async handlers are added.
}); 

// Listen for tab updates to build a custom history
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url && (tab.url.startsWith('http://') || tab.url.startsWith('https://'))) {
    try {
      // No longer check against manhwaList before logging. Log all completed http/https navigations.
      let data = await browser.storage.local.get("manhwaExtensionHistory");
      let history = data.manhwaExtensionHistory || [];

      // Optional: Prevent logging exact same URL consecutively if desired
      if (history.length > 0 && history[history.length - 1].url === tab.url) {
        // console.log(`[CUSTOM HISTORY] URL ${tab.url} is same as last logged. Skipping.`);
        return;
      }

      history.push({ url: tab.url, title: tab.title, timestamp: Date.now() });
      
      // Limit history size to prevent excessive storage use
      if (history.length > 200) { // Keep the last 200 relevant history items
        history = history.slice(history.length - 200);
      }

      await browser.storage.local.set({ manhwaExtensionHistory: history });
      // Consider making this log less verbose or conditional as it will log for every page.
      // console.log(`[CUSTOM HISTORY] Logged visit to ${tab.url}. History size: ${history.length}`);
      
    } catch (error) {
      console.error("[CUSTOM HISTORY] Error in tabs.onUpdated listener:", error);
    }
  }
});

// Listen for clicks on the browser action icon
browser.browserAction.onClicked.addListener((tab) => {
  browser.tabs.create({
    url: browser.runtime.getURL("popup.html")
  });
}); 