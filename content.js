// Listen for messages from background script
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === 'showTimer') {
        showTimerOverlay(request.domain, request.stats);
    } else if (request.action === 'showBlock') {
        showBlockOverlay(request.domain, request.stats);
    } else if (request.action === 'startOverrideTimer') {
        // Remove the overlay
        const container = document.getElementById('mindful-chromium-overlay');
        if (container) {
            container.remove();
        }
    }
});

// Listen for messages from timer iframe
window.addEventListener('message', function(event) {
    if (event.data.type === 'timerComplete') {
        const container = document.getElementById('mindful-chromium-overlay');
        if (container) {
            container.remove();
        }
    }
});

// Create overlay container
function createOverlayContainer() {
    const existingContainer = document.getElementById('mindful-chromium-overlay');
    if (existingContainer) {
        return existingContainer;
    }

    const container = document.createElement('div');
    container.id = 'mindful-chromium-overlay';
    container.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 2147483647;
        display: flex;
        justify-content: center;
        align-items: center;
        pointer-events: none;
        overflow: hidden;
    `;
    document.body.appendChild(container);
    return container;
}

// Show timer overlay
function showTimerOverlay(domain, stats) {
    const container = createOverlayContainer();
    
    // Only clear if we're not already showing a timer
    if (!container.querySelector('iframe[src*="timer.html"]')) {
        container.innerHTML = '';

        // Create blocker div
        const blocker = document.createElement('div');
        blocker.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 2147483646;
            pointer-events: auto;
        `;
        container.appendChild(blocker);

        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.src = chrome.runtime.getURL('timer.html');
        iframe.style.cssText = `
            width: 300px;
            height: 200px;
            border: none;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            z-index: 2147483647;
            pointer-events: auto;
            overflow: hidden;
        `;
        container.appendChild(iframe);

        // Send data to iframe
        iframe.onload = function() {
            iframe.contentWindow.postMessage({
                type: 'timerData',
                domain: domain,
                stats: stats
            }, '*');
        };
    }
}

// Show block overlay
function showBlockOverlay(domain, stats) {
    const container = createOverlayContainer();
    
    // Only clear if we're not already showing a block
    if (!container.querySelector('iframe[src*="block.html"]')) {
        container.innerHTML = '';

        // Create blocker div
        const blocker = document.createElement('div');
        blocker.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 2147483646;
            pointer-events: auto;
        `;
        container.appendChild(blocker);

        // Create iframe
        const iframe = document.createElement('iframe');
        iframe.src = chrome.runtime.getURL('block.html');
        iframe.style.cssText = `
            width: 300px;
            height: 200px;
            border: none;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            z-index: 2147483647;
            pointer-events: auto;
            overflow: hidden;
        `;
        container.appendChild(iframe);

        // Send data to iframe
        iframe.onload = function() {
            iframe.contentWindow.postMessage({
                type: 'blockData',
                domain: domain,
                stats: stats
            }, '*');
        };
    }
}

function removeExistingOverlays() {
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        if (iframe.contentWindow && iframe.contentWindow.document.querySelector('.container')) {
            document.body.removeChild(iframe);
        }
    });
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
} 