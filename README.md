# Chrome-Extension-Instagram-Automation

Overview
Instagram Automation Tool is a powerful Chrome extension designed to automate various Instagram tasks. It helps you manage Instagram accounts efficiently by scraping account and media data, automating interactions (like, follow, unfollow, block, remove, story view), and managing campaigns—all from a user-friendly popup UI.

Features
UI Popup:

A floating button appears on Instagram pages, opening a sidebar UI popup with different tabs and controls.

Account Scraping:

Scrape followers, followings, likers, and commenters for any public or private account.

Media Scraping:

Scrape media posts from Instagram feed, hashtags, locations, and profiles.

Automation Campaigns:

Automate follow, unfollow, remove follower, block, like stories, watch stories, like posts, etc.

Queues & Tables:

Manage "Accounts Queue" and "Media Queue" with dynamic tables and filters.

Filtering & Settings:

Filter by status (following, not following), private/public, follower counts, etc.

Logs:

All activity and errors are logged and persist between reloads in the Logs tab.

Updates & Help Tabs:

Keep track of the latest updates and get help via FAQs.

UI Overview
Sidebar Popup:
The extension injects a floating toggle button (insta-bot-toggle) onto Instagram. Clicking this opens the extension sidebar UI.

Tabs:

Accounts: Manage and scrape user accounts.

Media: Scrape posts and manage media campaigns.

Filters: Apply powerful filters to your queues.

Settings: Customize delay, scraping limits, automation behaviors, etc.

Logs: View persistent log/history.

Updates: Check for new features.

Help: Read FAQs and guides.

How to Use
1. Installation
Download or clone this repository.

Load it as an unpacked extension in Chrome:

Go to chrome://extensions/

Enable Developer mode

Click Load unpacked

Select your extension folder

2. Popup UI
Open Instagram.com in Chrome.

Click the floating bot icon in the top-right corner.

The sidebar UI will appear with all features organized in tabs.

3. Scraping and Automation
Accounts Queue Tab:

Click "Scrape Followers/Following/Likers/Commenters" to load account data.

Use filters to narrow results.

Start automations (follow, unfollow, block, etc.) from here.

Media Queue Tab:

Click "Load from Feed", "Load from Hashtags", "Load from Location" to scrape posts.

Select media and start "Like", "Watch Reels", or other campaigns.

Logs Tab:

All actions and errors will be saved and visible here, even after reload.

4. Settings
Adjust scraping delays, limits, and behavior in the Settings tab for safe automation.

Main Files
manifest.json
Chrome extension manifest (permissions, scripts, icons)

content-script.js
Handles DOM scraping and automation on Instagram pages.

script.js
Manages the UI popup, communication, and campaign logic.

background.js
Coordinates tab opening, automation, and messaging.

ui/index.html, styles.css
The sidebar/popup UI and its styling.

Requirements
Chrome Browser (latest)

Instagram account

