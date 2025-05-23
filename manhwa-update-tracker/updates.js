document.addEventListener('DOMContentLoaded', () => {
    const newChaptersContainer = document.getElementById('newChaptersContainer');
    const noNewChaptersContainer = document.getElementById('noNewChaptersContainer');
    const overallCheckStatusDiv = document.getElementById('overallCheckStatus');
    const lastCheckedAtDiv = document.getElementById('lastCheckedAt');
    const lastCheckDurationDiv = document.getElementById('lastCheckDuration');
    const updatesFoundCountDiv = document.getElementById('updatesFoundCount');
    const environmentInfoDiv = document.getElementById('environmentInfo');

    // Function to create HTML for a single manhwa item
    function createManhwaItemHtml(manhwa) {
        const latestChapterDisplay = manhwa.latestChapterOnSite !== null && manhwa.latestChapterOnSite !== undefined 
            ? manhwa.latestChapterOnSite 
            : 'N/A';
        return `
            <li>
                <a href="${manhwa.url}" target="_blank">${manhwa.title}</a><br>
                <small>Latest on site: ${latestChapterDisplay} | Last read: ${manhwa.lastReadChapter || 0}</small>
            </li>
        `;
    }

    // Function to create HTML for a folder group
    function createFolderGroupHtml(folderName, manhwaList, folderIdBase) {
        if (!manhwaList || manhwaList.length === 0) {
            return ''; // No items in this folder
        }
        const safeFolderName = String(folderName).replace(/[^a-zA-Z0-9-_]/g, '_');
        const detailsId = `${folderIdBase}_${safeFolderName}`;

        const itemsHtml = manhwaList.map(createManhwaItemHtml).join('');
        return `
            <details id="${detailsId}" open>
                <summary>${folderName === '_NoFolder_' ? 'Uncategorized' : folderName}</summary>
                <ul>${itemsHtml}</ul>
            </details>
        `;
    }
    
    function displayGroupedResults(groupedData) {
        if (!newChaptersContainer || !noNewChaptersContainer) {
            console.error("Required containers not found in updates.html");
            return;
        }
        newChaptersContainer.innerHTML = ''; 
        noNewChaptersContainer.innerHTML = ''; 

        let hasNewChapters = false;
        if (groupedData && groupedData.newChaptersByFolder) {
            const sortedNewFolders = Object.keys(groupedData.newChaptersByFolder).sort();
            sortedNewFolders.forEach(folderName => {
                const folderHtml = createFolderGroupHtml(folderName, groupedData.newChaptersByFolder[folderName], 'new');
                if (folderHtml) {
                    newChaptersContainer.innerHTML += folderHtml;
                    hasNewChapters = true;
                }
            });
        }
        if (!hasNewChapters) {
            newChaptersContainer.innerHTML = '<p>No manhwa with new chapters found in the last check.</p>';
        }

        let hasNoNewChapters = false;
        if (groupedData && groupedData.noNewChaptersByFolder) {
            const sortedNoNewFolders = Object.keys(groupedData.noNewChaptersByFolder).sort();
            sortedNoNewFolders.forEach(folderName => {
                const folderHtml = createFolderGroupHtml(folderName, groupedData.noNewChaptersByFolder[folderName], 'none');
                if (folderHtml) {
                    noNewChaptersContainer.innerHTML += folderHtml;
                    hasNoNewChapters = true;
                }
            });
        }
        if (!hasNoNewChapters) {
            noNewChaptersContainer.innerHTML = '<p>No manhwa without new chapters found in the last check, or all had updates.</p>'; 
        }
    }

    function updateOverallStatus(stats) {
        if (!stats) return;
        console.log("[updates.js] updateOverallStatus called with stats:", JSON.parse(JSON.stringify(stats)));

        if (overallCheckStatusDiv) overallCheckStatusDiv.textContent = stats.status || "Status not available.";
        if (lastCheckedAtDiv) lastCheckedAtDiv.textContent = stats.checkedAt ? new Date(stats.checkedAt).toLocaleString() : "N/A";
        if (lastCheckDurationDiv) lastCheckDurationDiv.textContent = stats.duration ? `${stats.duration.toFixed(2)} seconds` : "N/A";
        if (updatesFoundCountDiv) updatesFoundCountDiv.textContent = stats.updatesFound !== undefined ? stats.updatesFound : "N/A";
        
        if (environmentInfoDiv) {
            console.log("[updates.js] environmentInfoDiv found.");
            if (stats.deviceEnvironment && stats.historySourceUsedGlobal) {
                const envText = `Environment: ${stats.deviceEnvironment}. History Source: ${stats.historySourceUsedGlobal}.`;
                console.log("[updates.js] Setting environmentInfoDiv text to:", envText);
                environmentInfoDiv.textContent = envText;
                environmentInfoDiv.style.display = 'block';
            } else {
                console.log("[updates.js] deviceEnvironment or historySourceUsedGlobal missing in stats. Setting default text.");
                environmentInfoDiv.textContent = 'Environment info not available.';
                environmentInfoDiv.style.display = 'block';
            }
        } else {
            console.warn("[updates.js] environmentInfoDiv NOT found in updates.html!");
        }
    }

    browser.storage.local.get(['groupedCheckResults', 'lastCheckStats']).then(data => {
        if (data.groupedCheckResults) {
            displayGroupedResults(data.groupedCheckResults);
        }
        if (data.lastCheckStats) {
            updateOverallStatus(data.lastCheckStats);
        } else {
             newChaptersContainer.innerHTML = '<p>No check results available yet. Run a check via the extension popup.</p>';
             noNewChaptersContainer.innerHTML = ''; // Clear this too if no stats
        }
    }).catch(error => {
        console.error("Error loading data from storage:", error);
        if (overallCheckStatusDiv) overallCheckStatusDiv.textContent = "Error loading results.";
        newChaptersContainer.innerHTML = '<p>Error loading results.</p>';
        noNewChaptersContainer.innerHTML = '';
    });

    browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.command === "fullCheckCompleted" && request.source === "background") {
            if (request.groupedResults) {
                displayGroupedResults(request.groupedResults);
            }
            updateOverallStatus({
                status: request.status,
                checkedAt: request.checkedAt || new Date().toISOString(), 
                duration: request.duration,
                updatesFound: request.newUpdatesCount,
                deviceEnvironment: request.deviceEnvironment,
                historySourceUsedGlobal: request.historySourceUsedGlobal
            });

        } else if (request.command === "updateCheckStatus" && request.source === "background") {
            if (overallCheckStatusDiv) {
                overallCheckStatusDiv.textContent = request.status;
            }
        }
    });
}); 