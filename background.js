// Initialize default settings
chrome.runtime.onInstalled.addListener(function() {
    chrome.storage.sync.set({
        sessionsBeforeTimer: 3,
        timerLength: 60,
        sessionsBeforeBlock: 10,
        timeBeforeBlock: 60,
        websites: [
            'instagram.com',
            'youtube.com',
            'x.com',
            'reddit.com',
            'facebook.com',
            'linkedin.com'
        ]
    });
});

// Track website visits and time
let currentTab = null;
let visitStartTime = null;
let dailyStats = {};
let lastVisitedDomain = null;
let trackedWebsites = [];
let timeTrackingInterval = null;

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'overrideBlock') {
        const domain = request.domain;
        const tabId = request.tabId;
        
        if (!dailyStats[domain]) {
            dailyStats[domain] = {
                visits: 0,
                timeSpent: 0,
                lastOverride: null
            };
        }
        
        // Set last override time
        dailyStats[domain].lastOverride = Date.now();
        
        // Save to storage
        chrome.storage.local.set({ dailyStats: dailyStats }, function() {
            if (chrome.runtime.lastError) {
                console.error('Error saving override:', chrome.runtime.lastError);
                sendResponse({ success: false });
            } else {
                console.log('Override saved for', domain);
                // Send message to content script to remove overlay
                chrome.tabs.sendMessage(tabId, {
                    action: 'startOverrideTimer'
                });
                sendResponse({ success: true });
            }
        });
        
        return true; // Keep the message channel open for the async response
    }
});

// Helper function to extract domain
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        // Get the base domain without www.
        let domain = urlObj.hostname.replace(/^www\./, '');
        return domain;
    } catch (e) {
        console.error('Error extracting domain:', e);
        return null;
    }
}

// Helper function to check if domain matches any tracked website
function isTrackedDomain(domain, trackedWebsites) {
    if (!domain) return false;
    console.log('Checking domain:', domain, 'against websites:', trackedWebsites);
    return trackedWebsites.some(site => {
        // Remove www. from site for comparison
        const cleanSite = site.replace(/^www\./, '');
        // Check if domains match exactly or if the domain ends with the site
        const isMatch = domain === cleanSite || domain.endsWith('.' + cleanSite);
        if (isMatch) {
            console.log('Match found for', domain, 'with', site);
        }
        return isMatch;
    });
}

// Reset daily stats at midnight
function resetDailyStats() {
    console.log('Resetting daily stats');
    dailyStats = {};
    chrome.storage.local.set({ dailyStats: dailyStats }, function() {
        if (chrome.runtime.lastError) {
            console.error('Error resetting stats:', chrome.runtime.lastError);
        }
    });
}

// Schedule daily reset
function scheduleDailyReset() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const timeUntilMidnight = midnight - now;
    
    setTimeout(() => {
        resetDailyStats();
        scheduleDailyReset();
    }, timeUntilMidnight);
}

// Initialize extension state
function initializeExtension() {
    // Load daily stats
    chrome.storage.local.get(['dailyStats'], function(data) {
        if (chrome.runtime.lastError) {
            console.error('Error loading daily stats:', chrome.runtime.lastError);
            return;
        }
        dailyStats = data.dailyStats || {};
        console.log('Loaded daily stats:', dailyStats);
    });

    // Load tracked websites
    chrome.storage.sync.get(['websites'], function(data) {
        if (chrome.runtime.lastError) {
            console.error('Error loading websites:', chrome.runtime.lastError);
            return;
        }
        
        // If no websites found, initialize with defaults
        if (!data.websites) {
            const defaultWebsites = [
                'instagram.com',
                'youtube.com',
                'x.com',
                'reddit.com',
                'facebook.com',
                'linkedin.com'
            ];
            chrome.storage.sync.set({ websites: defaultWebsites }, function() {
                if (chrome.runtime.lastError) {
                    console.error('Error saving default websites:', chrome.runtime.lastError);
                    return;
                }
                trackedWebsites = defaultWebsites;
                console.log('Initialized default websites:', trackedWebsites);
            });
        } else {
            trackedWebsites = data.websites;
            console.log('Loaded tracked websites:', trackedWebsites);
        }
    });

    scheduleDailyReset();
}

// Initialize on install or update
chrome.runtime.onInstalled.addListener(initializeExtension);

// Initialize when background script starts
initializeExtension();

