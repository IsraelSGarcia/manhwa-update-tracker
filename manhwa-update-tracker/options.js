document.addEventListener('DOMContentLoaded', () => {
    const manhwaForm = document.getElementById('manhwaForm');
    const manhwaListContainer = document.getElementById('manhwaListContainer');
    const noManhwaMessage = document.getElementById('noManhwaMessage');
    const formTitle = document.getElementById('formTitle');
    const saveButton = document.getElementById('saveButton');
    const cancelEditButton = document.getElementById('cancelEditButton');

    const manhwaIdField = document.getElementById('manhwaId');
    const titleField = document.getElementById('title');
    const urlField = document.getElementById('url');
    const lastReadChapterField = document.getElementById('lastReadChapter');
    const latestChapterSelectorField = document.getElementById('latestChapterSelector');

    const userProgressTypeField = document.getElementById('userProgressType');
    const localStorageKeyDiv = document.getElementById('localStorageKeyDiv');
    const userProgressKeyField = document.getElementById('userProgressKey');

    const exportManhwaListButton = document.getElementById('exportManhwaListButton');
    const importManhwaListFile = document.getElementById('importManhwaListFile');
    const deleteAllManhwaButton = document.getElementById('deleteAllManhwaButton');
    const dataManagementStatus = document.getElementById('dataManagementStatus');

    // Bookmark Import Elements
    const importFromBookmarkFolderSetupButton = document.getElementById('importFromBookmarkFolderSetupButton');
    const bookmarkImportSection = document.getElementById('bookmarkImportSection');
    const bookmarkFolderImportSelect = document.getElementById('bookmarkFolderImportSelect');
    const executeBookmarkFolderImportButton = document.getElementById('executeBookmarkFolderImportButton');
    const cancelBookmarkFolderImportButton = document.getElementById('cancelBookmarkFolderImportButton');
    const bookmarkImportStatus = document.getElementById('bookmarkImportStatus');

    const wordpressMangaDomains = [
      'webtoonscan.com',
      'manhuascan.com',
      'manhwas.com',
      'asurascans.com',
      'reaperscans.com',
      'flamescans.org',
      'luminousscans.com',
      'aquamanga.com',
      'mangatx.com',
      'manhuafast.com',
      'isekaiscan.com',
      'topmanhua.com',
      'zinmanga.com',
      'mangakakalot.com', // Note: Mangakakalot structure varies, selector might not always work
      'toonily.com'
    ];
    const defaultWordPressSelector = 'li.wp-manga-chapter a, div.eph-num a, .chapter-list li a, .list-chapter li a, .version-chap li a';

    let editingManhwaId = null;

    manhwaForm.addEventListener('submit', handleFormSubmit);
    cancelEditButton.addEventListener('click', resetForm);
    userProgressTypeField.addEventListener('change', toggleUserProgressFields);

    if (exportManhwaListButton) exportManhwaListButton.addEventListener('click', handleExportManhwaList);
    if (importManhwaListFile) importManhwaListFile.addEventListener('change', handleImportManhwaList);
    if (deleteAllManhwaButton) deleteAllManhwaButton.addEventListener('click', handleDeleteAllManhwa);

    // Bookmark Import Listeners
    if (importFromBookmarkFolderSetupButton) {
        importFromBookmarkFolderSetupButton.addEventListener('click', setupBookmarkFolderImport);
    }
    if (executeBookmarkFolderImportButton) {
        executeBookmarkFolderImportButton.addEventListener('click', executeImportFromSelectedBookmarkFolder);
    }
    if (cancelBookmarkFolderImportButton) {
        cancelBookmarkFolderImportButton.addEventListener('click', () => {
            if (bookmarkImportSection) bookmarkImportSection.classList.add('hidden');
            if (bookmarkImportStatus) {
                bookmarkImportStatus.textContent = '';
                bookmarkImportStatus.className = 'status-message info hidden';
            }
        });
    }

    loadManhwaList();
    // Initial check for Bookmarks API for the import button
    if (typeof browser !== "undefined" && typeof browser.bookmarks !== "undefined") {
        if(importFromBookmarkFolderSetupButton) importFromBookmarkFolderSetupButton.disabled = false;
    } else {
        if (importFromBookmarkFolderSetupButton) {
            importFromBookmarkFolderSetupButton.disabled = true;
            if (dataManagementStatus) {
                 dataManagementStatus.textContent = "Bookmark import feature not available in this browser/environment.";
                 dataManagementStatus.className = 'status-message warning';
            }
        }
    }

    function toggleUserProgressFields() {
        if (userProgressTypeField.value === 'localStorage') {
            localStorageKeyDiv.classList.remove('hidden');
        } else {
            localStorageKeyDiv.classList.add('hidden');
        }
    }

    async function handleFormSubmit(event) {
        event.preventDefault();

        const title = titleField.value.trim();
        const url = urlField.value.trim();
        const lastReadChapter = parseFloat(lastReadChapterField.value) || 0;
        
        // Logic to auto-fill selector for certain new entries if adding a new manhwa and selector is empty
        if (!editingManhwaId && latestChapterSelectorField.value.trim() === '') {
          const currentUrl = url.toLowerCase(); // Use the already trimmed and fetched url
          if (wordpressMangaDomains.some(domain => currentUrl.includes(domain))) {
            latestChapterSelectorField.value = defaultWordPressSelector;
          }
        }
        
        const latestChapterSelector = latestChapterSelectorField.value.trim(); // Read after potential auto-fill
        const userProgressType = userProgressTypeField.value;
        const userProgressKey = userProgressKeyField.value.trim();

        if (!title || !url || !latestChapterSelector) {
            alert('Please fill in Title, URL, and Latest Chapter Selector. A default selector may be applied for some sites if the field is left empty and the URL matches a known pattern.');
            return;
        }

        const newManhwa = {
            id: editingManhwaId || Date.now().toString(),
            title,
            url,
            lastReadChapter,
            siteConfig: {
                latestChapterSelector,
                userProgress: {
                    type: userProgressType,
                    key: userProgressType === 'localStorage' ? userProgressKey : undefined
                }
            }
        };

        let currentList = await getStoredManhwaList();
        if (editingManhwaId) {
            currentList = currentList.map(m => m.id === editingManhwaId ? newManhwa : m);
        } else {
            currentList.push(newManhwa);
        }

        await browser.storage.local.set({ manhwaList: currentList });
        resetForm();
        loadManhwaList();
    }

    async function getStoredManhwaList() {
        const data = await browser.storage.local.get('manhwaList');
        return data.manhwaList || [];
    }

    async function loadManhwaList() {
        const manhwaList = await getStoredManhwaList();
        manhwaListContainer.innerHTML = '';

        if (manhwaList.length === 0) {
            noManhwaMessage.classList.remove('hidden');
            noManhwaMessage.className = 'status-message info';
            return;
        }
        noManhwaMessage.classList.add('hidden');

        manhwaList.forEach(manhwa => {
            const itemDiv = document.createElement('div');
            itemDiv.classList.add('manhwa-item');
            itemDiv.innerHTML = `
                <h3>${manhwa.title}</h3>
                <p><strong>URL:</strong> <a href="${manhwa.url}" target="_blank">${manhwa.url}</a></p>
                <p><strong>Last Read Chapter:</strong> ${manhwa.lastReadChapter}</p>
                <p><strong>Folder:</strong> ${manhwa.bookmarkFolderName || 'N/A'}</p>
                <p><strong>Chapter Selector:</strong> ${manhwa.siteConfig.latestChapterSelector}</p>
                ${manhwa.siteConfig.userProgress && manhwa.siteConfig.userProgress.type !== 'none' ? 
                    `<p><strong>Progress Detection:</strong> ${manhwa.siteConfig.userProgress.type}` + 
                    (manhwa.siteConfig.userProgress.key ? ` (Key: ${manhwa.siteConfig.userProgress.key})` : '') + `</p>` 
                    : '<p><strong>Progress Detection:</strong> None</p>'}
                <div class="actions">
                    <button class="edit-btn" data-id="${manhwa.id}">Edit</button>
                    <button class="delete-btn btn-danger" data-id="${manhwa.id}">Delete</button>
                </div>
            `;
            manhwaListContainer.appendChild(itemDiv);
        });

        document.querySelectorAll('.edit-btn').forEach(button => {
            button.addEventListener('click', handleEditManhwa);
        });
        document.querySelectorAll('.delete-btn').forEach(button => {
            button.addEventListener('click', handleDeleteManhwa);
        });
    }

    async function handleEditManhwa(event) {
        editingManhwaId = event.target.dataset.id;
        const manhwaList = await getStoredManhwaList();
        const manhwaToEdit = manhwaList.find(m => m.id === editingManhwaId);

        if (manhwaToEdit) {
            formTitle.textContent = 'Edit Manhwa';
            saveButton.textContent = 'Save Changes';
            cancelEditButton.classList.remove('hidden');

            manhwaIdField.value = manhwaToEdit.id;
            titleField.value = manhwaToEdit.title;
            urlField.value = manhwaToEdit.url;
            lastReadChapterField.value = manhwaToEdit.lastReadChapter;
            latestChapterSelectorField.value = manhwaToEdit.siteConfig.latestChapterSelector;
            
            userProgressTypeField.value = manhwaToEdit.siteConfig.userProgress?.type || 'none';
            userProgressKeyField.value = manhwaToEdit.siteConfig.userProgress?.key || '';
            toggleUserProgressFields();
            
            titleField.focus();
        }
    }

    async function handleDeleteManhwa(event) {
        const idToDelete = event.target.dataset.id;
        if (confirm('Are you sure you want to delete this manhwa entry?')) {
            let currentList = await getStoredManhwaList();
            currentList = currentList.filter(m => m.id !== idToDelete);
            await browser.storage.local.set({ manhwaList: currentList });
            loadManhwaList();
        }
    }

    function resetForm() {
        manhwaForm.reset();
        editingManhwaId = null;
        formTitle.textContent = 'Add New Manhwa';
        saveButton.textContent = 'Add Manhwa';
        cancelEditButton.classList.add('hidden');
        manhwaIdField.value = '';
        userProgressTypeField.value = 'none';
        toggleUserProgressFields();
    }

    async function handleExportManhwaList() {
        const manhwaList = await getStoredManhwaList();
        if (manhwaList.length === 0) {
            if (dataManagementStatus) {
                dataManagementStatus.textContent = 'No manhwa data to export.';
                dataManagementStatus.className = 'status-message info';
            }
            return;
        }
        try {
            // Explicitly map to ensure all desired fields are present and well-structured for export
            const exportableList = manhwaList.map(item => ({
                id: item.id || Date.now().toString(), // Ensure ID exists
                title: item.title || "Untitled",
                url: item.url || "",
                lastReadChapter: item.lastReadChapter !== undefined ? item.lastReadChapter : 0,
                // Ensure siteConfig and its nested properties are included with defaults
                siteConfig: {
                    latestChapterSelector: item.siteConfig && item.siteConfig.latestChapterSelector ? item.siteConfig.latestChapterSelector : 'li.wp-manga-chapter a', // Provide a common default
                    userProgress: {
                        type: item.siteConfig && item.siteConfig.userProgress && item.siteConfig.userProgress.type ? item.siteConfig.userProgress.type : 'none',
                        key: item.siteConfig && item.siteConfig.userProgress ? item.siteConfig.userProgress.key : undefined
                    }
                },
                bookmarkFolderName: item.bookmarkFolderName || null,
                bookmarkFolderId: item.bookmarkFolderId || null,
                // Any other fields that might be part of the 'item' structure could be added here
            }));

            const jsonData = JSON.stringify(exportableList, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'manhwa_checker_data.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            if (dataManagementStatus) {
                dataManagementStatus.textContent = 'Manhwa list exported successfully!';
                dataManagementStatus.className = 'status-message success';
            }
        } catch (error) {
            if (dataManagementStatus) {
                dataManagementStatus.textContent = 'Error exporting manhwa list: ' + error.message;
                dataManagementStatus.className = 'status-message error';
            }
        }
    }

    async function handleImportManhwaList(event) {
        const file = event.target.files[0];
        if (!file) {
            if (dataManagementStatus) {
                dataManagementStatus.textContent = 'No file selected for import.';
                dataManagementStatus.className = 'status-message info';
            }
            return;
        }
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedList = JSON.parse(e.target.result);
                if (!Array.isArray(importedList)) {
                    throw new Error('Imported data is not a valid list (must be an array).');
                }
                // Enhanced validation for each item
                const isValid = importedList.every(item => {
                    if (!item || typeof item !== 'object') return false;
                    if (!item.id || typeof item.id !== 'string') return false;
                    if (typeof item.title !== 'string') return false; // Allow empty title as per export default
                    if (typeof item.url !== 'string') return false;   // Allow empty URL as per export default
                    if (typeof item.lastReadChapter !== 'number') return false;

                    if (!item.siteConfig || typeof item.siteConfig !== 'object') return false;
                    if (typeof item.siteConfig.latestChapterSelector !== 'string') return false; // Allow empty as per export default
                    
                    if (!item.siteConfig.userProgress || typeof item.siteConfig.userProgress !== 'object') return false;
                    if (typeof item.siteConfig.userProgress.type !== 'string') return false;
                    // item.siteConfig.userProgress.key can be undefined or string, so no strict check needed unless type is 'localStorage'
                    if (item.siteConfig.userProgress.type === 'localStorage' && typeof item.siteConfig.userProgress.key !== 'string') {
                        // If type is localStorage, key should ideally be a string, but an empty/undefined one might be acceptable depending on strictness
                        // For now, we'll be a bit lenient if it's just undefined but type is localStorage, as export makes it undefined if not set
                    }

                    // bookmarkFolderName and bookmarkFolderId can be string or null
                    if (item.bookmarkFolderName !== null && typeof item.bookmarkFolderName !== 'string') return false;
                    if (item.bookmarkFolderId !== null && typeof item.bookmarkFolderId !== 'string') return false;
                    
                    return true; 
                });

                if (!isValid) {
                    throw new Error('Imported data contains items with invalid structure or missing essential fields. Please ensure the file was exported from a compatible version of Manhwa Checker.');
                }
                await browser.storage.local.set({ manhwaList: importedList });
                loadManhwaList();
                if (dataManagementStatus) {
                    dataManagementStatus.textContent = 'Manhwa list imported successfully!';
                    dataManagementStatus.className = 'status-message success';
                }
            } catch (error) {
                if (dataManagementStatus) {
                    dataManagementStatus.textContent = 'Error importing manhwa list: ' + error.message;
                    dataManagementStatus.className = 'status-message error';
                }
            }
        };
        reader.onerror = () => {
            if (dataManagementStatus) dataManagementStatus.textContent = 'Error reading import file.';
        };
        reader.readAsText(file);
        importManhwaListFile.value = ''; // Reset file input
    }

    async function handleDeleteAllManhwa() {
        if (confirm('Are you sure you want to delete ALL tracked manhwa series? This action cannot be undone.')) {
            await browser.storage.local.set({ manhwaList: [] });
            loadManhwaList();
            if (dataManagementStatus) {
                dataManagementStatus.textContent = 'All manhwa series have been deleted.';
                dataManagementStatus.className = 'status-message success';
            }
        }
    }

    // --- Bookmark Import Functions ---
    function setupBookmarkFolderImport() {
        if (bookmarkImportSection) {
            bookmarkImportSection.classList.remove('hidden');
        }
        if (bookmarkImportStatus) {
            bookmarkImportStatus.textContent = 'Loading bookmark folders...';
            bookmarkImportStatus.className = 'status-message info';
        }
        if (bookmarkFolderImportSelect) {
            bookmarkFolderImportSelect.innerHTML = '<option value="">Loading folders...</option>';
        }

        browser.bookmarks.getTree().then(bookmarkItems => {
            if (bookmarkFolderImportSelect) {
                bookmarkFolderImportSelect.innerHTML = '<option value="">Select a folder</option>';
            }
            let folderCount = 0;
            function populate(bookmarkItem, depth) {
                if (bookmarkItem.type === 'folder') {
                    if (!bookmarkItem.url) {
                        folderCount++;
                        const option = document.createElement('option');
                        option.value = bookmarkItem.id;
                        option.textContent = `${'--'.repeat(depth)} ${bookmarkItem.title || 'Unnamed Folder'}`;
                        if (bookmarkFolderImportSelect) bookmarkFolderImportSelect.appendChild(option);
                    }
                }
                if (bookmarkItem.children) {
                    for (let child of bookmarkItem.children) {
                        populate(child, depth + 1);
                    }
                }
            }
            bookmarkItems.forEach(item => populate(item, 0));
            if (folderCount === 0 && bookmarkImportStatus) {
                bookmarkImportStatus.textContent = 'No bookmark folders found.';
                bookmarkImportStatus.className = 'status-message warning';
            } else if (bookmarkImportStatus) {
                bookmarkImportStatus.textContent = 'Select a folder from the list.';
                 bookmarkImportStatus.className = 'status-message info';
            }

        }).catch(error => {
            console.error('Error loading bookmark folders:', error);
            if (bookmarkImportStatus) {
                bookmarkImportStatus.textContent = `Error loading folders: ${error.message}`;
                bookmarkImportStatus.className = 'status-message error';
            }
        });
    }

    async function executeImportFromSelectedBookmarkFolder() {
        const folderId = bookmarkFolderImportSelect.value;
        const folderName = bookmarkFolderImportSelect.options[bookmarkFolderImportSelect.selectedIndex]?.text.replace(/^--+\s*/, '') || 'Unknown Folder';

        if (!folderId) {
            if (bookmarkImportStatus) {
                bookmarkImportStatus.textContent = 'Please select a folder first.';
                bookmarkImportStatus.className = 'status-message warning';
            }
            return;
        }

        try {
            if (bookmarkImportStatus) {
                bookmarkImportStatus.textContent = 'Importing bookmarks...';
                bookmarkImportStatus.className = 'status-message info';
            }
            const bookmarks = await browser.bookmarks.getChildren(folderId);
            let currentList = await getStoredManhwaList();
            let importCount = 0;
            let skippedCount = 0;

            for (const bookmark of bookmarks) {
                if (bookmark.url && bookmark.title) {
                    // Check if URL already exists to avoid duplicates
                    if (currentList.some(entry => entry.url === bookmark.url)) {
                        console.log(`Skipping already tracked bookmark: ${bookmark.title} (${bookmark.url})`);
                        skippedCount++;
                        continue;
                    }

                    const newEntry = {
                        id: Date.now().toString() + Math.random().toString(36).substring(2,7), // more unique ID
                        title: bookmark.title,
                        url: bookmark.url,
                        lastReadChapter: 0, // Default, user should update
                        siteConfig: {
                            latestChapterSelector: 'body', // Placeholder, user MUST update
                            userProgress: { type: 'none', key: undefined }
                        },
                        bookmarkFolderId: folderId,
                        bookmarkFolderName: folderName
                    };
                    currentList.push(newEntry);
                    importCount++;
                }
            }

            await browser.storage.local.set({ manhwaList: currentList });
            loadManhwaList();
            if (bookmarkImportStatus) {
                 let message = `${importCount} bookmark(s) imported successfully from "${folderName}".`;
                 if (skippedCount > 0) {
                    message += ` ${skippedCount} bookmark(s) were already tracked and were skipped.`;
                 }
                 message += ` Please review imported items to set the correct CSS selectors.`;
                 bookmarkImportStatus.textContent = message;
                 bookmarkImportStatus.className = 'status-message success';
            }
            if (bookmarkImportSection) bookmarkImportSection.classList.add('hidden');

        } catch (error) {
            console.error('Error importing from bookmark folder:', error);
            if (bookmarkImportStatus) {
                bookmarkImportStatus.textContent = `Error importing: ${error.message}`;
                bookmarkImportStatus.className = 'status-message error';
            }
        }
    }
}); 