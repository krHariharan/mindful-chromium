document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    loadWebsites();

    // Add website button handler
    document.getElementById('addWebsite').addEventListener('click', function() {
        const websiteInput = document.getElementById('newWebsite');
        const website = websiteInput.value.trim();
        
        if (website) {
            addWebsiteToList(website);
            websiteInput.value = '';
            
            // Save to storage
            chrome.storage.sync.get(['websites'], function(data) {
                const websites = data.websites || [];
                if (!websites.includes(website)) {
                    websites.push(website);
                    chrome.storage.sync.set({ websites: websites });
                }
            });
        }
    });

    // Save settings button handler
    document.getElementById('saveSettings').addEventListener('click', function() {
        const settings = {
            sessionsBeforeTimer: parseInt(document.getElementById('sessionsBeforeTimer').value),
            timerLength: parseInt(document.getElementById('timerLength').value),
            sessionsBeforeBlock: parseInt(document.getElementById('sessionsBeforeBlock').value),
            timeBeforeBlock: parseInt(document.getElementById('timeBeforeBlock').value)
        };
        
        chrome.storage.sync.set(settings, function() {
            // Show success message
            const button = document.getElementById('saveSettings');
            const originalText = button.textContent;
            button.textContent = 'Settings Saved!';
            button.style.backgroundColor = '#4CAF50';
            
            setTimeout(function() {
                button.textContent = originalText;
                button.style.backgroundColor = '#2196F3';
            }, 2000);
        });
    });

    // Refresh stats every second
    setInterval(loadWebsites, 1000);
});

function loadSettings() {
    chrome.storage.sync.get([
        'sessionsBeforeTimer',
        'timerLength',
        'sessionsBeforeBlock',
        'timeBeforeBlock'
    ], function(data) {
        // Set default values if not found
        const defaults = {
            sessionsBeforeTimer: 3,
            timerLength: 60,
            sessionsBeforeBlock: 10,
            timeBeforeBlock: 60
        };

        // Merge saved settings with defaults
        const settings = { ...defaults, ...data };

        // Update input fields
        document.getElementById('sessionsBeforeTimer').value = settings.sessionsBeforeTimer;
        document.getElementById('timerLength').value = settings.timerLength;
        document.getElementById('sessionsBeforeBlock').value = settings.sessionsBeforeBlock;
        document.getElementById('timeBeforeBlock').value = settings.timeBeforeBlock;
    });
}

function loadWebsites() {
    // Load websites and their stats
    chrome.storage.sync.get(['websites'], function(data) {
        const websitesList = document.getElementById('websitesList');
        websitesList.innerHTML = ''; // Clear current list
        
        const websites = data.websites || [];
        
        // Load daily stats
        chrome.storage.local.get(['dailyStats'], function(statsData) {
            const dailyStats = statsData.dailyStats || {};
            
            // Display all websites with their stats
            websites.forEach(website => {
                addWebsiteToList(website, dailyStats[website]);
            });
        });
    });
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function addWebsiteToList(website, stats = { visits: 0, timeSpent: 0 }) {
    const list = document.getElementById('websitesList');
    const li = document.createElement('li');
    
    const websiteInfo = document.createElement('div');
    websiteInfo.className = 'website-info';
    
    const websiteText = document.createElement('span');
    websiteText.className = 'website-name';
    websiteText.textContent = website;
    
    const websiteStats = document.createElement('span');
    websiteStats.className = 'website-stats';
    websiteStats.textContent = `Visits: ${stats.visits || 0} | Time: ${formatTime(stats.timeSpent || 0)}`;
    
    websiteInfo.appendChild(websiteText);
    websiteInfo.appendChild(websiteStats);
    
    const removeButton = document.createElement('div');
    removeButton.className = 'trash-icon';
    removeButton.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
        </svg>
    `;
    
    removeButton.addEventListener('click', function() {
        li.remove();
        // Update storage
        chrome.storage.sync.get(['websites'], function(data) {
            const websites = data.websites || [];
            const index = websites.indexOf(website);
            if (index > -1) {
                websites.splice(index, 1);
                chrome.storage.sync.set({ websites: websites });
            }
        });
    });
    
    li.appendChild(websiteInfo);
    li.appendChild(removeButton);
    list.appendChild(li);
} 