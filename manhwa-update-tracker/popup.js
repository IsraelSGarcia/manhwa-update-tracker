document.addEventListener('DOMContentLoaded', () => {
  const checkManhwaButton = document.getElementById('checkManhwaButton');
  const statusMessage = document.getElementById('status'); // Was statusMessage, changed to 'status' to match HTML
  const openOptionsPageLink = document.getElementById('openOptionsPage');
  const viewNewChaptersButton = document.getElementById('viewNewChaptersButton'); // New button
  const lastCheckInfo = document.getElementById('lastCheckInfo'); // New element for duration
  const popupLastCheckedSpan = document.getElementById('popupLastChecked');
  const popupNewChaptersSpan = document.getElementById('popupNewChapters');
  const popupCurrentStatusP = document.getElementById('popupCurrentStatus');
  const popupCheckSpecificFoldersButton = document.getElementById('popupCheckSpecificFoldersButton');
  const popupFolderSelectionContainer = document.getElementById('popupFolderSelectionContainer');
  const popupStartFolderCheckButton = document.getElementById('popupStartFolderCheckButton');
  const popupCheckAllButton = document.getElementById('popupCheckAllButton');
  const openUpdatesPageButton = document.getElementById('openUpdatesPageButton');
  const openOptionsButton = document.getElementById('openOptionsButton');
  const overallStatusDiv = document.getElementById('overallStatus');
  const viewCustomHistoryButton = document.getElementById('viewCustomHistoryButton'); // New button

  let isCurrentlyChecking = false;
  let isPcEnvironment = true; // Assume PC by default, will be updated

  // Initial status
  if (statusMessage) statusMessage.textContent = 'Ready. Click button to check.';

  // Function to update status and last check info
  function updateDisplay(message, duration = null, updatesCount = null) {
    if (statusMessage) {
      statusMessage.textContent = message;
    }
    if (lastCheckInfo) {
      let infoText = "";
      if (duration !== null) {
        infoText += `Last check took ${duration.toFixed(2)}s. `;
      }
      if (updatesCount !== null) {
        if (updatesCount > 0) {
          infoText += `${updatesCount} update(s) found.`;
        } else {
          infoText += `No new updates.`;
        }
      }
      lastCheckInfo.textContent = infoText.trim();
    }
  }

  // Function to request last check stats and update UI
  function loadLastCheckStats() {
    browser.storage.local.get('lastCheckStats').then(data => {
      if (data.lastCheckStats) {
        const stats = data.lastCheckStats;
        console.log("[popup.js loadLastCheckStats] Received stats:", stats); // DEBUG
        let statusText = `${stats.status || 'Status not available.'} (Last checked: ${stats.checkedAt ? new Date(stats.checkedAt).toLocaleTimeString() : 'N/A'})`;
        if (overallStatusDiv) overallStatusDiv.textContent = statusText;
        
        // Determine environment from last check stats for button visibility
        isPcEnvironment = true; // Reset to default PC
        if (stats.deviceEnvironment && stats.deviceEnvironment.toLowerCase().includes('mobile')) {
          isPcEnvironment = false;
        }
        console.log("[popup.js loadLastCheckStats] deviceEnvironment:", stats.deviceEnvironment, "isPcEnvironment:", isPcEnvironment); // DEBUG

        if (viewCustomHistoryButton) {
            if (!isPcEnvironment) {
                viewCustomHistoryButton.style.display = 'block';
                console.log("[popup.js loadLastCheckStats] Showing viewCustomHistoryButton"); // DEBUG
            } else {
                viewCustomHistoryButton.style.display = 'none';
                console.log("[popup.js loadLastCheckStats] Hiding viewCustomHistoryButton"); // DEBUG
            }
        }

        updateDisplay(stats.status, stats.duration, stats.updatesFound);
        if (stats.checkedAt) {
          const lastCheckedDate = new Date(stats.checkedAt);
          if (lastCheckInfo && stats.duration === null && stats.updatesFound === null) { // Only if not already set by updateDisplay
            lastCheckInfo.textContent = `Last checked: ${lastCheckedDate.toLocaleString()}`;
          } else if (lastCheckInfo && lastCheckInfo.textContent) {
            lastCheckInfo.textContent += ` (at ${lastCheckedDate.toLocaleTimeString()})`;
          } else if (lastCheckInfo) {
            lastCheckInfo.textContent = `Last checked: ${lastCheckedDate.toLocaleString()}`;
          }
        }
      } else {
        updateDisplay('Ready. Click button to check.');
      }
    }).catch(error => {
      console.error("Error loading last check stats:", error);
      updateDisplay('Error loading status.');
    }).finally(() => {
      checkAndUpdateViewChaptersButtonVisibility(); // Also update button based on stored updates
    });
  }

  // --- Event Listeners ---
  if (checkManhwaButton) {
    checkManhwaButton.addEventListener('click', async () => {
      updateDisplay('Checking... please wait.');
      if (viewNewChaptersButton) viewNewChaptersButton.style.display = 'none'; // Hide while checking
      try {
        // No longer relying on direct response for final status here
        // Background script will send 'fullCheckCompleted'
        browser.runtime.sendMessage({ command: "checkManhwa" });
        // The UI will be updated by the message listener below.
      } catch (error) {
        updateDisplay('Error initiating check: ' + error.message);
        checkAndUpdateViewChaptersButtonVisibility();
      }
    });
  }

  if (openOptionsPageLink) {
    openOptionsPageLink.addEventListener('click', (event) => {
      event.preventDefault();
      browser.runtime.openOptionsPage();
    });
  }

  // Removed event listener for checkBookmarkFolderButtonPopup

  if (viewNewChaptersButton) {
    viewNewChaptersButton.addEventListener('click', () => {
      browser.tabs.create({ url: "updates.html" });
    });
  }

  // --- Bookmark Functions (adapted from options.js) ---
  // Removed loadBookmarkFoldersPopup and handleCheckBookmarkFolderPopup functions

  // Function to check and update visibility of 'View New Chapters' button
  async function checkAndUpdateViewChaptersButtonVisibility() {
    if (!viewNewChaptersButton) return;
    try {
      const data = await browser.storage.local.get(['newChapterUpdates', 'lastCheckStats']);
      const updates = data.newChapterUpdates || [];
      
      if (updates.length > 0) {
        viewNewChaptersButton.style.display = 'block';
        viewNewChaptersButton.textContent = `View ${updates.length} New Chapter(s)`;
      } else {
        // If no newChapterUpdates, check lastCheckStats to see if it was a successful check with 0 updates
        if (data.lastCheckStats && data.lastCheckStats.updatesFound === 0 && data.lastCheckStats.status && !data.lastCheckStats.status.toLowerCase().includes("error")) {
             viewNewChaptersButton.style.display = 'none'; // Explicitly hide if last check was successful with 0 updates
        } else if (!data.lastCheckStats) { // No stats at all, probably first run or cleared
        viewNewChaptersButton.style.display = 'none';
        }
        // Otherwise, keep its current state (might be hidden by default or from a previous failed check)
      }
    } catch (e) {
      console.error("Error updating 'View New Chapters' button:", e);
      viewNewChaptersButton.style.display = 'none'; // Hide on error
    }
  }

  // Listen for messages from the background script
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.source === "background") { // Ensure message is from background
        if (request.command === "updateCheckStatus") {
            // Display ongoing status updates from the background script
            updateDisplay(request.status);
        } else if (request.command === "fullCheckCompleted") {
            console.log("[popup.js] Received fullCheckCompleted from background", request);
            if (overallStatusDiv) {
                overallStatusDiv.textContent = `${request.status} (Finished at: ${new Date(request.checkedAt).toLocaleTimeString()})`;
            }
            isCurrentlyChecking = false;
            updateButtonStates(isCurrentlyChecking);
            // Update environment status based on completed check
            isPcEnvironment = true; // Reset to default PC
            if (request.deviceEnvironment && request.deviceEnvironment.toLowerCase().includes('mobile')) {
                isPcEnvironment = false;
            }
            console.log("[popup.js fullCheckCompleted] request.deviceEnvironment:", request.deviceEnvironment, "isPcEnvironment:", isPcEnvironment); // DEBUG
            
            if (viewCustomHistoryButton) {
                if (!isPcEnvironment) {
                    viewCustomHistoryButton.style.display = 'block';
                    console.log("[popup.js fullCheckCompleted] Showing viewCustomHistoryButton"); // DEBUG
                } else {
                    viewCustomHistoryButton.style.display = 'none';
                    console.log("[popup.js fullCheckCompleted] Hiding viewCustomHistoryButton"); // DEBUG
                }
            }
            updateDisplay(request.status, request.duration, request.newUpdatesCount);
            checkAndUpdateViewChaptersButtonVisibility(); // Re-check button visibility based on final result
        }
    }
    // return true; // If you need to send an async response from here (not currently needed)
  });

  // Function to update popup status display
  function updatePopupStatus(stats) {
    if (!stats) {
      if (popupLastCheckedSpan) popupLastCheckedSpan.textContent = 'N/A';
      if (popupNewChaptersSpan) popupNewChaptersSpan.textContent = 'N/A';
      return;
    }
    if (popupLastCheckedSpan) {
      popupLastCheckedSpan.textContent = stats.checkedAt ? new Date(stats.checkedAt).toLocaleTimeString() : 'N/A';
    }
    if (popupNewChaptersSpan) {
      popupNewChaptersSpan.textContent = stats.updatesFound !== undefined ? stats.updatesFound : 'N/A';
    }
  }

  // Load initial status from storage
  browser.storage.local.get('lastCheckStats').then(data => {
    if (data.lastCheckStats) {
      updatePopupStatus(data.lastCheckStats);
    }
  }).catch(error => {
    console.error("Error loading lastCheckStats for popup:", error);
    // Optionally set to N/A on error
    updatePopupStatus(null);
  });

  // Listen for live updates from background script
  browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === "fullCheckCompleted" && request.source === "background") {
      // Use the more complete stats from the message for consistency
      updatePopupStatus({
        checkedAt: request.checkedAt || new Date().toISOString(), // Prefer checkedAt from message if available
        updatesFound: request.newUpdatesCount
      });
      setPopupMessage(request.status || "Check complete.");
      // Reset folder selection UI if it was open
      popupFolderSelectionContainer.classList.add('hidden');
      popupStartFolderCheckButton.classList.add('hidden');
      popupCheckSpecificFoldersButton.disabled = false;
      popupCheckAllButton.disabled = false;
    } else if (request.command === "updateCheckStatus" && request.source === "background"){
      // Potentially update a more generic status indicator if added to popup later
      // For now, the popup focuses on the summary from fullCheckCompleted
      setPopupMessage(request.status);
    }
  });

  // Button actions
  if (popupCheckAllButton) {
    popupCheckAllButton.addEventListener('click', () => {
      setPopupMessage("Initiating quick check for all manhwa...");
      popupCheckAllButton.disabled = true; // Disable button during check
      popupCheckSpecificFoldersButton.disabled = true; // Also disable other check button
      browser.runtime.sendMessage({ command: "checkManhwa" }) // No folders = check all
        .then(() => {
          // window.close(); // Don't close the popup page
          // The page will remain open and status updated by background script messages
        })
        .catch(err => {
          console.error("Error sending checkManhwa (all) from popup:", err);
          setPopupMessage("Error starting quick check.", true);
          popupCheckAllButton.disabled = false; // Re-enable on error
          popupCheckSpecificFoldersButton.disabled = false;
        });
    });
  }

  if (openUpdatesPageButton) {
    openUpdatesPageButton.addEventListener('click', () => {
      browser.tabs.create({ url: browser.runtime.getURL('updates.html') });
      // window.close(); // Don't close the popup tab
    });
  }

  if (openOptionsButton) {
    openOptionsButton.addEventListener('click', () => {
      browser.runtime.openOptionsPage();
      // window.close(); // Don't close the popup tab
    });
  }

  if (viewCustomHistoryButton) {
    viewCustomHistoryButton.addEventListener('click', () => {
      browser.tabs.create({ url: browser.runtime.getURL("custom_history.html") });
      // No window.close() here as per user preference
    });
  }

  function setPopupMessage(message, isError = false) {
    if (popupCurrentStatusP) {
      popupCurrentStatusP.textContent = message;
      popupCurrentStatusP.style.color = isError ? 'red' : 'inherit';
    }
  }

  function populatePopupFolderSelection(folders, lastCheckedFolders) {
    popupFolderSelectionContainer.innerHTML = '<p>Select folders:</p>'; // Clear previous
    if (!folders || folders.length === 0) {
      popupFolderSelectionContainer.innerHTML = '<p>No bookmark folders found.</p>';
      popupStartFolderCheckButton.classList.add('hidden');
      return;
    }
    folders.sort().forEach(folderName => {
      const div = document.createElement('div');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      const safeId = `popup_folder_cb_${folderName.replace(/[^a-zA-Z0-9-_]/g, '_')}`;
      checkbox.id = safeId;
      checkbox.value = folderName;
      checkbox.checked = (!lastCheckedFolders || lastCheckedFolders.length === 0) ? true : lastCheckedFolders.includes(folderName);
      const label = document.createElement('label');
      label.htmlFor = safeId;
      label.textContent = folderName === '_NoFolder_' ? 'Uncategorized' : folderName;
      div.appendChild(checkbox);
      div.appendChild(label);
      popupFolderSelectionContainer.appendChild(div);
    });
    popupFolderSelectionContainer.classList.remove('hidden');
    popupStartFolderCheckButton.classList.remove('hidden');
    popupStartFolderCheckButton.disabled = false;
  }

  if (popupCheckSpecificFoldersButton) {
    popupCheckSpecificFoldersButton.addEventListener('click', async () => {
      setPopupMessage("Loading folders...");
      popupCheckSpecificFoldersButton.disabled = true;
      popupCheckAllButton.disabled = true; // Disable other check button too
      try {
        const [foldersResponse, storageData] = await Promise.all([
          browser.runtime.sendMessage({ command: "getBookmarkFolders" }),
          browser.storage.local.get('lastCheckStats')
        ]);
        const folders = (foldersResponse && foldersResponse.folders) ? foldersResponse.folders : [];
        const lastCheckedFolders = (storageData.lastCheckStats && storageData.lastCheckStats.foldersChecked) ? storageData.lastCheckStats.foldersChecked : [];
        populatePopupFolderSelection(folders, lastCheckedFolders);
        setPopupMessage("Select folders and start check.");
      } catch (err) {
        console.error("Error fetching folders for popup:", err);
        setPopupMessage("Error loading folders.", true);
        popupCheckSpecificFoldersButton.disabled = false; // Re-enable
        popupCheckAllButton.disabled = false;
      }
    });
  }

  if (popupStartFolderCheckButton) {
    popupStartFolderCheckButton.addEventListener('click', () => {
      const selectedFolders = [];
      popupFolderSelectionContainer.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
        selectedFolders.push(cb.value);
      });
      if (selectedFolders.length === 0) {
        alert("Please select at least one folder.");
        return;
      }
      setPopupMessage("Initiating check for selected folders...");
      popupStartFolderCheckButton.disabled = true; // Disable this button
      popupCheckSpecificFoldersButton.disabled = true; // Disable the other button too
      popupCheckAllButton.disabled = true; // And this one

      browser.runtime.sendMessage({ command: "checkManhwa", folders: selectedFolders })
        .then(() => { 
          // Page remains open. UI updates (like hiding folder selection and re-enabling buttons) 
          // are handled by the 'fullCheckCompleted' message listener.
        })
        .catch(err => {
          console.error("Error sending checkManhwa (specific folders) from popup:", err);
          setPopupMessage("Error starting check.", true);
          // Re-enable buttons on error
          popupStartFolderCheckButton.disabled = false;
          popupCheckSpecificFoldersButton.disabled = false;
          popupCheckAllButton.disabled = false;
        });
    });
  }

  function updateButtonStates(isChecking) {
    // Implement button state updates based on isChecking
  }

  // Initial load
  loadLastCheckStats();
  // checkAndUpdateViewChaptersButtonVisibility(); // Called within loadLastCheckStats

}); 