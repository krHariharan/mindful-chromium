# Mindful Browser Extension

A Chrome extension that helps you stay mindful of your time spent on distracting websites.

## Features

- Track visits and time spent on distracting websites
- Show mindfulness timer after a certain number of visits
- Block access to websites after reaching daily limits
- 2-minute override option (once per website per day)
- Customizable settings for timer and blocking thresholds
- Add custom websites to track

## Default Tracked Websites

- instagram.com
- youtube.com
- x.com
- reddit.com
- facebook.com
- linkedin.com

## Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

## Usage

1. Click the extension icon to open the settings popup
2. Configure your preferences:
   - Number of sessions before timer appears
   - Timer length in seconds
   - Number of sessions before blocking
   - Time limit before blocking
3. Add any additional websites you want to track
4. The extension will automatically track your visits and show timers or blocks as needed

## Settings

- **Sessions before timer**: Number of times you can visit a website before the mindfulness timer appears
- **Timer length**: How long the mindfulness timer will run (in seconds)
- **Sessions before block**: Maximum number of visits allowed per day
- **Time before block**: Maximum time allowed per day (in minutes)

## Override Feature

When a website is blocked, you can use the 2-minute override option once per website per day. After 2 minutes, you will be automatically redirected away from the website.

## Privacy

This extension only tracks the domains of websites you visit and does not collect any personal data. All tracking data is stored locally on your device and is reset daily at midnight. 