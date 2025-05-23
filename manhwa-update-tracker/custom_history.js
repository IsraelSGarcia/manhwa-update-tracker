document.addEventListener('DOMContentLoaded', () => {
    const historyDisplayContainer = document.getElementById('historyDisplayContainer');

    if (!historyDisplayContainer) {
        console.error("History display container not found!");
        return;
    }

    browser.storage.local.get('manhwaExtensionHistory').then(data => {
        const history = data.manhwaExtensionHistory;
        if (history && Array.isArray(history) && history.length > 0) {
            historyDisplayContainer.innerHTML = ''; // Clear 'Loading...'
            // Display in reverse chronological order (newest first)
            for (let i = history.length - 1; i >= 0; i--) {
                const item = history[i];
                const itemDiv = document.createElement('div');
                itemDiv.classList.add('history-item');
                
                const urlP = document.createElement('p');
                const urlA = document.createElement('a');
                urlA.href = item.url;
                urlA.textContent = item.url;
                urlA.target = '_blank';
                urlP.appendChild(document.createTextNode('URL: '));
                urlP.appendChild(urlA);

                const titleP = document.createElement('p');
                titleP.textContent = `Title: ${item.title || 'N/A'}`;
                
                const timestampP = document.createElement('p');
                timestampP.textContent = `Timestamp: ${new Date(item.timestamp).toLocaleString()}`;
                
                itemDiv.appendChild(urlP);
                itemDiv.appendChild(titleP);
                itemDiv.appendChild(timestampP);
                historyDisplayContainer.appendChild(itemDiv);
            }
        } else {
            historyDisplayContainer.innerHTML = '<p>Custom history is empty or not available.</p>';
        }
    }).catch(error => {
        console.error('Error fetching custom history:', error);
        historyDisplayContainer.innerHTML = `<p>Error loading custom history: ${error.message}</p>`;
    });
}); 