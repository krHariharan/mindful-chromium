// Get block info from storage
chrome.storage.local.get(['activeBlock'], function(data) {
    if (!data.activeBlock) {
        window.close();
        return;
    }

    const { domain, stats, tabId, canOverride } = data.activeBlock;

    // Update display
    document.getElementById('message').textContent = `You've reached your daily limit for ${domain}.`;
    document.getElementById('stats').textContent = `Visits: ${stats.visits}, Time spent: ${formatTime(stats.timeSpent)}`;

    // Handle override button
    const overrideButton = document.getElementById('override');
    if (!canOverride) {
        overrideButton.style.display = 'none';
        const message = document.createElement('p');
        message.style.color = '#f44336';
        message.textContent = 'You have already used your override for today.';
        overrideButton.parentNode.appendChild(message);
    } else {
        overrideButton.addEventListener('click', function() {
            chrome.runtime.sendMessage({
                action: 'overrideBlock',
                domain: domain,
                tabId: tabId
            }, function(response) {
                if (response.success) {
                    // Clear block data and close popup
                    chrome.storage.local.remove('activeBlock', function() {
                        window.close();
                    });
                }
            });
        });
    }
});

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
} 