// Initialize time tracking interval
function startTimeTracking() {
    // Clear any existing interval
    if (timeTrackingInterval) {
        clearInterval(timeTrackingInterval);
    }
    
    // Update time every 1 second for active tab
    timeTrackingInterval = setInterval(async function() {
        if (currentTab && visitStartTime) {
            try {
                // Get the current tab to ensure it's still active
                const tab = await chrome.tabs.get(currentTab.id);
                if (!tab || !tab.active) {
                    currentTab = null;
                    visitStartTime = null;
                    return;
                }

                const domain = extractDomain(tab.url);
                if (domain && isTrackedDomain(domain, trackedWebsites)) {
                    const baseDomain = domain.split('.').slice(-2).join('.');
                    if (!dailyStats[baseDomain]) {
                        dailyStats[baseDomain] = {
                            visits: 0,
                            timeSpent: 0,
                            lastOverride: null
                        };
                    }
                    
                    // Add 1 second to time spent
                    dailyStats[baseDomain].timeSpent += 1;
                    
                    // Save to storage
                    await chrome.storage.local.set({ dailyStats: dailyStats });
                    console.log('Updated time spent for', baseDomain, ':', dailyStats[baseDomain]);
                    
                    // Check if we need to block due to time limit
                    checkWebsiteStatus(baseDomain, tab.id);
                }
            } catch (error) {
                console.error('Error in time tracking:', error);
                currentTab = null;
                visitStartTime = null;
            }
        }
    }, 1000);
}

// Start time tracking when extension loads
startTimeTracking();

// Track tab changes
chrome.tabs.onActivated.addListener(async function(activeInfo) {
    // Update time for previous tab
    if (currentTab && visitStartTime) {
        try {
            const domain = extractDomain(currentTab.url);
            if (domain && isTrackedDomain(domain, trackedWebsites)) {
                const baseDomain = domain.split('.').slice(-2).join('.');
                if (!dailyStats[baseDomain]) {
                    dailyStats[baseDomain] = {
                        visits: 0,
                        timeSpent: 0,
                        lastOverride: null
                    };
                }
                
                const timeSpent = Math.floor((Date.now() - visitStartTime) / 1000);
                dailyStats[baseDomain].timeSpent += timeSpent;
                
                await chrome.storage.local.set({ dailyStats: dailyStats });
                console.log('Updated time spent for', baseDomain, ':', dailyStats[baseDomain]);
            }
        } catch (error) {
            console.error('Error updating time for previous tab:', error);
        }
    }
    
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (!tab || !tab.url) return;

        const domain = extractDomain(tab.url);
        if (!domain) return;

        console.log('Checking activated tab domain:', domain);
        if (isTrackedDomain(domain, trackedWebsites)) {
            console.log('Tracked domain activated:', domain);
            currentTab = tab;
            visitStartTime = Date.now();
            
            const baseDomain = domain.split('.').slice(-2).join('.');
            
            if (!lastVisitedDomain || baseDomain !== lastVisitedDomain) {
                lastVisitedDomain = baseDomain;
                
                if (!dailyStats[baseDomain]) {
                    dailyStats[baseDomain] = {
                        visits: 0,
                        timeSpent: 0,
                        lastOverride: null
                    };
                }
                dailyStats[baseDomain].visits++;
                await chrome.storage.local.set({ dailyStats: dailyStats });
                console.log('Updated stats for', baseDomain, ':', dailyStats[baseDomain]);
                
                checkWebsiteStatus(baseDomain, tab.id);
            }
        } else {
            lastVisitedDomain = domain;
            currentTab = null;
            visitStartTime = null;
        }
    } catch (error) {
        console.error('Error handling tab activation:', error);
    }
});

// Track tab updates
chrome.tabs.onUpdated.addListener(async function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete' && tab.active && tab.url) {
        try {
            const domain = extractDomain(tab.url);
            if (!domain) return;
            
            console.log('Checking updated tab domain:', domain);
            if (isTrackedDomain(domain, trackedWebsites)) {
                console.log('Tracked domain updated:', domain);
                currentTab = tab;
                visitStartTime = Date.now();
                
                const baseDomain = domain.split('.').slice(-2).join('.');
                
                if (!lastVisitedDomain || baseDomain !== lastVisitedDomain) {
                    lastVisitedDomain = baseDomain;
                    
                    if (!dailyStats[baseDomain]) {
                        dailyStats[baseDomain] = {
                            visits: 0,
                            timeSpent: 0,
                            lastOverride: null
                        };
                    }
                    dailyStats[baseDomain].visits++;
                    await chrome.storage.local.set({ dailyStats: dailyStats });
                    console.log('Updated stats for', baseDomain, ':', dailyStats[baseDomain]);
                    
                    checkWebsiteStatus(baseDomain, tabId);
                }
            } else {
                lastVisitedDomain = domain;
                currentTab = null;
                visitStartTime = null;
            }
        } catch (error) {
            console.error('Error handling tab update:', error);
        }
    }
});

