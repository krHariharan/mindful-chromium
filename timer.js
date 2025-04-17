// Listen for messages from the content script
window.addEventListener('message', function(event) {
    if (event.data.type === 'timerData') {
        const { domain, stats } = event.data;
        
        // Get timer length from storage
        chrome.storage.sync.get(['timerLength'], function(data) {
            const timerLength = data.timerLength || 60; // Default to 60 seconds
            let remainingTime = timerLength;

            // Update display
            document.getElementById('visits').textContent = `You've visited ${domain} ${stats.visits} times today.`;
            document.getElementById('timeSpent').textContent = `Time spent today: ${formatTime(stats.timeSpent)}`;
            document.getElementById('timer').textContent = formatTime(remainingTime);

            // Start timer
            const timerInterval = setInterval(function() {
                remainingTime--;
                document.getElementById('timer').textContent = formatTime(remainingTime);

                if (remainingTime <= 0) {
                    clearInterval(timerInterval);
                    // Remove the overlay
                    window.parent.postMessage({ type: 'timerComplete' }, '*');
                }
            }, 1000);
        });
    }
});

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
} 