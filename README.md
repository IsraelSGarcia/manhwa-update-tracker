# Manhwa Update Tracker

## Overview

Manhwa Update Tracker is a browser extension designed to help users keep track of the latest chapters for their favorite manhwa, manga, webtoons, and other sequential web comics. It automates the process of checking multiple websites for updates, manages your reading progress by tracking the last read chapter, and notifies you of new releases. The extension is built with a flexible parsing system to accommodate various website structures and offers a user-friendly interface for managing your tracked series and viewing updates.

## The Problem Solved

Keeping up with numerous ongoing manhwa or manga series spread across different websites can be a manual and time-consuming task. Users often have to visit each site individually, navigate to their series, and check if a new chapter has been released. Furthermore, remembering the last chapter read for each series, especially when reading many, can be challenging.

This extension aims to solve these problems by:

*   **Automating Checks:** Periodically or on-demand, it checks all tracked series for new chapters.
*   **Centralizing Information:** Provides a single interface to see update statuses for all series.
*   **Tracking Progress:** Remembers the last chapter you've read for each series, leveraging browser history or its own internal history log.
*   **Adapting to Different Sites:** Employs multiple strategies to extract chapter information from diverse website layouts and technologies.

## ✨ Core Features

*   **Comprehensive Series Tracking:** Add and manage a list of manhwa/manga series from any website.
*   **Automated New Chapter Detection:** Fetches and parses websites to find the latest available chapter.
*   **Intelligent Last Read Chapter Management:**
    *   Uses browser history (on PC) or a dedicated internal history log (primarily for mobile or as a fallback).
    *   Updates the `lastReadChapter` as new chapters are detected or history indicates further reading.
*   **Flexible Parsing Engine:**
    *   Utilizes a refined regex for general chapter number extraction.
    *   Supports CSS selector-based parsing, with a default for common WordPress (Madara) manga themes.
    *   Implements site-specific logic, including AJAX calls for dynamic content (e.g., MangaForFree).
    *   Specialized parsing strategies for sites like Bato.to/Mto.to.
    *   Fallback mechanism to open pages in a new tab for parsing if direct fetch fails.
*   **Environment-Aware History:**
    *   Detects if running in a PC or mobile-like environment.
    *   Uses standard browser history on PC for robust chapter tracking.
    *   Employs a custom, extension-exclusive history log on mobile (where browser history API might be limited/unavailable).
*   **Selective Checking:**
    *   Option to check all tracked series.
    *   Option to check only series within selected browser bookmark folders.
*   **Detailed & Organized Update Display (`updates.html`):**
    *   Shows results categorized into "New Chapters Found" and "No New Chapters / Up-to-date".
    *   Groups series by their bookmark folder.
    *   Displays series title (linkable), latest chapter found, and your last read chapter.
    *   Foldable folder sections for better organization.
    *   Shows overall check status, duration, and environment/history source used.
*   **User-Friendly Interface:**
    *   **Popup (`popup.html`):** Main interaction point, opened as a full tab. Provides quick check buttons, folder selection for checks, and navigation to other extension pages.
    *   **Options Page (`options.html`):** Manage your manhwa list (add, edit, delete), configure site-specific CSS selectors, import/export your list.
    *   **Custom History Viewer (`custom_history.html`):** Allows viewing the raw data from the internal history logger, primarily for mobile debugging.
*   **Import/Export Functionality:**
    *   Export your tracked manhwa list (including titles, URLs, last read chapters, site-specific configurations, and bookmark folder info) to a JSON file.
    *   Import a previously exported list to restore your settings or transfer to another browser.
*   **Mobile Optimization:** All UI pages (`popup.html`, `options.html`, `updates.html`) are designed to be responsive and usable on smaller screens.
*   **Consistent Theming:** Features a "Frutiger Aero" inspired theme for a distinct visual style, applied consistently across its pages.

## 🚀 Installation

1.  Download the extension files to a local directory.
2.  Open your browser's extension management page:
    *   **Chrome/Edge:** Navigate to `chrome://extensions` or `edge://extensions`.
    *   **Firefox:** Navigate to `about:addons`.