// Track when browser window loses focus
chrome.windows.onFocusChanged.addListener(async function(windowId) {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        if (currentTab && visitStartTime) {
            try {
                const domain = extractDomain(currentTab.url);
                if (domain && isTrackedDomain(domain, trackedWebsites)) {
                    const baseDomain = domain.split('.').slice(-2).join('.');
                    if (!dailyStats[baseDomain]) {
                        dailyStats[baseDomain] = {
                            visits: 0,
                            timeSpent: 0,
                            lastOverride: null
                        };
                    }
                    
                    const timeSpent = Math.floor((Date.now() - visitStartTime) / 1000);
                    dailyStats[baseDomain].timeSpent += timeSpent;
                    
                    await chrome.storage.local.set({ dailyStats: dailyStats });
                    console.log('Updated time spent for', baseDomain, ':', dailyStats[baseDomain]);
                }
            } catch (error) {
                console.error('Error updating time on window focus change:', error);
            }
        }
        currentTab = null;
        visitStartTime = null;
    }
});

// Track when tabs are closed
chrome.tabs.onRemoved.addListener(async function(tabId, removeInfo) {
    if (currentTab && currentTab.id === tabId) {
        if (visitStartTime) {
            try {
                const domain = extractDomain(currentTab.url);
                if (domain && isTrackedDomain(domain, trackedWebsites)) {
                    const baseDomain = domain.split('.').slice(-2).join('.');
                    if (!dailyStats[baseDomain]) {
                        dailyStats[baseDomain] = {
                            visits: 0,
                            timeSpent: 0,
                            lastOverride: null
                        };
                    }
                    
                    const timeSpent = Math.floor((Date.now() - visitStartTime) / 1000);
                    dailyStats[baseDomain].timeSpent += timeSpent;
                    
                    await chrome.storage.local.set({ dailyStats: dailyStats });
                    console.log('Updated time spent for', baseDomain, ':', dailyStats[baseDomain]);
                }
            } catch (error) {
                console.error('Error updating time on tab close:', error);
            }
        }
        currentTab = null;
        visitStartTime = null;
    }
});

// Track when browser is about to close
chrome.runtime.onSuspend.addListener(async function() {
    if (currentTab && visitStartTime) {
        try {
            const domain = extractDomain(currentTab.url);
            if (domain && isTrackedDomain(domain, trackedWebsites)) {
                const baseDomain = domain.split('.').slice(-2).join('.');
                if (!dailyStats[baseDomain]) {
                    dailyStats[baseDomain] = {
                        visits: 0,
                        timeSpent: 0,
                        lastOverride: null
                    };
                }
                
                const timeSpent = Math.floor((Date.now() - visitStartTime) / 1000);
                dailyStats[baseDomain].timeSpent += timeSpent;
                
                await chrome.storage.local.set({ dailyStats: dailyStats });
                console.log('Updated time spent for', baseDomain, ':', dailyStats[baseDomain]);
            }
        } catch (error) {
            console.error('Error updating time on browser suspend:', error);
        }
    }
    currentTab = null;
    visitStartTime = null;
});

// Check if we need to show timer or block
function checkWebsiteStatus(domain, tabId) {
    chrome.storage.sync.get(['sessionsBeforeTimer', 'timerLength', 'sessionsBeforeBlock', 'timeBeforeBlock'], function(data) {
        const stats = dailyStats[domain];
        if (!stats) return;

        // Check if there's an active override and it's less than 2 minutes old
        const hasRecentOverride = stats.lastOverride && (Date.now() - stats.lastOverride < 2 * 60 * 1000);
        
        // Check if override was used today
        const today = new Date().toDateString();
        const overrideDate = stats.lastOverride ? new Date(stats.lastOverride).toDateString() : null;
        const hasUsedOverrideToday = overrideDate === today;

        if (hasRecentOverride) {
            console.log('Override active for', domain);
            return;
        }

        // Check if we need to block
        if (stats.visits >= data.sessionsBeforeBlock || stats.timeSpent >= data.timeBeforeBlock * 60) {
            console.log('Blocking access to', domain);
            chrome.storage.local.set({
                activeBlock: {
                    domain: domain,
                    stats: stats,
                    tabId: tabId,
                    canOverride: !hasUsedOverrideToday
                }
            }, function() {
                chrome.tabs.sendMessage(tabId, {
                    action: 'showBlock',
                    domain: domain,
                    stats: stats,
                    canOverride: !hasUsedOverrideToday
                });
            });
        }
        // Check if we need to show timer
        else if (stats.visits >= data.sessionsBeforeTimer) {
            console.log('Showing timer for', domain);
            chrome.tabs.sendMessage(tabId, {
                action: 'showTimer',
                domain: domain,
                stats: stats
            });
        }
    });
} 