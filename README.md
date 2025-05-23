# Manhwa Update Tracker

## 📜 Table of Contents

1.  [Overview](#overview)
2.  [The Problem Solved](#the-problem-solved)
3.  [✨ Core Features](#-core-features)
4.  [🎁 Creating a Distributable File (ZIP or XPI)](#-creating-a-distributable-file-zip-or-xpi)
5.  [🚀 Installation](#-installation)
6.  [📖 Usage Guide](#-usage-guide)
7.  [🛠️ How It Works (High-Level)](#️-how-it-works-high-level)
8.  [🎨 Styling and Theming](#-styling-and-theming)
9.  [📂 Key Files and Their Roles](#-key-files-and-their-roles)
10. [⚙️ How It Works (Detailed Architecture)](#️-how-it-works-detailed-architecture)
11. [💡 Notable Challenges & Solutions](#-notable-challenges--solutions-during-development)
12. [❤️ Contributing](#️-contributing)
13. [📜 License](#-license)

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
*   **Intelligent Last Read Chapter Management:** Uses browser history (PC) or an internal log (mobile/fallback) and updates as you read or as new chapters are found.
*   **Flexible Parsing Engine:** Combines regex, CSS selectors (with a default for WordPress/Madara themes), site-specific AJAX calls (e.g., MangaForFree), and specialized Bato.to logic.
*   **Environment-Aware History:** Chooses the best history source (browser vs. custom log) based on PC or mobile environment detection.
*   **Selective Checking:** Check all series or only those in selected browser bookmark folders.
*   **Detailed & Organized Update Display (`updates.html`):**
    *   Categorizes series with new chapters and those up-to-date.
    *   Groups series by bookmark folder (collapsible).
    *   Displays series title (linkable), latest chapter, and last read chapter.
    *   Shows overall check status, duration, and environment/history source.
*   **User-Friendly Interface (`popup.html`, `options.html`, `custom_history.html`):**
    *   Main popup (full tab) for quick checks, folder selection, and navigation.
    *   Options page for list management, site-specific configurations, and import/export.
    *   Custom history viewer for mobile debugging.
*   **Import/Export Functionality:** Save and load your tracked series list (including all details) as a JSON file.
*   **Mobile Optimization:** Responsive design for all extension pages.
*   **Consistent Theming:** A "Frutiger Aero" inspired theme across all UI.

## 🎁 Creating a Distributable File (ZIP or XPI)

If you need to package the extension files, for example, to share it, back it up, or prepare for certain installation methods, you can create a ZIP or an XPI file.

### 1. Creating a ZIP file

A ZIP file is a standard archive format that can be used to bundle the extension files. Most browsers that support loading unpacked extensions can handle a ZIP file if you extract it first.

1.  **Gather all extension files:** Ensure you have all the necessary files and folders for the extension. This includes:
    *   `manifest.json` (this is crucial)
    *   All JavaScript files (`background.js`, `popup.js`, `options.js`, etc.)
    *   All HTML files (`popup.html`, `options.html`, etc.)
    *   All CSS files (`style.css`, etc.)
    *   Any assets like icon folders (e.g., `icons/`)
    *   Any other supporting files or directories at the root level of your extension project.
2.  **Select the files:** In your file explorer, select all these root files and folders.
3.  **Create the ZIP archive:**
    *   **Windows:** Right-click on the selected files, then choose "Send to" > "Compressed (zipped) folder".
    *   **macOS:** Right-click (or Ctrl-click) on the selected files, then choose "Compress [number] items".
    *   **Linux:** This varies by distribution and file manager, but typically you can right-click and find a "Compress" or "Create Archive" option. Alternatively, use the `zip` command in the terminal: `zip -r your-extension-name.zip ./*` (make sure you are inside the extension's root directory).
4.  **Important:** The `manifest.json` file **must be at the root level** inside the ZIP archive, not within a subfolder created by the zipping process (e.g., not like `your-extension-name/manifest.json` inside the zip, but just `manifest.json`).

### 2. Creating an XPI file (for Firefox)

An XPI (pronounced "zippy") file is the installation package format for Firefox add-ons. It's essentially a ZIP file with a different extension.

**Method A: Using `web-ext`**

`web-ext` is a command-line tool developed by Mozilla to help with building, running, and testing WebExtensions.

1.  **Install Node.js and npm:** If you don't have them, install Node.js (which includes npm) from [nodejs.org](https://nodejs.org/).
2.  **Install `web-ext`:** Open your terminal or command prompt and run:
    ```bash
    npm install --global web-ext
    ```
3.  **Navigate to your extension's directory:** In the terminal, change to the root directory of your Manhwa Update Tracker extension (the one containing `manifest.json`).
    ```bash
    cd path/to/your/manhwa-update-tracker
    ```
4.  **Build the extension:** Run the following command:
    ```bash
    web-ext build
    ```
5.  This command will package your extension into an XPI file. By default, it will be placed in a new directory called `web-ext-artifacts` inside your extension's root directory. The file will likely be named something like `manhwa_checker-0.5.0.xpi` (version number may vary).
6.  The XPI created by `web-ext build` might be unsigned or self-signed. For distribution on the Mozilla Add-ons (AMO) site, it would need to go through their submission and signing process. For local installation, an unsigned XPI will require the Firefox Developer/Nightly settings mentioned in the Installation section below.

**Method B: Manually Creating an XPI**

If you can't use `web-ext` or prefer a manual approach:

1.  **Create a ZIP file:** Follow all the steps in "1. Creating a ZIP file" above, ensuring `manifest.json` is at the root of the archive.
2.  **Rename the file:** Simply rename the generated `.zip` file to have an `.xpi` extension. For example, if you have `my-extension.zip`, rename it to `my-extension.xpi`.

    *   **Note:** An XPI file created this way is unsigned. To install it in Firefox, you will typically need to use Firefox Developer Edition or Nightly and set `xpinstall.signatures.required` to `false` in `about:config` (as detailed in the Installation section below).

## 🚀 Installation

This extension is primarily intended for development or personal use as it is not currently hosted on official add-on stores. Here's how to install it:

**Method 1: Loading Unpacked (Recommended for Development & Most Users)**

1.  **Download/Clone the Source Code:**
    *   Clone this repository to a local directory: `git clone https://github.com/your-username/manhwa-update-tracker.git` (replace with your actual repository URL if different).
    *   Alternatively, download the source code as a ZIP file from GitHub (usually via the "Code" button -> "Download ZIP") and extract it to a local directory.
2.  **Open Your Browser's Extension Page:**
    *   **Chrome / Edge / Other Chromium-based browsers:** Navigate to `chrome://extensions` or `edge://extensions`.
    *   **Firefox:** Navigate to `about:debugging#/runtime/this-firefox`.
3.  **Enable Developer Mode (if applicable):**
    *   **Chrome/Edge:** Ensure the "Developer mode" toggle (usually in the top right corner) is switched ON.
    *   **Firefox:** This step is not explicitly needed on the `about:debugging` page for loading temporary add-ons.
4.  **Load the Extension:**
    *   **Chrome/Edge:** Click the "Load unpacked" button and select the root directory where you cloned/extracted the extension files (this is the directory that contains the `manifest.json` file).
    *   **Firefox:** Click the "Load Temporary Add-on..." button and select the `manifest.json` file from the root directory of the extension. The add-on will remain installed until you close Firefox or remove it manually from this page.
5.  The Manhwa Update Tracker icon should now appear in your browser's toolbar.

**Method 2: Persistent Installation of Unsigned Extensions in Firefox Developer/Nightly (Advanced)**

Standard versions of Firefox enforce add-on signing, meaning they typically won't allow the persistent installation or use of unsigned extensions (including those loaded from local files like ZIPs/XPIs if not from AMO or signed).

However, **Firefox Developer Edition** or **Firefox Nightly** versions allow you to disable this signature check for development and testing purposes. This is useful if you want to load the extension from local files—for example, if you've **downloaded the extension as a ZIP file and unpacked it**, are working directly from a cloned development folder, or have self-packaged an XPI—and want it to persist more like a regularly installed add-on without needing it to be signed by Mozilla.

**Warning:** Disabling signature checks can lower your browser's security. Only do this if you understand the risks and are using a Firefox version intended for development (Developer Edition or Nightly).

1.  **Use Firefox Developer Edition or Nightly:** Ensure you are running one of these specific versions of Firefox.
2.  **Access `about:config`:**
    *   Type `about:config` into the Firefox address bar and press Enter.
    *   Click "Accept the Risk and Continue" if a warning page appears.
3.  **Modify Signature Setting:**
    *   In the search bar at the top of the `about:config` page, type `xpinstall.signatures.required`.
    *   Double-click on the `xpinstall.signatures.required` preference to toggle its value from `true` to `false`.
4.  **Install/Load the Extension:**
    *   **Installing a packaged extension (ZIP or XPI) using Firefox's "Install Add-on From File..." option:**
        a.  First, navigate to `about:addons` in Firefox. Click the gear icon (⚙️) next to "Manage Your Extensions", and select "Install Add-on From File...". A file selection dialog will open.
        b.  **If you have your extension packaged as a `.zip` file:** Try selecting this `.zip` file directly in the file dialog.
        c.  **If Firefox does not allow you to select the `.zip` file, or if the installation directly from the `.zip` file fails:**
            i.  You will likely need to rename your `.zip` file to have an `.xpi` extension (e.g., change `your-extension-name.zip` to `your-extension-name.xpi`).
            ii. Then, in the "Install Add-on From File..." dialog, select this newly renamed `.xpi` file.
        d.  **If you already have an `.xpi` file** (e.g., one created using `web-ext` or by previously renaming a `.zip`): You can select this `.xpi` file directly in the file dialog.
    *   Alternatively, loading the extension unpacked (as described in Method 1, **which includes starting from an extracted ZIP file**) in Firefox Developer/Nightly with this flag set to `false` should also allow it to operate without signature issues and persist more reliably across browser sessions than a standard temporary add-on might.

For more details on add-on signing in Firefox, refer to the official Mozilla documentation: [Add-on signing in Firefox | Firefox Help](https://support.mozilla.org/en-US/kb/add-on-signing-in-firefox).

**Note on Updates (for unpacked extensions):** If you modify the local code (e.g., after pulling changes or making your own edits), you generally need to reload the extension for the changes to take effect. This is typically done via a "Reload" (🔄) button next to the extension's entry on your browser's extension management page.

## 📖 Usage Guide

1.  **Add Series:**
    *   Click the extension icon in your browser toolbar to open the main popup page.
    *   Navigate to "Options".
    *   Click "Add New Manhwa".
    *   Enter the full URL of the main series page (e.g., `https://somesite.com/series/my-favorite-manhwa`).
    *   Enter a title for the series. Last Read Chapter defaults to 0 but can be set manually.
    *   If a site needs it, provide a "Custom CSS Selector" for chapter links (found by inspecting the site's HTML). Many WordPress sites use the default selector automatically.
    *   Click "Save".
2.  **Organize with Bookmarks (Optional):**
    *   For folder-based checking, ensure your tracked series' URLs are bookmarked into relevant browser bookmark folders.
3.  **Check for Updates:**
    *   From the main popup page:
        *   Click "Quick Check All" for all series.
        *   Click "Check Specific Folders...", select folders, then "Start Check for Selected Folders".
4.  **View Results:**
    *   The popup shows a summary. For details, click "View Full Update Log". This page lists series with new chapters and those up-to-date, grouped by folder.
5.  **Manage List:**
    *   Go to "Options" to edit titles, URLs, last read chapters, selectors, or delete series.
6.  **Import/Export:**
    *   Use the "Export Manhwa List" and "Import Manhwa List" buttons on the Options page to backup or transfer your settings via a JSON file.
7.  **Mobile Usage:**
    *   The workflow is similar. The extension uses its internal history logger. The "View Custom History (Mobile Only)" button (if visible on mobile) helps with debugging.

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

## ⚙️ How It Works (Detailed Architecture)

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
        *   *Solution:* Implementation of a custom, extension-exclusive history logger (`manhwaExtensionHistory`). This logger recorded all visited URLs, and the extension then parses chapter information from this dedicated log when on a mobile environment.
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