3.  Enable "Developer mode" (usually a toggle switch).
4.  Click on "Load unpacked" (Chrome/Edge) or "Load Temporary Add-on..." (Firefox) and select the directory where you saved the extension files.
5.  The Manhwa Update Tracker icon should appear in your browser's toolbar.

## 📖 Usage Guide

1.  **Add Series:**
    *   Click the extension icon to open the main popup page.
    *   Navigate to "Options".
    *   Click "Add New Manhwa" (or similar button).
    *   Enter the full URL of the main series page (e.g., `https://somesite.com/series/my-favorite-manhwa`).
    *   Enter a title for the series.
    *   The "Last Read Chapter" will default to 0. You can set it manually if you know it.
    *   If the site uses a non-standard layout, you might need to provide a "Custom CSS Selector" for chapter links (e.g., after inspecting the site's HTML). For many WordPress sites, a default selector is applied.
    *   Click "Save".
2.  **Organize with Bookmarks (Optional):**
    *   If you want to check series based on your browser's bookmark folders, ensure your tracked series' URLs are bookmarked into relevant folders. The extension will associate series with these folders.
3.  **Check for Updates:**
    *   From the main popup page:
        *   Click "Quick Check All" to check every series in your list.
        *   Click "Check Specific Folders...", select the desired bookmark folders from the displayed list, and then click "Start Check for Selected Folders".
4.  **View Results:**
    *   After a check completes, the popup will show a summary (number of new chapters).
    *   For detailed results, click "View Full Update Log" to open the Updates page. Here you'll see which series have new chapters and which don't, grouped by folder.
5.  **Manage List:**
    *   Return to the "Options" page to edit titles, URLs, last read chapters, selectors, or delete series.
6.  **Import/Export:**
    *   On the "Options" page, use the "Export Manhwa List" button to save your current setup to a JSON file.
    *   Use "Import Manhwa List" to load a list from a JSON file. This will overwrite your current list after confirmation.
7.  **Mobile Usage:**
    *   The workflow is similar. The extension will use its internal history logger. If you need to debug, the "View Custom History (Mobile Only)" button on the popup page can be used.

## 🛠️ How It Works (High-Level)

The Manhwa Update Tracker operates primarily through a `background.js` script that manages all core operations. Here's a simplified flow:

1.  **User Action:** You initiate a check from the `popup.html` interface (e.g., "Quick Check All").
2.  **Data Retrieval:** `background.js` loads your list of tracked series (`manhwaList`) from local storage.
3.  **History Check:** For each series, it determines your last read chapter by checking standard browser history (on PC) or a custom internal history log (on mobile/fallback).
4.  **Live Site Check:** It then fetches data from the live website for each series, using various parsing strategies (site-specific rules, CSS selectors, or general regex) to find the latest available chapter.
5.  **Comparison & Notification:** If the latest chapter on the site is newer than your last read chapter, it's marked as an update.
6.  **Results Display:** All findings are saved and sent to the `updates.html` page for you to view, categorized and grouped by folder.
7.  **Data Persistence:** Your `manhwaList` (with any `lastReadChapter` updates from history) and check statistics are saved to `browser.storage.local`.

The extension also includes a `content_script.js` for potential fallback parsing and several HTML/JS pairs (`options.html`/`.js`, `updates.html`/`.js`, `custom_history.html`/`.js`) for user interaction and displaying information.

## 🎨 Styling and Theming

The extension features a "Frutiger Aero" inspired visual theme for a distinct and consistent user experience.
*   Key characteristics include glassy effects, gradients, and often blue/green color palettes.
*   Shared styles are defined in `style.css` and applied across all HTML pages (`popup.html`, `options.html`, `updates.html`, `custom_history.html`).
*   CSS variables are used for theme colors and properties.
*   All pages are mobile-responsive, using viewport meta tags and media queries in `style.css` to adapt layouts for smaller screens.

## 📂 Key Files and Their Roles

*   **`manifest.json`**: The extension's blueprint: permissions, scripts, UI pages.
*   **`background.js`**: The core engine: handles update checks, website parsing, history management, and communication.
*   **`popup.html` / `popup.js`**: Main user interface (full tab) for initiating checks and navigation.
*   **`options.html` / `options.js`**: For managing the tracked series list, site configurations, and import/export.
*   **`updates.html` / `updates.js`**: Displays detailed results of the latest check.
*   **`custom_history.html` / `custom_history.js`**: Utility page to view the internal history log (for mobile debugging).
*   **`style.css`**: Shared CSS for theme, responsiveness, and general styling.
*   **`content_script.js`**: Injected into web pages, mainly for fallback parsing if direct methods fail.

## 🛠️ How It Works (Detailed Architecture)

The extension is primarily driven by a background script (`background.js`) that orchestrates checks, parsing, and data management. It interacts with several UI pages for user input and display.

### 1. Core Checking Process (`checkAllManhwa` in `background.js`)

This is the heart of the extension's update mechanism.

*   **Initiation:** Triggered by user actions from `popup.js` (e.g., "Quick Check All", "Check Selected Folders").
*   **Manhwa List Retrieval:** Loads the `manhwaList` from `browser.storage.local`.
*   **Folder Filtering:** If the check is for specific folders, it filters `manhwaList` to include only items belonging to the selected bookmark folders.
*   **Environment Detection:**
    *   A constant `IS_PC_ENVIRONMENT` is determined based on the availability of `browser.history.search`.
    *   This dictates whether `getChapterFromHistory` (PC) or `getChapterFromExtensionHistory` (Mobile/Fallback) will be used globally for the check.
*   **Iterating Through Series:** For each tracked item:
    1.  **Determine Effective Last Read Chapter:**
        *   The item's `lastReadChapter` from storage is the baseline.
        *   The appropriate history function (`getChapterFromHistory` or `getChapterFromExtensionHistory`) is called to find if a more recent chapter has been read according to history.
        *   The higher of the stored `lastReadChapter` and the chapter found in history becomes the `effectiveLastReadChapter`.
        *   If history provides a newer chapter, the item's `lastReadChapter` in the `manhwaList` (in memory) is updated, and a flag (`updatedManhwaInfoForStorage`) is set.
    2.  **Fetch Latest Chapter from Site:** Calls `parseLatestChapterFromSite(item.url, item.title, item.siteConfig)` to get the newest chapter number from the live website.
    3.  **Compare and Record:**
        *   If the fetched `latestChapterOnSite` is numerically greater than `effectiveLastReadChapter`, a new chapter is considered found.
        *   Details (title, url, new chapter, last read, folder) are added to `newChapterDetails` and categorized into `newChaptersByFolder`.
        *   Otherwise, it's added to `noNewChaptersByFolder`.
*   **Persist Updated Last Read Chapters:** If `updatedManhwaInfoForStorage` is true (meaning any `lastReadChapter` was updated from history), the entire `manhwaList` is saved back to `browser.storage.local`.
*   **Finalize and Notify:**
    *   Calculates overall statistics (duration, total new updates, etc.).
    *   Stores these `lastCheckStats` and the categorized results (`newChaptersByFolder`, `noNewChaptersByFolder`) in `browser.storage.local`.
    *   Sends a `fullCheckCompleted` message to UI pages (`popup.js`, `updates.js`) with all the results and stats.
    *   If on mobile/fallback, clears the `manhwaExtensionHistory` after its use in the check.

### 2. Chapter Parsing Strategies

The extension employs a multi-layered approach to extract the latest chapter number from a manhwa's webpage, managed mainly within `parseLatestChapterFromSite`.

*   **Site-Specific Handlers (Highest Priority):**
    *   **Omega Scans API:** If a series is from `omegascans.org`, it attempts to use a (presumed) direct API endpoint for chapter information first.
    *   **MangaForFree AJAX (`fetchChaptersViaMangaForFreeAjax`):** For `mangaforfree.com`, it performs a sequence:
        1.  Fetches the main series page to extract a `data-id` (post ID) from the HTML.
        2.  Makes a `POST` request to `/wp-admin/admin-ajax.php` with parameters `action: manga_get_chapters` and `manga: [post_id]`.
        3.  Parses the AJAX response (which contains a list of chapters) using a CSS selector (`ul.version-chap li.wp-manga-chapter a`) to find the highest chapter number.
*   **CSS Selector-Based Parsing:**
    *   If a `siteConfig.selector` is provided for the series (customizable in Options), it attempts to fetch the page and use this selector with `parseChapterFromDOM` to find chapter links and extract numbers.
    *   **Default WordPress (Madara) Selector:** For sites identified or configured as WordPress-based (Madara theme), it defaults to `li.wp-manga-chapter a`. This selector is also automatically suggested for new series from domains known to use this theme if no custom selector is provided.
*   **Bato.to / Mto.to Specific Logic:**
    *   Due to Bato.to's structure, it has a dedicated block:
        1.  **Strategy 1:** Looks for `a[href*="/chapter/"]` elements and applies regex to their text/href.
        2.  **Strategy 2 (Fallback):** If Strategy 1 fails, it searches *all* `<a>` tags on the page and applies a stricter keyword-based regex to identify chapter links.
*   **General Regex Parsing:**
    *   The primary regex is: `/(?:\bchapter|\bch\.?|\bepisode|\bep\.?|\bcapitulo|\bcap\.?|\bตอนที่|\bตอน)[\s\-\/_]*(\d+(?:\.\d+)?)/i`.
    *   This regex is applied to relevant text content extracted from elements found by CSS selectors or from the page title/URL in history items.
*   **Tab-Based Fallback (Least Preferred):**
    *   If direct fetch/parse methods fail or are not configured for a site, the extension can be configured (or might fallback) to open the manhwa URL in a new, temporary tab.
    *   The `content_script.js` running on that page would then attempt to parse chapter information from the fully rendered DOM. This is less efficient but can handle sites with heavy JavaScript rendering that direct fetches miss.

### 3. History Management

Determining the user's actual "last read chapter" is crucial for accurate new chapter notifications.

*   **PC vs. Mobile Environment Detection:**
    *   The `IS_PC_ENVIRONMENT` boolean constant in `background.js` is set based on `typeof browser.history.search === 'function'`. If the API is available, it's considered PC.
*   **Standard Browser History (PC - `getChapterFromHistory`):**
    *   Uses `browser.history.search({text: seriesUrl, maxResults: ..., startTime: 0})`.
    *   For Bato.to/Mto.to sites, if the initial `seriesUrl` search yields few results (as chapter URLs differ significantly from series URLs), it performs a broader search using just the `seriesHostname`. The `seriesTitle` is then passed to `_parseChapterFromHistoryItems` to help filter and match items from this broader set.
    *   The retrieved history items are passed to `_parseChapterFromHistoryItems`.
*   **Custom Extension History (Mobile/Fallback - `getChapterFromExtensionHistory`):**
    *   This was implemented because `browser.history.search` can be unreliable or unavailable on some mobile browsers.
    *   Reads a manually maintained list of visited URLs from `browser.storage.local.manhwaExtensionHistory`.
    *   Filters this list:
        *   For Bato.to/Mto.to: Filters by matching `seriesHostname` in the history item's URL.
        *   For other sites: Filters by checking if the history item's URL `startsWith(seriesUrl)`.
    *   The filtered items are passed to `_parseChapterFromHistoryItems`.
*   **Unified Parsing Logic (`_parseChapterFromHistoryItems`):**
    *   This private helper function is called by both `getChapterFromHistory` and `getChapterFromExtensionHistory`.
    *   It takes the list of history items, `seriesUrl`, and an optional `seriesTitle` (for Bato.to).
    *   **Sorting:** Sorts history items by timestamp in descending order (most recent first), if timestamps are available.
    *   **Chapter Extraction:** Iterates through sorted items. For each item, it attempts to parse a chapter number from:
        1.  The item's `title`.
        2.  The item's `url`.
        Using the general chapter regex.
    *   **Bato.to Series ID Exclusion:** Specifically ignores numbers extracted from history item URLs if they match a Bato.to/Mto.to series ID pattern (e.g., `title/12345` or `series/12345`) to prevent mistaking series IDs for chapter numbers.
    *   **Bato.to Title Matching:** If `seriesTitle` is provided (for Bato.to calls from `getChapterFromHistory`), it performs an additional check to ensure the history item's title is a significant match for the `seriesTitle` before considering it. This helps refine results from the broader hostname-based search.
    *   Returns the highest valid chapter number found across the relevant history items.
*   **Custom History Logging (`tabs.onUpdated` listener in `background.js`):**
    *   Listens for tab updates where `changeInfo.status === 'complete'`.
    *   Logs all visited HTTP/HTTPS URLs along with their title and a timestamp to an array `manhwaExtensionHistory` in `browser.storage.local`.
    *   This list is capped at 200 entries (older entries are removed).
    *   The entire `manhwaExtensionHistory` is cleared after each full `checkAllManhwa` cycle if it was used (i.e., on mobile).

### 4. Configuration and Data Storage

The extension uses `browser.storage.local` to persist its data:

*   **`manhwaList`**: An array of objects, where each object represents a tracked series:
    ```json
    {
      "id": "unique-id-string", // Usually a timestamp or UUID
      "title": "Series Title",
      "url": "https://example.com/series/series-name",
      "lastReadChapter": 0, // Number
      "siteConfig": { // Optional, for site-specific settings
        "selector": "li.wp-manga-chapter a", // Custom CSS selector
        "useApi": false, // Example flag
        "forceTab": false // Example flag
      },
      "bookmarkFolderName": "My Favorites", // Name of the browser bookmark folder
      "bookmarkFolderId": "bookmark-folder-id" // ID of the browser bookmark folder
    }
    ```
*   **`siteConfigs` (Conceptual / Integrated into `manhwaList`):** While initially conceived as separate, site-specific configurations like custom selectors are stored within each item's `siteConfig` object in the `manhwaList`. Default selectors (like the WordPress one) are applied programmatically.
*   **`lastCheckStats`**: An object storing information about the most recent check:
    *   `status`: e.g., "Check complete. X new chapter(s) found."
    *   `duration`: Check duration in seconds.
    *   `updatesFound`: Total count of new chapters.
    *   `checkedAt`: Timestamp of when the check finished.
    *   `foldersChecked`: Array of folder names if a folder-specific check was run.
    *   `deviceEnvironment`: String like "PC (using Standard History)" or "Mobile/Fallback (using Custom History)".
    *   `historySourceUsedGlobal`: String indicating which history type was used.
*   **`newChaptersByFolder` & `noNewChaptersByFolder`**: Objects where keys are folder names (or `_NoFolder_`) and values are arrays of series details. Used to populate `updates.html`.
*   **`manhwaExtensionHistory`**: Array of `{url: string, title: string, timestamp: number}` objects for the custom history log.

### 5. User Interface (UI)

The extension provides several HTML pages for interaction:

*   **Popup (`popup.html` & `popup.js`):**
    *   Serves as the main entry point, opened as a full browser tab (not a standard small popup).
    *   Displays last check status (time, number of new chapters).
    *   **Buttons:**
        *   "Quick Check All": Initiates a check for all tracked series.
        *   "Check Specific Folders...": Fetches bookmark folders, allows user to select folders, then initiates a check for series in those folders. Checkboxes default to the selection from the previous folder-specific check.
        *   "View Full Update Log": Opens `updates.html`.
        *   "Options": Opens `options.html`.
        *   "View Custom History (Mobile Only)": Opens `custom_history.html`. This button is only visible if the extension detects it's running in a mobile/fallback environment.
    *   Buttons are disabled during a check and re-enabled on completion or error.
    *   Styled with the Frutiger Aero theme from `style.css` and includes mobile-responsive adjustments.
*   **Updates Page (`updates.html` & `updates.js`):**
    *   Displays detailed results of the last completed check.
    *   Information is fetched from `lastCheckStats`, `newChaptersByFolder`, and `noNewChaptersByFolder` in `browser.storage.local`.
    *   **Layout:**
        *   Overall status section: Last check duration, total updates found, and a dedicated line for "Environment: [PC/Mobile], History Source: [Standard/Custom]".
        *   Two main sections: "New Chapters Found" and "No New Chapters / Up-to-date".
        *   Within these sections, manhwa are grouped by their browser bookmark folder.
        *   Each manhwa item displays its title (as a link), the latest chapter found on the site, and the user's last read chapter.
        *   Bookmark folder groups are implemented using `<details>` and `<summary>` tags, making them collapsible.
    *   Listens for `fullCheckCompleted` messages from `background.js` to potentially refresh its display if it's already open (though typically users navigate here after a check).
*   **Options Page (`options.html` & `options.js`):**
    *   Allows users to manage their tracked manhwa list.
    *   **Features:**
        *   Add new manhwa (URL, Title).
        *   Edit existing manhwa (URL, Title, Last Read Chapter, Custom CSS Selector).
        *   Delete manhwa from the list.
        *   Display of all tracked manhwa.
        *   **Import/Export:**
            *   Export the current `manhwaList` to a JSON file. The export includes all fields: `id`, `title`, `url`, `lastReadChapter`, `siteConfig` (with defaults if not set), `bookmarkFolderName`, `bookmarkFolderId`.
            *   Import from a JSON file, with validation to ensure data integrity.
        *   **Site Configuration:** Users can specify a custom CSS selector for individual series if the default parsing methods fail.
        *   A `defaultWordPressSelector` (`li.wp-manga-chapter a`) is automatically applied to the `siteConfig` of new series from domains like `webtoonscan.com` if no specific selector is provided by the user.
*   **Custom History Page (`custom_history.html` & `custom_history.js`):**
    *   A simple page that fetches and displays the raw contents of `manhwaExtensionHistory` from `browser.storage.local`.
    *   Each entry shows the URL (linkable), Title, and Timestamp.
    *   Primarily for debugging purposes on mobile devices where direct console access is difficult.

### 6. Background Script (`background.js`)

This is the core of the extension, running persistently.

*   **Event Listeners:**
    *   `browser.runtime.onMessage`: Handles commands from UI scripts:
        *   `checkManhwa` (with optional `folders`): Initiates `checkAllManhwa`.
        *   `getBookmarkFolders`: Retrieves browser bookmark folders and sends them back to the caller (e.g., `popup.js`).
    *   `browser.browserAction.onClicked`: When the extension's toolbar icon is clicked, it opens `popup.html` in a new tab (since `default_popup` was removed from `manifest.json`).
    *   `browser.tabs.onUpdated`: Logs visited pages to `manhwaExtensionHistory` if the navigation is complete (`status === 'complete'`) and the URL is HTTP/HTTPS.
*   **Core Functions:**
    *   `checkAllManhwa()`: Orchestrates the entire update checking process.
    *   `parseLatestChapterFromSite()`: Manages different parsing strategies.
    *   `fetchChaptersViaMangaForFreeAjax()`: Specific AJAX handler.
    *   `getChapterFromHistory()`: Interacts with `browser.history`.
    *   `getChapterFromExtensionHistory()`: Interacts with `manhwaExtensionHistory`.
    *   `_parseChapterFromHistoryItems()`: Shared logic for parsing chapter numbers from history items.
    *   Functions for saving/loading `manhwaList` and other data from `browser.storage.local`.

### 7. Content Script (`content_script.js`)

*   **Matching:** Injected into `<all_urls>` at `document_idle`.
*   **Role:** Its role evolved. Initially, it was more central for on-page regex parsing. After refinements, its primary use is likely as part of the tab-based parsing fallback, where it can access the fully rendered DOM of a page opened by `background.js`. It may still apply the general regex (`/(?:\bchapter|\bch\.?|\bepisode|\bep\.?|\bcapitulo|\bcap\.?|\bตอนที่|\bตอน)[\s\-\/_]*(\d+(?:\.\d+)?)/i`) to the page content if invoked.

### 8. Manifest File (`manifest.json`)

Defines the extension's properties and permissions.

*   `manifest_version`: 2
*   `name`: "Manhwa Checker"
*   `version`: (e.g., "0.5.0")
*   `description`: Describes the extension's purpose.
*   `icons`: Path to extension icons.
*   `permissions`:
    *   `storage`: For `browser.storage.local`.
    *   `notifications`: (Though not explicitly detailed in recent summary, this permission is present, suggesting potential for browser notifications).
    *   `<all_urls>`: For fetching data from any site and for the content script.
    *   `bookmarks`: To read bookmark folders for filtering.
    *   `history`: For `browser.history.search`.
    *   `tabs`: To open new tabs (for `popup.html`, `options.html`, fallback parsing, viewing updates).
*   `browser_action`: Defines `default_icon`. `default_popup` is intentionally omitted as `popup.html` is opened programmatically as a full tab.
*   `background`: Specifies `scripts: ["background.js"]`.
*   `content_scripts`: Defines `content_script.js` to run on all URLs.
*   `options_ui`: Specifies `page: "options.html"` and `open_in_tab: true`.
*   `browser_specific_settings`:
    *   `gecko`: Contains an `id` (e.g., "arandomemail@gmail.com") and `strict_min_version` for Firefox. The user has requested this block be kept as is.

## 💡 Notable Challenges & Solutions During Development

The development of this extension involved tackling several common challenges in web scraping and browser extension creation:

*   **Diverse Website Structures:** No two manhwa sites are built the same. This necessitated a flexible parsing system with multiple strategies (regex, CSS selectors, site-specific logic) rather than a one-size-fits-all approach.
*   **Dynamic Content:** Many modern websites load content (like chapter lists) dynamically using JavaScript.
    *   *Solution for MangaForFree:* Reverse-engineering its AJAX call for chapters proved more reliable than trying to parse a dynamically loaded page directly or relying on a tab-based approach.
*   **Browser History Limitations & Discrepancies:**
    *   **Bato.to Chapter URLs:** Bato.to's chapter URLs (e.g., `/chapter/CHAPTER_ID`) don't contain the series path (e.g., `/series/SERIES_ID`). This made standard history searches based on `seriesUrl` ineffective for finding read *chapters*.
        *   *Solution:* For Bato.to, history searches were broadened to the hostname, and `seriesTitle` was used to help `_parseChapterFromHistoryItems` filter and accurately identify relevant chapter visits from the larger set of history items.
    *   **Mobile History API:** The `browser.history` API (especially `search()`) can be inconsistent or unavailable on mobile browsers.
        *   *Solution:* Implementation of a custom, extension-exclusive history logger (`manhwaExtensionHistory`). This logger records all visited URLs, and the extension then parses chapter information from this dedicated log when on a mobile environment.
*   **Accurate "Last Read" Detection:** Distinguishing between a series ID in a URL (e.g., on Bato.to) and an actual chapter number required specific exclusion logic in the history parsing functions.
*   **UI Consistency and Usability:**
    *   Transitioning the popup to a full tab improved usability for folder selection and displaying status.
    *   Ensuring all pages shared a consistent theme and were mobile-responsive.

## ❤️ Contributing

Contributions are welcome! If you have ideas for improvements, new features, or have found a bug, please feel free to:

1.  **Open an Issue:** Describe the bug or feature request in detail. Provide steps to reproduce for bugs.
2.  **Fork the Repository:** If you'd like to contribute code.
3.  **Create a Pull Request:** Ensure your code adheres to the existing style and clearly describes the changes you've made.

We appreciate any contributions that help make this extension better for everyone!

## 📜 License

This project is licensed under the **GNU General Public License v3.0 (GPLv3)**.

For the full license text, please see: [https://www.gnu.org/licenses/gpl-3.0.html](https://www.gnu.org/licenses/gpl-3.0.html)
