console.log("InstaBot UI Loaded");


document.addEventListener("DOMContentLoaded", () => {
  // ============================
  // Filtering  Functionalities
  // ============================

  function getAccountQueueFiltersFromUI() {
    // Range fields
    const followersMin = parseInt(document.getElementById('filter-followers-min').value || "0");
    const followersMax = parseInt(document.getElementById('filter-followers-max').value || "1000000000");
    const followingMin = parseInt(document.getElementById('filter-following-min').value || "0");
    const followingMax = parseInt(document.getElementById('filter-following-max').value || "1000000000");
    const postsMin = parseInt(document.getElementById('filter-posts-min').value || "0");
    const postsMax = parseInt(document.getElementById('filter-posts-max').value || "1000000000");

    // Profile checkboxes

    const isPrivate = document.getElementById('filter-private').checked;
    const isPublic = document.getElementById('filter-public').checked;
    const isVerified = document.getElementById('filter-verified').checked;
    const notVerified = document.getElementById('filter-not-verified').checked;

    // Bio fields
    const bioHas = document.getElementById('filter-bio-has').value.trim().toLowerCase();
    const bioNotHas = document.getElementById('filter-bio-not-has').value.trim().toLowerCase();

    // Business info
    const isBusiness = document.getElementById('filter-business').checked;
    const notBusiness = document.getElementById('filter-not-business').checked;
    const businessCatHas = document.getElementById('filter-business-cat-has').value.trim().toLowerCase();
    const businessCatNotHas = document.getElementById('filter-business-cat-not-has').value.trim().toLowerCase();

    // Follow status
    const followsMe = document.getElementById('filter-follows-me').checked;
    const notFollowsMe = document.getElementById('filter-not-follows-me').checked;
    const followedByMe = document.getElementById('filter-followed-by-me').checked;
    const notFollowedByMe = document.getElementById('filter-not-followed-by-me').checked;

    return {
      followersMin, followersMax,
      followingMin, followingMax,
      postsMin, postsMax,
      isPrivate, isPublic,
      isVerified, notVerified,
      bioHas, bioNotHas,
      isBusiness, notBusiness,
      businessCatHas, businessCatNotHas,
      followsMe, notFollowsMe, followedByMe, notFollowedByMe
    };
  }

  function applyAccountQueueFilters() {
    const filters = getAccountQueueFiltersFromUI();

    filteredQueueData = fullQueueData.filter(user => {
      // Numeric ranges (followers, following, posts)
      if (user.followers < filters.followersMin || user.followers > filters.followersMax) return false;
      if (user.following < filters.followingMin || user.following > filters.followingMax) return false;
      if (user.posts < filters.postsMin || user.posts > filters.postsMax) return false;

      // Profile pic
      if (filters.hasNoProfilePic && user.has_anonymous_profile_picture !== true) return false;
      if (filters.hasProfilePic && user.has_anonymous_profile_picture !== false) return false;


      // Private/Public
      if (filters.isPrivate && user.is_private !== true && user.is_private !== "Yes") return false;
      if (filters.isPublic && user.is_private !== false && user.is_private !== "No") return false;

      // Verified
      if (filters.isVerified && user.is_verified !== true && user.is_verified !== "Yes") return false;
      if (filters.notVerified && user.is_verified !== false && user.is_verified !== "No") return false;

      // Bio has/doesn't have
      if (filters.bioHas && !(user.bio || "").toLowerCase().includes(filters.bioHas)) return false;
      if (filters.bioNotHas && (user.bio || "").toLowerCase().includes(filters.bioNotHas)) return false;

      // Business account
      if (filters.isBusiness && (!user.business_category || user.business_category === "—")) return false;
      if (filters.notBusiness && user.business_category && user.business_category !== "—") return false;

      // Business category text
      if (filters.businessCatHas && !(user.business_category || "").toLowerCase().includes(filters.businessCatHas)) return false;
      if (filters.businessCatNotHas && (user.business_category || "").toLowerCase().includes(filters.businessCatNotHas)) return false;

      // Follow status (string "Yes"/"No" in your data)
      if (filters.followsMe && !(user.follows_me === true || user.follows_me === "Yes")) return false;
      if (filters.notFollowsMe && !(user.follows_me === false || user.follows_me === "No")) return false;
      if (filters.followedByMe && !(user.followed_by_me === true || user.followed_by_me === "Yes")) return false;
      if (filters.notFollowedByMe && !(user.followed_by_me === false || user.followed_by_me === "No")) return false;

      return true;
    });
  }
  document.querySelector('.apply-btn')?.addEventListener('click', () => {
    applyAccountQueueFilters();
    currentPage = 1;
    renderTablePage(currentPage);
    addLog('✅ Applied filters to accounts queue');
  });

  document.querySelector('.reset-btn')?.addEventListener('click', () => {
    filteredQueueData = null;
    // Also clear filter UI values
    document.querySelectorAll('#filters-tab input[type="number"], #filters-tab input[type="text"]').forEach(input => input.value = '');
    document.querySelectorAll('#filters-tab input[type="checkbox"]').forEach(input => input.checked = false);

    currentPage = 1;
    renderTablePage(currentPage);
    addLog('🔄 Reset filters, showing all accounts');
  });


  // ============================
  // Settings Functionalities
  // ============================

  const DEFAULT_SETTINGS = {
    // Performance Options
    showStampsInQueue: true,
    showQueueOnScreen: true,
    removeUncheckedColumns: false,
    showLikesInQueue: true,
    showProfilePicturesInQueue: true,
    notNowNotification: false,

    //unfollowing / removing options
    dontUnfollowFollowers: true,
    unfollowDaysAgo: false,
    unfollowDaysAgoNumber: 30,
    dontUnfollowLessDays: false,
    dontUnfollowLessDaysNumber: 3,
    dontUnfollowMatchFilters: true,
    dontRemoveBlockMatchFilters: true,


    // Wait configured time settings
    waitAfterFollow: 30,             // seconds
    waitAfterSkip: 1,                // seconds
    randomizeWait: 50,               // percent
    retrySoftRateLimit: 10,          // minutes
    retryHardRateLimit: 1,           // hours
    retry429RateLimit: 10,           // minutes
    retryAfter404: 10,               // times
    waitAfter50Actions: 24,          // hours

  };

  let Settings = { ...DEFAULT_SETTINGS };

  // --- HELPER: Updates Settings object from DOM checkboxes ---
  function updatePerformanceSettingsFromDOM() {
    Settings.showStampsInQueue = document.getElementById('show-stamps-in-queue').checked;
    Settings.showQueueOnScreen = document.getElementById('show-queue-on-screen').checked;
    Settings.removeUncheckedColumns = document.getElementById('remove-unchecked-columns').checked;
    Settings.showLikesInQueue = document.getElementById('show-likes-in-queue').checked;
    Settings.showProfilePicturesInQueue = document.getElementById('show-profile-pictures-in-queue').checked;
    Settings.notNowNotification = document.getElementById('not-now-notification').checked;

  }

  // --- HELPER: Sets checkbox states from Settings object ---
  function updatePerformanceCheckboxesFromSettings() {
    document.getElementById('show-stamps-in-queue').checked = Settings.showStampsInQueue;
    document.getElementById('show-queue-on-screen').checked = Settings.showQueueOnScreen;
    document.getElementById('remove-unchecked-columns').checked = Settings.removeUncheckedColumns;
    document.getElementById('show-likes-in-queue').checked = Settings.showLikesInQueue;
    document.getElementById('show-profile-pictures-in-queue').checked = Settings.showProfilePicturesInQueue;
    document.getElementById('not-now-notification').checked = Settings.notNowNotification;
  }

  // --- HELPER: Save settings to Chrome storage ---
  function saveSettings() {
    chrome.storage.sync.set({ instabot_settings: Settings });
  }

  function loadSettings() {
    chrome.storage.sync.get('instabot_settings', (data) => {
      if (data.instabot_settings) {
        Settings = { ...DEFAULT_SETTINGS, ...data.instabot_settings };
      }
      // Now update all UI checkboxes/fields
      updatePerformanceCheckboxesFromSettings();
      updateUnfollowRemoveDOMFromSettings();
      applyPerformanceSettingsToUI();
      updateWaitSettingsDOMFromSettings(); // <-- Add this

    });
  }


  // --- HELPER: Attach listeners to checkboxes for live updates ---
  function setupPerformanceSettingsListeners() {
    [
      'show-stamps-in-queue',
      'show-queue-on-screen',
      'remove-unchecked-columns',
      'show-likes-in-queue',
      'show-profile-pictures-in-queue',
      'not-now-notification'
    ].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        updatePerformanceSettingsFromDOM();
        saveSettings();
        applyPerformanceSettingsToUI();
      });
    });
  }

  // --- HELPER: Applies settings to UI (show/hide columns etc) ---
  function applyPerformanceSettingsToUI() {
    // Show/hide the entire queue table
    document.querySelector('.queue-table').style.display = Settings.showQueueOnScreen ? '' : 'none';

    // Show/hide stamps column
    document.querySelectorAll('.stamp-col').forEach(col => {
      col.style.display = Settings.showStampsInQueue ? '' : 'none';
    });

    // Show/hide likes column
    document.querySelectorAll('.likes-col').forEach(col => {
      col.style.display = Settings.showLikesInQueue ? '' : 'none';
    });

    // Show/hide profile pic column
    document.querySelectorAll('.profile-pic-col').forEach(col => {
      col.style.display = Settings.showProfilePicturesInQueue ? '' : 'none';
    });
  }


  // --- HELPER: Updates Settings object from DOM checkboxes ---
  function updateUnfollowRemoveSettingsFromDOM() {
    Settings.dontUnfollowFollowers = document.getElementById('dont-unfollow-followers').checked;
    Settings.unfollowDaysAgo = document.getElementById('unfollow-days-ago').checked;
    Settings.unfollowDaysAgoNumber = parseInt(document.getElementById('unfollow-days-ago-number').value) || 30;
    Settings.dontUnfollowLessDays = document.getElementById('dont-unfollow-less-days').checked;
    Settings.dontUnfollowLessDaysNumber = parseInt(document.getElementById('dont-unfollow-less-days-number').value) || 3;
    Settings.dontUnfollowMatchFilters = document.getElementById('dont-unfollow-match-filters').checked;
    Settings.dontRemoveBlockMatchFilters = document.getElementById('dont-remove-block-match-filters').checked;
  }


  // --- HELPER: Sets checkbox states from Settings object ---
  function updateUnfollowRemoveDOMFromSettings() {
    document.getElementById('dont-unfollow-followers').checked = Settings.dontUnfollowFollowers;
    document.getElementById('unfollow-days-ago').checked = Settings.unfollowDaysAgo;
    document.getElementById('unfollow-days-ago-number').value = Settings.unfollowDaysAgoNumber;
    document.getElementById('dont-unfollow-less-days').checked = Settings.dontUnfollowLessDays;
    document.getElementById('dont-unfollow-less-days-number').value = Settings.dontUnfollowLessDaysNumber;
    document.getElementById('dont-unfollow-match-filters').checked = Settings.dontUnfollowMatchFilters;
    document.getElementById('dont-remove-block-match-filters').checked = Settings.dontRemoveBlockMatchFilters;
  }

  //Listeners for Unfollow/Remove Options
  function setupUnfollowRemoveSettingsListeners() {
    [
      'dont-unfollow-followers',
      'unfollow-days-ago',
      'unfollow-days-ago-number',
      'dont-unfollow-less-days',
      'dont-unfollow-less-days-number',
      'dont-unfollow-match-filters',
      'dont-remove-block-match-filters'
    ].forEach(id => {
      document.getElementById(id)?.addEventListener('change', () => {
        updateUnfollowRemoveSettingsFromDOM();
        saveSettings();
      });
      // For number inputs, also listen to 'input'
      if (id.endsWith('number')) {
        document.getElementById(id)?.addEventListener('input', () => {
          updateUnfollowRemoveSettingsFromDOM();
          saveSettings();
        });
      }
    });
  }


  // Skipping users logic for unfollow, remove, block

  function shouldSkipUnfollowRemove(user, actionType) {
    // 1. Don't unfollow people who follow me (if the setting is checked)
    if (Settings.dontUnfollowFollowers && user.follows_me && actionType === 'unfollow') {
      return "❌ Skipped: They follow you";
    }
    // 2. Unfollow only if followed more than X days ago
    if (Settings.unfollowDaysAgo && user.days_since_followed < Settings.unfollowDaysAgoNumber && actionType === 'unfollow') {
      return `❌ Skipped: Followed <${Settings.unfollowDaysAgoNumber} days ago`;
    }
    // 3. Don't unfollow if followed less than Y days ago
    if (Settings.dontUnfollowLessDays && user.days_since_followed < Settings.dontUnfollowLessDaysNumber && actionType === 'unfollow') {
      return `❌ Skipped: Followed <${Settings.dontUnfollowLessDaysNumber} days ago`;
    }
    // 4. Don't unfollow people who match my filters
    if (Settings.dontUnfollowMatchFilters && user.matchesFilters && actionType === 'unfollow') {
      return "❌ Skipped: Matched your filters";
    }
    // 5. Don't remove/block people who match my filters
    if (Settings.dontRemoveBlockMatchFilters && user.matchesFilters && (actionType === 'block' || actionType === 'remove')) {
      return "❌ Skipped: Matched your filters";
    }
    return false;
  }



  // --- HELPER: Updates Settings object from DOM wait time fields ---
  function updateWaitSettingsFromDOM() {
    Settings.waitAfterFollow = parseInt(document.getElementById('wait-after-follow').value) || 30;
    Settings.waitAfterSkip = parseInt(document.getElementById('wait-after-skip').value) || 1;
    Settings.randomizeWait = parseInt(document.getElementById('randomize-wait').value) || 0;
    Settings.retrySoftRateLimit = parseInt(document.getElementById('retry-soft-rate-limit').value) || 10;
    Settings.retryHardRateLimit = parseInt(document.getElementById('retry-hard-rate-limit').value) || 1;
    Settings.retry429RateLimit = parseInt(document.getElementById('retry-429-rate-limit').value) || 10;
    Settings.retryAfter404 = parseInt(document.getElementById('retry-after-404').value) || 10;
    Settings.waitAfter50Actions = parseInt(document.getElementById('wait-after-50-actions').value) || 24;
  }

  // --- HELPER: Fills DOM wait time fields from Settings object ---
  function updateWaitSettingsDOMFromSettings() {
    document.getElementById('wait-after-follow').value = Settings.waitAfterFollow;
    document.getElementById('wait-after-skip').value = Settings.waitAfterSkip;
    document.getElementById('randomize-wait').value = Settings.randomizeWait;
    document.getElementById('retry-soft-rate-limit').value = Settings.retrySoftRateLimit;
    document.getElementById('retry-hard-rate-limit').value = Settings.retryHardRateLimit;
    document.getElementById('retry-429-rate-limit').value = Settings.retry429RateLimit;
    document.getElementById('retry-after-404').value = Settings.retryAfter404;
    document.getElementById('wait-after-50-actions').value = Settings.waitAfter50Actions;
  }

  // --- HELPER: Attach listeners for live updating wait settings ---
  function setupWaitSettingsListeners() {
    [
      'wait-after-follow',
      'wait-after-skip',
      'randomize-wait',
      'retry-soft-rate-limit',
      'retry-hard-rate-limit',
      'retry-429-rate-limit',
      'retry-after-404',
      'wait-after-50-actions',
    ].forEach(id => {
      document.getElementById(id)?.addEventListener('input', () => {
        updateWaitSettingsFromDOM();
        saveSettings();
      });
    });
  }

  function getConfiguredWaitTime(type = "follow") {
    let baseWait;
    // Add support for different types (follow, skip, etc)
    if (type === "skip") {
      baseWait = 1000 * (Settings.waitAfterSkip || 1);
    }
    else {
      baseWait = 1000 * (Settings.waitAfterFollow || 30);
    }

    let randomPercent = Settings.randomizeWait || 0;
    let totalWait = baseWait;

    if (randomPercent > 0) {
      const maxExtra = Math.floor(baseWait * randomPercent / 100);
      const randomExtra = Math.floor(Math.random() * (maxExtra + 1));
      totalWait = baseWait + randomExtra;
    }
    console.log("Random Wait (" + type + "):", Math.round(totalWait / 1000), "sec"); // Debug
    return totalWait;
  }

  //Settings functions call
  loadSettings();
  setupPerformanceSettingsListeners();
  setupUnfollowRemoveSettingsListeners();
  updatePerformanceSettingsFromDOM();
  updateUnfollowRemoveSettingsFromDOM();
  applyPerformanceSettingsToUI();
  updateWaitSettingsFromDOM();
  setupWaitSettingsListeners();


  //Tab switching 
  document.querySelectorAll(".nav-menu li").forEach(item => {
    item.addEventListener("click", () => {
      // Update active state in sidebar
      document.querySelectorAll(".nav-menu li").forEach(li => li.classList.remove("active"));
      item.classList.add("active");

      // Show corresponding tab content
      const tab = item.getAttribute("data-tab");
      document.querySelectorAll(".tab-content").forEach(tabDiv => tabDiv.classList.remove("active"));
      document.getElementById(`${tab}-tab`).classList.add("active");



    });
  });

  // Toggle collapsible settings cards in settings tab
  document.querySelectorAll('.card-toggle').forEach(toggle => {
    toggle.addEventListener('click', () => {
      const card = toggle.closest('.setting-card');
      card.classList.toggle('active');
    });
  });

  // ==== LOGS: Persistent Save/Load to LocalStorage ====

  // Save logs to localStorage after each new entry
  function saveLogsToLocalStorage() {
    const logs = [];
    document.querySelectorAll("#logs-list .log-entry").forEach(li => {
      logs.push(li.innerHTML);
    });
    localStorage.setItem("instabot_logs", JSON.stringify(logs));
  }

  // Load logs from localStorage at startup
  function loadLogsFromLocalStorage() {
    const logList = document.getElementById("logs-list");
    if (!logList) return;
    logList.innerHTML = ""; // Clear default entries

    const logsJson = localStorage.getItem("instabot_logs");
    if (logsJson) {
      try {
        const logs = JSON.parse(logsJson);
        logs.forEach(html => {
          const li = document.createElement("li");
          li.className = "log-entry";
          li.innerHTML = html;
          logList.appendChild(li); // Oldest at bottom, newest on top
        });
      } catch (e) {
        localStorage.removeItem("instabot_logs");
      }
    }
  }

  // Patch your addLog to also save to localStorage
  function addLog(message) {
    const logList = document.getElementById("logs-list");
    const logEntry = document.createElement("li");
    logEntry.className = "log-entry";
    const timestamp = new Date().toLocaleString();
    logEntry.innerHTML = `
        <span class="log-time">[${timestamp}]</span>
        <span class="log-text">${message}</span>
      `;
    logList.prepend(logEntry); // newest on top
    saveLogsToLocalStorage();  // <--- Persist logs
  }

  // === Call this as soon as DOM loads ===
  loadLogsFromLocalStorage();

  // ==== (Optional) Add "Clear Logs" Button Support ====
  const clearLogsBtn = document.getElementById("clear-logs-btn");
  if (clearLogsBtn) {
    clearLogsBtn.addEventListener("click", () => {
      localStorage.removeItem("instabot_logs");
      document.getElementById("logs-list").innerHTML = "";
    });
  }

  // FAQ Toggle and Help Section

  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      item.classList.toggle('active');
    });
  });


  // Global variables
  let currentPage = 1;
  const rowsPerPage = 10;
  let fullQueueData = [];
  let filteredQueueData = null;
  let fullMediaQueueData = [];
  const mediaRowsPerPage = 10;
  let currentMediaPage = 1;
  let isCampaignRunning = false;
  window.stopCampaignRequested = false;
  window.countdownTimer = null;

  function finalizeProcessingBtn() {
    isCampaignRunning = false;
    window.stopCampaignRequested = false;
    if (window.countdownTimer) {
      clearInterval(window.countdownTimer);
      window.countdownTimer = null;
    }
    const processBtn = document.getElementById('process-queue-btn');
    processBtn.disabled = false;
    processBtn.classList.remove("stop-processing");
    processBtn.innerText = "🚀 Start Processing";
  }

  //========================================
  // Update Accounts Queue Functionalities
  //==========================================

  //First updating usernames in place of "Account" in the dropdown of Load Accounts Queue

  // 🆕 Listen for username from content script
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "INSTAGRAM_USERNAME") {
      updateDropdownLabels(msg.username);
    }
  });

  // 🆕 Update dropdown labels based on username

  function updateDropdownLabels(username) {
    const defaultLabel = "Account";
    const name = username ? username : defaultLabel;

    // Update label text
    document.querySelector('#load-followers').innerText = `Load ${name}'s Followers`;
    document.querySelector('#following').innerText = `Load ${name}'s Following`;

    // Enable or disable based on presence of username
    const isProfile = Boolean(username);
    const buttonsToControl = [
      document.getElementById('load-followers'),

      document.getElementById('following')
    ];

    buttonsToControl.forEach(btn => {
      if (isProfile) {
        btn.classList.remove('disabled-btn');
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
      } else {
        btn.classList.add('disabled-btn');
        btn.style.pointerEvents = 'none';
        btn.style.opacity = '0.5';
      }
    });
  }
  updateDropdownLabels(null);


  // === Select Dropdown Update (Select All / None / Remove Selected) ===

  const selectAllCheckbox = document.getElementById('select-all-checkbox');

  // **Function 1**: When the first row checkbox (header checkbox) is clicked, select/deselect all rows
  selectAllCheckbox.addEventListener('change', () => {
    const checkboxes = document.querySelectorAll('#accounts-tbody input[type="checkbox"]');
    checkboxes.forEach(checkbox => checkbox.checked = selectAllCheckbox.checked);
  });

  // **Function 2**: Listen for individual checkbox changes to update "Select All" checkbox
  document.getElementById('accounts-tbody').addEventListener('change', (e) => {
    if (e.target && e.target.matches('input[type="checkbox"]')) {
      const checkboxes = document.querySelectorAll('#accounts-tbody input[type="checkbox"]');
      const allUnchecked = Array.from(checkboxes).every(checkbox => !checkbox.checked);

      // Update the "Select All" checkbox state
      selectAllCheckbox.checked = !allUnchecked;
      selectAllCheckbox.indeterminate = !allUnchecked;
    }
  });

  // **Function 3**: Select All from Dropdown
  document.getElementById('select-all-rows')?.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('#accounts-tbody input[type="checkbox"]');
    checkboxes.forEach(checkbox => checkbox.checked = true);

    // Update "Select All" checkbox in the header to checked
    selectAllCheckbox.checked = true;
    selectAllCheckbox.indeterminate = false;
  });

  // **Function 4**: Select None from Dropdown
  document.getElementById('select-none-rows')?.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('#accounts-tbody input[type="checkbox"]');
    checkboxes.forEach(checkbox => checkbox.checked = false);

    // Update "Select All" checkbox in the header to unchecked
    selectAllCheckbox.checked = false;
    selectAllCheckbox.indeterminate = false;
  });

  // **Function 5**: Remove Selected from Dropdown
  document.getElementById('remove-selected-rows')?.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('#accounts-tbody input[type="checkbox"]:checked');

    // Remove selected rows
    checkboxes.forEach(checkbox => {
      const row = checkbox.closest('tr');
      row.remove();
    });

    // After removing, update the "Select All" checkbox state
    const allCheckboxes = document.querySelectorAll('#accounts-tbody input[type="checkbox"]');
    const allUnchecked = Array.from(allCheckboxes).every(checkbox => !checkbox.checked);
    selectAllCheckbox.checked = !allUnchecked;
    selectAllCheckbox.indeterminate = !allUnchecked;
  });


  // Media Queue scraping message
  function setMediaScrapingStatus(heading = "", detail = "", show = true) {
    const container = document.getElementById("media-scraping-status-container");
    if (!container) return;
    document.getElementById("media-scraping-status-heading").innerText = heading || "";
    document.getElementById("media-scraping-status-detail").innerText = detail || "";
    container.style.display = show ? "" : "none";
  }

  let mediaScrapingCountdown = null;
  let mediaScrapingCurrent = 1;
  let mediaScrapingLimit = 1;

  function startMediaScrapingCountdown(totalPosts, delaySec = 10) {
    mediaScrapingCurrent = 1;
    mediaScrapingLimit = totalPosts;

    function updateCountdown(secLeft) {
      setMediaScrapingStatus(
        "Scraping Started...",
        `Scraping post ${mediaScrapingCurrent} of ${mediaScrapingLimit}. Next post in ${secLeft}s`
      );
    }

    let secLeft = delaySec;
    updateCountdown(secLeft);

    if (mediaScrapingCountdown) clearInterval(mediaScrapingCountdown);
    mediaScrapingCountdown = setInterval(() => {
      secLeft--;
      if (secLeft <= 0) {
        mediaScrapingCurrent++;
        if (mediaScrapingCurrent > mediaScrapingLimit) {
          stopMediaScrapingCountdown();
          return;
        }
        secLeft = delaySec;
      }
      updateCountdown(secLeft);
    }, 1000);
  }

  function stopMediaScrapingCountdown() {
    if (mediaScrapingCountdown) clearInterval(mediaScrapingCountdown);
    mediaScrapingCountdown = null;
  }



  // === Render All Scraped Data in Accunts Queue Table===
  // Render the table with pagination

  function renderTablePage(page = 1) {
    const tbody = document.getElementById("accounts-tbody");
    if (!tbody || !Array.isArray(fullQueueData)) return;

    tbody.innerHTML = "";

    const sourceData = filteredQueueData ?? fullQueueData;

    const start = (page - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const pageData = sourceData.slice(start, end);

    if (!pageData.length) {
      tbody.innerHTML = '<tr><td colspan="17">No data to display.</td></tr>';
      return;
    }

    pageData.forEach(user => {

      tr = document.createElement("tr");
      tr.setAttribute('data-userid', user.id);
      tr.setAttribute('data-follows-me', user.follows_me === "Yes" ? "Yes" : "No");
      tr.setAttribute('data-days-since-followed', user.days_since_followed || 0);
      tr.setAttribute('data-matches-filters', user.matchesFilters ? "true" : "false");

      tr.innerHTML = `
      <td><input type="checkbox" /></td>
      <td class="profile-pic-col">
        ${Settings.showProfilePicturesInQueue && user.profile_pic ?
          `<img src="${user.profile_pic}" width="50" height="50" style="border-radius: 50%;" referrerpolicy="no-referrer" crossorigin="anonymous" />`
          : ""}
      </td>
      <td>
        <a href="https://www.instagram.com/${user.username}/" target="_blank" style="text-decoration: none; cursor: pointer; color: white;">
          @${user.username || "—"}
        </a>
      </td>
      <td>${user.full_name || "—"}</td>
      <td>${user.bio || "—"}</td>
      <td>${user.posts !== undefined ? user.posts : "—"}</td>
      <td>${user.followers !== undefined ? user.followers : "—"}</td>
      <td>${user.following !== undefined ? user.following : "—"}</td>
      <td>${user.follows_me === true || user.follows_me === "Yes" ? "Yes" : (user.follows_me === false || user.follows_me === "No" ? "No" : "—")}</td>
      <td>${user.followed_by_me === true || user.followed_by_me === "Yes" ? "Yes" : (user.followed_by_me === false || user.followed_by_me === "No" ? "No" : "—")}</td>
      <td>${user.is_mutual || "—"}</td>
      <td>${user.is_private === true ? "Yes" : (user.is_private === false ? "No" : "—")}</td>
      <td>${user.is_verified ? "Yes" : "No"}</td>
      <td>${user.business_category || "—"}</td>

    `;
      tbody.appendChild(tr);
    });

    document.querySelectorAll('.profile-pic-col').forEach(col => {
      col.style.display = Settings.showProfilePicturesInQueue ? '' : 'none';
    });
    document.querySelectorAll('.stamp-col').forEach(col => {
      col.style.display = Settings.showStampsInQueue ? '' : 'none';
    });

    const totalPages = Math.ceil(sourceData.length / rowsPerPage);
    document.getElementById("page-info").innerText = `Page ${page} of ${totalPages}`;
    document.getElementById("prev-page").disabled = page <= 1;
    document.getElementById("next-page").disabled = page >= totalPages;
  }


  //scrape message function above table queue
  function setScrapeMessage(type, source) {
    const statusBox = document.getElementById("scrape-status");
    if (!statusBox) return;

    let message = "";

    if (type === "Followers" || type === "Following") {
      message = `${type} of current profile: @${source} has been scraped.`;
    } else if (type === "Likers" || type === "Commenters") {
      message = `${type} of current post: ${source} has been scraped.`;
    }

    statusBox.textContent = message;
  }

  // === Table Render Triggers (renderX) ===

  function renderFollowers(data, username) {
    fullQueueData = data;              // Save all results
    currentPage = 1;                   // Reset to page 1
    setScrapeMessage("Followers", username);
    renderTablePage(currentPage);      // Show 10 at a time
    addLog(`Fetched ${data.length} followers of @${username}`);
  }

  function renderFollowing(data, username) {
    fullQueueData = data;              // Save all results
    currentPage = 1;                   // Reset to page 1
    setScrapeMessage("Following", username);
    renderTablePage(currentPage);      // Show 10 at a time
    addLog(`Fetched ${data.length} following of @${username}`);
  }

  function renderLikers(data, shortcode) {
    fullQueueData = data;              // Save all results
    currentPage = 1;                   // Reset to page 1
    setScrapeMessage("Likers", shortcode);
    renderTablePage(currentPage);      // Show 10 at a time
    addLog(`Fetched ${data.length} likers of post ${shortcode}`);
  }

  function renderCommenters(data, shortcode) {
    fullQueueData = data;              // Save all results
    currentPage = 1;                   // Reset to page 1
    setScrapeMessage("Commenters", shortcode);
    renderTablePage(currentPage);      // Show 10 at a time
    addLog(`Fetched ${data.length} commenters of post ${shortcode}`);
  }


  // =======================================
  // Load Accounts Queue from Content Script
  // =======================================

  // Event listener for load followers 
  document.getElementById('load-followers')?.addEventListener('click', () => {
    const limitInput = document.getElementById('account-limit');
    const limit = parseInt(limitInput?.value || 0);
    const scrapeMode = document.querySelector('input[name="scrapeMode"]:checked')?.value || "full";


    if (!limit || limit < 1) {
      alert("Please enter a valid number in 'Limit Queue' to fetch followers.");
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (limit, scrapeMode) => {
          if (typeof scrapeFollowers === "function") {
            scrapeFollowers(limit, scrapeMode);
          } else {
            console.warn("scrapeFollowers is not defined in window.");
          }
        },
        args: [limit, scrapeMode]
      });
    });
  });

  //Event listener for load following 
  document.getElementById('following')?.addEventListener('click', () => {
    const limitInput = document.getElementById('account-limit');
    const limit = parseInt(limitInput?.value || 0);
    const scrapeMode = document.querySelector('input[name="scrapeMode"]:checked')?.value || "full";


    if (!limit || limit < 1) {
      alert("Please enter a valid number in 'Limit Queue' to fetch following.");
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (limit, scrapeMode) => {
          if (typeof scrapeFollowing === "function") {
            scrapeFollowing(limit, scrapeMode);
          } else {
            console.warn("scrapeFollowing is not defined.");
          }
        },
        args: [limit, scrapeMode]
      });
    });
  });


  //Event listener for load likers
  document.getElementById('load-likers')?.addEventListener('click', () => {
    const limitInput = document.getElementById('account-limit');
    const scrapeMode = document.querySelector('input[name="scrapeMode"]:checked')?.value || "full";
    const limit = parseInt(limitInput?.value || 0);
    if (!limit || limit < 1) {
      alert("Please enter a valid number in 'Limit Queue' to fetch likers.");
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (limit, scrapeMode) => {
          if (typeof scrapeLikersFromCurrentPost === "function") {
            scrapeLikersFromCurrentPost(limit, scrapeMode);
          } else {
            console.warn("scrapeLikersFromCurrentPost is not defined.");
          }
        },
        args: [limit, scrapeMode]
      });
    });
  });

  //Event listener for load commenters
  document.getElementById('commenters')?.addEventListener('click', () => {
    const limitInput = document.getElementById('account-limit');
    const limit = parseInt(limitInput?.value || 0);
    const scrapeMode = document.querySelector('input[name="scrapeMode"]:checked')?.value || "full";

    if (!limit || limit < 1) {
      alert("Please enter a valid number in 'Limit Queue' to fetch commenters.");
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (limit, scrapeMode) => {
          if (typeof scrapeCommentersFromCurrentPost === "function") {
            scrapeCommentersFromCurrentPost(limit, scrapeMode);
          } else {
            console.warn("scrapeCommentersFromCurrentPost is not defined.");
          }
        },
        args: [limit, scrapeMode]
      });
    });
  });


  // Load Queue from localStorage , Load Queue Button
  document.getElementById('load-queue')?.addEventListener('click', () => {
    const stored = localStorage.getItem('insta_queue');
    if (!stored) {
      alert("⚠️ No saved queue found.");
      return;
    }

    const queueData = JSON.parse(stored);
    fullQueueData = queueData;
    currentPage = 1;
    renderTablePage(currentPage);
    addLog(`Loaded ${queueData.length} accounts from local storage`);
  });


  // Save Queue to localStorage, Save Queue Button
  document.getElementById('save-queue')?.addEventListener('click', () => {
    const rows = document.querySelectorAll('#accounts-tbody tr');
    const queueData = [];

    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      queueData.push({
        profile_pic: cells[2]?.querySelector('img')?.src || '',
        username: cells[3]?.innerText.replace('@', '').trim(),
        full_name: cells[4]?.innerText.trim(),
        bio: cells[5]?.innerText,
        posts: cells[6]?.innerText,
        followers: cells[7]?.innerText,
        following: cells[8]?.innerText,
        mutual: cells[9]?.innerText,
        is_private: cells[10]?.innerText === 'Yes',
        is_verified: cells[11]?.innerText === 'Yes',
        business_category: cells[12]?.innerText,


      });
    });

    localStorage.setItem('insta_queue', JSON.stringify(queueData));
    alert('✅ Queue data saved to localStorage.');
    addLog("Saved current queue to local storage");
  });


  // === Pagination Events Accounts Queue ===
  document.getElementById("prev-page")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTablePage(currentPage);
    }
  });

  document.getElementById("next-page")?.addEventListener("click", () => {
    const totalPages = Math.ceil(fullQueueData.length / rowsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderTablePage(currentPage);
    }
  });


  // ✅ Export to CSV (all rows in memory, not just paginated)

  function sanitizeText(text) {
    if (!text) return "";

    // Normalize to remove accents and styled text
    text = text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");

    // Remove emojis and pictographs
    text = text.replace(/[\u{1F600}-\u{1F64F}]/gu, ""); // Emoticons
    text = text.replace(/[\u{1F300}-\u{1F5FF}]/gu, ""); // Misc Symbols
    text = text.replace(/[\u{1F680}-\u{1F6FF}]/gu, ""); // Transport
    text = text.replace(/[\u{2600}-\u{26FF}]/gu, "");   // Misc symbols
    text = text.replace(/[\u{2700}-\u{27BF}]/gu, "");   // Dingbats

    // Replace smart punctuation and weird dashes with plain ones
    text = text.replace(/[–—]/g, "-");         // En/Em dashes → hyphen
    text = text.replace(/[“”]/g, '"');         // Smart quotes → straight quotes
    text = text.replace(/[‘’]/g, "'");         // Apostrophes
    text = text.replace(/[…]/g, "...");        // Ellipsis

    // Remove line breaks, tabs, and control characters
    text = text.replace(/[\r\n\t]+/g, " ");

    // Remove any other non-ASCII characters
    text = text.replace(/[^\x20-\x7E]/g, "");

    return text.trim();
  }


  document.getElementById('export-csv')?.addEventListener('click', () => {
    if (!fullQueueData.length) {
      alert("⚠️ Nothing to export.");
      return;
    }

    // Updated headers (you were missing 'Profile Link' column name)
    let csv = "Username,Full Name,Bio,Posts,Followers,Following,Mutual,Private,Verified,Profile Link\n";

    fullQueueData.forEach(user => {
      const values = [
        sanitizeText(`@${user.username}`),
        sanitizeText(user.full_name || ""),
        sanitizeText(user.bio || "—"),
        sanitizeText(user.posts || "—"),
        sanitizeText(user.followers || "—"),
        sanitizeText(user.following || "—"),
        sanitizeText(user.is_mutual || "—"),
        user.is_private ? "Yes" : "No",
        user.is_verified ? "Yes" : "No",

        `https://www.instagram.com/${user.username}/`
      ];
      csv += values.map(v => `"${v}"`).join(',') + '\n';
    });

    const BOM = '\uFEFF'; // UTF-8 BOM
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `insta-queue-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addLog("Exported full queue to CSV");
  });

  // Safe sanitizeText function
  function sanitizeText(text) {
    if (typeof text === "string") return text.replace(/"/g, '""').normalize('NFKD');
    if (text == null) return "";
    return String(text).replace(/"/g, '""');
  }



  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "FOLLOWERS_DATA") renderFollowers(msg.data, msg.from);
    if (msg.type === "FOLLOWING_DATA") renderFollowing(msg.data, msg.from);
    if (msg.type === "LIKERS_DATA") renderLikers(msg.data, msg.from);
    if (msg.type === "COMMENTERS_DATA") renderCommenters(msg.data, msg.from);
    if (msg.type === "MEDIA_DATA") renderMediaQueue(msg.data);
    if (msg.type === "SCRAPING_STATUS") {
      setScrapingStatus(msg.heading, msg.detail, true);
      // Optional: auto-hide after a while on complete or error
      if (msg.heading?.toLowerCase().includes("completed") ||
        msg.heading?.toLowerCase().includes("error") ||
        msg.heading?.toLowerCase().includes("no followers")) {
        setTimeout(() => setScrapingStatus("", "", false), 5000);
      }
    }

    // MEDIA scraping status message
    if (msg.type === "SCRAPING_STATUS" && msg.forTab === "media") {
      setMediaScrapingStatus(msg.heading, msg.detail, true);
      if (msg.heading?.toLowerCase().includes("completed") ||
        msg.heading?.toLowerCase().includes("error") ||
        msg.heading?.toLowerCase().includes("no posts")) {
        setTimeout(() => setMediaScrapingStatus("", "", false), 5000);
      }
    }

  });

  //=================================================
  // === Accounts Campaign Functionalities ===
  //=================================================

  // --- On Start Processing ---

  const processBtn = document.getElementById('process-queue-btn');

  processBtn?.addEventListener('click', () => {
    if (!isCampaignRunning) {
      // --- START PROCESSING ---
      const selectedAction = document.querySelector('input[name="process-action"]:checked')?.value;

      stopCampaignRequested = false;
      isCampaignRunning = true;
      processBtn.classList.add("stop-processing");
      processBtn.innerText = "🛑 Stop Processing";
      processBtn.disabled = false;

      // --- Choose and Start Campaign ---
      let campaignFunc = null;
      if (selectedAction === 'follow') campaignFunc = startFollowCampaign;
      else if (selectedAction === 'remove') campaignFunc = startRemoveFollowerCampaign;
      else if (selectedAction === 'unfollow') campaignFunc = startUnfollowCampaign;
      else if (selectedAction === 'block') campaignFunc = startBlockUserCampaign;
      else if (selectedAction === 'story') campaignFunc = startWatchStoryCampaign;
      else if (selectedAction === 'follow-like1') campaignFunc = startFollowLikeCampaign;
      else if (selectedAction === 'like-only') campaignFunc = startLikeOnlyCampaign;
      else {
        alert("⚠️ Please select a campaign action!");
        processBtn.classList.remove("stop-processing");
        processBtn.innerText = "🚀 Start Processing";
        isCampaignRunning = false;
        return;
      }

      // --- Pass the finalize callback so campaign can reset UI/button on finish/stop ---
      if (typeof campaignFunc === "function") campaignFunc(finalizeProcessingBtn);


    } else {
      // --- STOP PROCESSING ---
      stopCampaignRequested = true;
      processBtn.innerText = "Stopping...";
      processBtn.disabled = true;

      // The campaign's own logic will see the flag and call finalizeProcessingBtn()
    }
  });


  function setScrapingStatus(heading, detail, show = true) {
    const container = document.getElementById("scraping-status-container");
    if (!container) return;
    document.getElementById("scraping-status-heading").innerText = heading || "";
    document.getElementById("scraping-status-detail").innerText = detail || "";
    container.style.display = show ? "" : "none";
  }



  // To trigger scraping from your popup UI, use something like this:
  document.getElementById("start-scrape-btn")?.addEventListener("click", () => {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "START_SCRAPE_FOLLOWERS", limit: 50 });
    });
  });


  //Update Table Row with Message of campaign updates

  function setRowCampaignStatus(row, type, msg) {
    row.classList.remove('success-row', 'skip-row', 'error-row');
    if (type === "success") row.classList.add('success-row');
    else if (type === "skip") row.classList.add('skip-row');
    else if (type === "error") row.classList.add('error-row');
    else if (type === "grey") row.classList.add('grey-row');
    const td = row.querySelector('td');
    if (td) td.innerHTML = `<span class="campaign-status-msg">${msg}</span>`;
  }

  function startCountdown(seconds, username) {
    const el = document.getElementById('countdownTimer');
    if (!el) return;
    if (window.countdownTimer) clearInterval(window.countdownTimer);

    let remaining = seconds;
    el.textContent = `⏳ ${remaining}s before @${username}`;

    window.countdownTimer = setInterval(() => {
      // STOP if campaign is stopped
      if (window.stopCampaignRequested) {
        clearInterval(window.countdownTimer);
        el.textContent = '';
        return;
      }
      remaining--;
      if (remaining <= 0) {
        clearInterval(window.countdownTimer);
        el.textContent = '';
      } else {
        el.textContent = `⏳ ${remaining}s before @${username}`;
      }
    }, 1000);
  }


  // ===========================
  // Start Follow Campaign
  // ===========================

  function startFollowCampaign(onDone) {
    const selectedRows = document.querySelectorAll('#accounts-tbody input[type="checkbox"]:checked');
    if (selectedRows.length === 0) {
      alert("⚠️ No users selected!");
      if (typeof onDone === "function") onDone();
      return;
    }

    let currentIndex = 0;

    async function followNextUser() {
      // STOP button logic
      if (window.stopCampaignRequested) {
        addLog("🛑 Campaign stopped by user.");
        if (typeof onDone === "function") onDone();
        return;
      }

      // Pause after every 50 follows, if enabled (to avoid rate limits)
      if (currentIndex > 0 && Settings.waitAfter50Actions && currentIndex % 50 === 0) {
        addLog(`⏳ 50 actions completed. Pausing for ${Settings.waitAfter50Actions} hour(s) to avoid block.`);
        startCountdown(Settings.waitAfter50Actions * 60 * 60, "PAUSE");
        setTimeout(() => {
          if (window.stopCampaignRequested) {
            addLog("🛑 Campaign stopped by user.");
            if (typeof onDone === "function") onDone();
            return;
          }
          followNextUser();
        }, Settings.waitAfter50Actions * 60 * 60 * 1000);
        return;
      }

      if (currentIndex >= selectedRows.length) {
        alert("✅ Follow campaign completed!");
        const el = document.getElementById('countdownTimer');
        if (el) el.textContent = '';
        if (typeof onDone === "function") onDone();
        return;
      }

      const checkbox = selectedRows[currentIndex];
      const row = checkbox.closest('tr');
      const userId = row.getAttribute('data-userid');
      const username = row.querySelector('td:nth-child(3)')?.innerText?.replace('@', '').trim() || '';
      const waitTime = getConfiguredWaitTime("follow");

      if (!userId) {
        setRowCampaignStatus(row, "error", "ERROR");
        currentIndex++;
        startCountdown(Math.round(waitTime / 1000), username);
        setTimeout(() => {
          if (window.stopCampaignRequested) {
            addLog("🛑 Campaign stopped by user.");
            if (typeof onDone === "function") onDone();
            return;
          }
          followNextUser();
        }, waitTime);
        return;
      }

      addLog(`🚀 Attempting to follow User ID: ${userId}`);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs.length) {
          addLog("❌ No active tab found.");
          setRowCampaignStatus(row, "error", "ERROR");
          currentIndex++;
          startCountdown(Math.round(waitTime / 1000), username);
          setTimeout(() => {
            if (window.stopCampaignRequested) {
              addLog("🛑 Campaign stopped by user.");
              if (typeof onDone === "function") onDone();
              return;
            }
            followNextUser();
          }, waitTime);
          return;
        }

        chrome.tabs.sendMessage(tabs[0].id, { type: "FOLLOW_USER", userId }, (response) => {
          // ======= RATE LIMIT HANDLING START =======
          if (response?.rateLimit === "soft") {
            addLog(`⚠️ Soft rate limit hit! Pausing for ${Settings.retrySoftRateLimit} minutes.`);
            startCountdown(Settings.retrySoftRateLimit * 60, username);
            setTimeout(() => {
              if (window.stopCampaignRequested) {
                addLog("🛑 Campaign stopped by user.");
                if (typeof onDone === "function") onDone();
                return;
              }
              followNextUser();
            }, Settings.retrySoftRateLimit * 60 * 1000);
            return;
          }
          if (response?.rateLimit === "429") {
            addLog(`⛔ 429 rate limit! Pausing for ${Settings.retry429RateLimit} minutes.`);
            startCountdown(Settings.retry429RateLimit * 60, username);
            setTimeout(() => {
              if (window.stopCampaignRequested) {
                addLog("🛑 Campaign stopped by user.");
                if (typeof onDone === "function") onDone();
                return;
              }
              followNextUser();
            }, Settings.retry429RateLimit * 60 * 1000);
            return;
          }
          if (response?.rateLimit === "hard") {
            addLog(`⛔ Hard rate limit! Pausing for ${Settings.retryHardRateLimit} hour(s).`);
            startCountdown(Settings.retryHardRateLimit * 60 * 60, username);
            setTimeout(() => {
              if (window.stopCampaignRequested) {
                addLog("🛑 Campaign stopped by user.");
                if (typeof onDone === "function") onDone();
                return;
              }
              followNextUser();
            }, Settings.retryHardRateLimit * 60 * 60 * 1000);
            return;
          }
          // ======= RATE LIMIT HANDLING END =======

          if (chrome.runtime.lastError) {
            addLog(`⚠️ Skipped User ID ${userId} — content script not loaded.`);
            setRowCampaignStatus(row, "error", "ERROR");
            currentIndex++;
            startCountdown(Math.round(waitTime / 1000), username);
            setTimeout(() => {
              if (window.stopCampaignRequested) {
                addLog("🛑 Campaign stopped by user.");
                if (typeof onDone === "function") onDone();
                return;
              }
              followNextUser();
            }, waitTime);
            return;
          }

          if (response?.success) {
            setRowCampaignStatus(row, "success", "FOLLOWED");
            addLog(`✅ Followed User ID: ${userId}`);
          } else {
            setRowCampaignStatus(row, "error", "ERROR");
            addLog(`❌ Failed to follow User ID: ${userId}`);
          }
          currentIndex++;
          const nextUserRow = selectedRows[currentIndex];
          const nextUsername = nextUserRow?.closest('tr')?.querySelector('td:nth-child(3)')?.innerText?.replace('@', '').trim() || '';
          startCountdown(Math.round(waitTime / 1000), nextUsername);
          setTimeout(() => {
            if (window.stopCampaignRequested) {
              addLog("🛑 Campaign stopped by user.");
              if (typeof onDone === "function") onDone();
              return;
            }
            followNextUser();
          }, waitTime);
        });
      });
    }

    followNextUser();
  }

  // ===========================
  // Start Unfollow Campaign
  // ===========================

  // --- Helper: get all needed user data from row or JS queue ---
  function getRowUserData(row) {
    return {
      userId: row.getAttribute('data-userid'),
      follows_me: row.getAttribute('data-follows-me') === "Yes",  // Only true if they follow you
      days_since_followed: Number(row.getAttribute('data-days-since-followed')) || 0,
      matchesFilters: row.getAttribute('data-matches-filters') === "true"
    };
  }

  function startUnfollowCampaign(onDone) {

    const selectedRows = document.querySelectorAll('#accounts-tbody input[type="checkbox"]:checked');
    if (selectedRows.length === 0) {
      alert("⚠️ No users selected!");
      if (typeof onDone === "function") onDone();
      return;
    }

    let currentIndex = 0;

    async function unfollowNextUser() {
      // === SUPPORT FOR STOP BUTTON ===
      if (window.stopCampaignRequested) {
        addLog("🛑 Campaign stopped by user.");
        if (typeof onDone === "function") onDone();
        return;
      }
      // Pause after every 50 unfollows, if enabled (to avoid rate limits)
      if (currentIndex > 0 && Settings.waitAfter50Actions && currentIndex % 50 === 0) {
        addLog(`⏳ 50 actions completed. Pausing for ${Settings.waitAfter50Actions} hour(s) to avoid block.`);
        startCountdown(Settings.waitAfter50Actions * 60 * 60, "PAUSE");
        setTimeout(() => {
          if (window.stopCampaignRequested) {
            addLog("🛑 Campaign stopped by user.");
            if (typeof onDone === "function") onDone();
            return;
          }
          unfollowNextUser();
        }, Settings.waitAfter50Actions * 60 * 60 * 1000);
        return;
      }

      if (currentIndex >= selectedRows.length) {
        alert("✅ Unfollow campaign completed!");
        const el = document.getElementById('countdownTimer');
        if (el) el.textContent = '';
        if (typeof onDone === "function") onDone();
        return;
      }

      const checkbox = selectedRows[currentIndex];
      const row = checkbox.closest('tr');
      const user = getRowUserData(row);

      const skipReason = shouldSkipUnfollowRemove(user, 'unfollow');
      const waitTime = getConfiguredWaitTime(skipReason ? "skip" : "unfollow");

      // 🚩 Skip logic (if user meets skip criteria)
      if (skipReason) {
        addLog(`${skipReason} (@${row.querySelector('td:nth-child(3)').innerText.trim()})`);
        setRowCampaignStatus(row, "skip", "SKIPPED");
        currentIndex++;
        const nextUserRow = selectedRows[currentIndex];
        const nextUsername = nextUserRow?.closest('tr')?.querySelector('td:nth-child(3)')?.innerText?.trim()?.replace('@', '') || '';
        startCountdown(Math.round(waitTime / 1000), nextUsername);
        setTimeout(() => {
          if (window.stopCampaignRequested) {
            addLog("🛑 Campaign stopped by user.");
            if (typeof onDone === "function") onDone();
            return;
          }
          unfollowNextUser();
        }, waitTime);
        return;
      }

      addLog(`🚫 Attempting to unfollow User ID: ${user.userId}`);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs.length) {
          addLog("❌ No active tab found.");
          setRowCampaignStatus(row, "error", "ERROR");
          currentIndex++;
          const nextUserRow = selectedRows[currentIndex];
          const nextUsername = nextUserRow?.closest('tr')?.querySelector('td:nth-child(3)')?.innerText?.trim()?.replace('@', '') || '';
          startCountdown(Math.round(waitTime / 1000), nextUsername);
          setTimeout(() => {
            if (window.stopCampaignRequested) {
              addLog("🛑 Campaign stopped by user.");
              if (typeof onDone === "function") onDone();
              return;
            }
            unfollowNextUser();
          }, waitTime);
          return;
        }

        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "UNFOLLOW_USER", userId: user.userId },
          (response) => {
            // ======= RATE LIMIT HANDLING START =======
            if (response?.rateLimit === "soft") {
              addLog(`⚠️ Soft rate limit hit! Pausing for ${Settings.retrySoftRateLimit} minutes.`);
              startCountdown(Settings.retrySoftRateLimit * 60, user.username || "");
              setTimeout(() => {
                if (window.stopCampaignRequested) {
                  addLog("🛑 Campaign stopped by user.");
                  if (typeof onDone === "function") onDone();
                  return;
                }
                unfollowNextUser();
              }, Settings.retrySoftRateLimit * 60 * 1000);
              return;
            }
            if (response?.rateLimit === "429") {
              addLog(`⛔ 429 rate limit! Pausing for ${Settings.retry429RateLimit} minutes.`);
              startCountdown(Settings.retry429RateLimit * 60, user.username || "");
              setTimeout(() => {
                if (window.stopCampaignRequested) {
                  addLog("🛑 Campaign stopped by user.");
                  if (typeof onDone === "function") onDone();
                  return;
                }
                unfollowNextUser();
              }, Settings.retry429RateLimit * 60 * 1000);
              return;
            }
            if (response?.rateLimit === "hard") {
              addLog(`⛔ Hard rate limit! Pausing for ${Settings.retryHardRateLimit} hour(s).`);
              startCountdown(Settings.retryHardRateLimit * 60 * 60, user.username || "");
              setTimeout(() => {
                if (window.stopCampaignRequested) {
                  addLog("🛑 Campaign stopped by user.");
                  if (typeof onDone === "function") onDone();
                  return;
                }
                unfollowNextUser();
              }, Settings.retryHardRateLimit * 60 * 60 * 1000);
              return;
            }
            // ======= RATE LIMIT HANDLING END =======

            if (chrome.runtime.lastError) {
              addLog(`⚠️ Could not send message: ${chrome.runtime.lastError.message}`);
              setRowCampaignStatus(row, "error", "ERROR");
              currentIndex++;
              const nextUserRow = selectedRows[currentIndex];
              const nextUsername = nextUserRow?.closest('tr')?.querySelector('td:nth-child(3)')?.innerText?.trim()?.replace('@', '') || '';
              startCountdown(Math.round(waitTime / 1000), nextUsername);
              setTimeout(() => {
                if (window.stopCampaignRequested) {
                  addLog("🛑 Campaign stopped by user.");
                  if (typeof onDone === "function") onDone();
                  return;
                }
                unfollowNextUser();
              }, waitTime);
              return;
            }

            if (response?.success) {
              setRowCampaignStatus(row, "success", "UNFOLLOWED");
              addLog(`✅ Unfollowed User ID: ${user.userId}`);
            } else {
              setRowCampaignStatus(row, "error", "ERROR");
              addLog(`❌ Failed to unfollow User ID: ${user.userId}`);
            }

            currentIndex++;
            const nextUserRow = selectedRows[currentIndex];
            const nextUsername = nextUserRow?.closest('tr')?.querySelector('td:nth-child(3)')?.innerText?.trim()?.replace('@', '') || '';
            startCountdown(Math.round(waitTime / 1000), nextUsername);
            setTimeout(() => {
              if (window.stopCampaignRequested) {
                addLog("🛑 Campaign stopped by user.");
                if (typeof onDone === "function") onDone();
                return;
              }
              unfollowNextUser();
            }, waitTime);
          }
        );
      });
    }

    unfollowNextUser();
  }


  // ===========================
  // Start Block User Campaign
  // ===========================

  function startBlockUserCampaign(onDone) {
    const selectedRows = document.querySelectorAll('#accounts-tbody input[type="checkbox"]:checked');

    if (selectedRows.length === 0) {
      alert("⚠️ No users selected!");
      if (typeof onDone === "function") onDone();
      return;
    }

    let currentIndex = 0;

    async function blockNextUser() {
      // === SUPPORT FOR STOP BUTTON ===
      if (window.stopCampaignRequested) {
        addLog("🛑 Campaign stopped by user.");
        if (typeof onDone === "function") onDone();
        return;
      }

      if (currentIndex >= selectedRows.length) {
        alert("✅ Block user campaign completed!");
        if (typeof onDone === "function") onDone();
        return;
      }

      const waitTime = getConfiguredWaitTime("block");
      const checkbox = selectedRows[currentIndex];
      const row = checkbox.closest('tr');
      const userId = row.getAttribute('data-userid');
      const username = row.querySelector('td:nth-child(3)')?.innerText?.replace('@', '')?.trim() || '';

      if (!userId) {
        setRowCampaignStatus(row, "error", "ERROR");
        currentIndex++;
        startCountdown(Math.round(waitTime / 1000), username);
        setTimeout(() => {
          if (window.stopCampaignRequested) {
            addLog("🛑 Campaign stopped by user.");
            if (typeof onDone === "function") onDone();
            return;
          }
          blockNextUser();
        }, waitTime);
        return;
      }

      addLog(`🚫 Attempting to block user ID: ${userId}`);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs.length) {
          addLog("❌ No active tab found.");
          setRowCampaignStatus(row, "error", "ERROR");
          currentIndex++;
          startCountdown(Math.round(waitTime / 1000), username);
          setTimeout(() => {
            if (window.stopCampaignRequested) {
              addLog("🛑 Campaign stopped by user.");
              if (typeof onDone === "function") onDone();
              return;
            }
            blockNextUser();
          }, waitTime);
          return;
        }

        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "BLOCK_USER", userId },
          (response) => {
            if (chrome.runtime.lastError) {
              addLog(`⚠️ Could not send message: ${chrome.runtime.lastError.message}`);
              setRowCampaignStatus(row, "error", "ERROR");
              currentIndex++;
              startCountdown(Math.round(waitTime / 1000), username);
              setTimeout(() => {
                if (window.stopCampaignRequested) {
                  addLog("🛑 Campaign stopped by user.");
                  if (typeof onDone === "function") onDone();
                  return;
                }
                blockNextUser();
              }, waitTime);
              return;
            }

            if (response?.success) {
              setRowCampaignStatus(row, "success", "BLOCKED");
              addLog(`✅ Blocked user ID: ${userId}`);
            } else {
              setRowCampaignStatus(row, "error", "ERROR");
              addLog(`❌ Failed to block user ID: ${userId}`);
            }

            currentIndex++;
            const nextUserRow = selectedRows[currentIndex];
            const nextUsername = nextUserRow?.closest('tr')?.querySelector('td:nth-child(3)')?.innerText?.trim()?.replace('@', '') || '';
            startCountdown(Math.round(waitTime / 1000), nextUsername);
            setTimeout(() => {
              if (window.stopCampaignRequested) {
                addLog("🛑 Campaign stopped by user.");
                if (typeof onDone === "function") onDone();
                return;
              }
              blockNextUser();
            }, waitTime);
          }
        );
      });
    }

    blockNextUser();
  }

  // ===========================
  // Remove Follower Campaign
  // ===========================

  function startRemoveFollowerCampaign(onDone) {
    const selectedRows = document.querySelectorAll('#accounts-tbody input[type="checkbox"]:checked');

    if (selectedRows.length === 0) {
      alert("⚠️ No users selected!");
      if (typeof onDone === "function") onDone();
      return;
    }

    let currentIndex = 0;

    function removeNextFollower() {
      // === SUPPORT FOR STOP BUTTON ===
      if (window.stopCampaignRequested) {
        addLog("🛑 Campaign stopped by user.");
        if (typeof onDone === "function") onDone();
        return;
      }

      if (currentIndex >= selectedRows.length) {
        alert("✅ Remove Follower campaign completed!");
        if (typeof onDone === "function") onDone();
        return;
      }

      const checkbox = selectedRows[currentIndex];
      const row = checkbox.closest('tr');
      const user = getRowUserData(row); // Make sure you have this helper function (like in your other campaigns)
      const userId = row.getAttribute('data-userid');
      const skipReason = shouldSkipUnfollowRemove(user, 'remove');
      const waitTime = getConfiguredWaitTime(skipReason ? "skip" : "remove");

      if (!userId) {
        setRowCampaignStatus(row, "error", "ERROR");
        currentIndex++;
        startCountdown(Math.round(waitTime / 1000), "");
        setTimeout(() => {
          if (window.stopCampaignRequested) {
            addLog("🛑 Campaign stopped by user.");
            if (typeof onDone === "function") onDone();
            return;
          }
          removeNextFollower();
        }, waitTime);
        return;
      }
      if (skipReason) {
        addLog(`${skipReason} (@${row.querySelector('td:nth-child(3)').innerText.trim()})`);
        setRowCampaignStatus(row, "skip", "SKIPPED");
        currentIndex++;
        const nextUserRow = selectedRows[currentIndex];
        const nextUsername = nextUserRow?.closest('tr')?.querySelector('td:nth-child(3)')?.innerText?.trim()?.replace('@', '') || '';
        startCountdown(Math.round(waitTime / 1000), nextUsername);
        setTimeout(() => {
          if (window.stopCampaignRequested) {
            addLog("🛑 Campaign stopped by user.");
            if (typeof onDone === "function") onDone();
            return;
          }
          removeNextFollower();
        }, waitTime);
        return;
      }
      addLog(`🚫 Attempting to remove follower ID: ${userId}`);

      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || !tabs.length) {
          addLog("❌ No active tab found.");
          setRowCampaignStatus(row, "error", "ERROR");
          currentIndex++;
          startCountdown(Math.round(waitTime / 1000), "");
          setTimeout(() => {
            if (window.stopCampaignRequested) {
              addLog("🛑 Campaign stopped by user.");
              if (typeof onDone === "function") onDone();
              return;
            }
            removeNextFollower();
          }, waitTime);
          return;
        }

        chrome.tabs.sendMessage(
          tabs[0].id,
          { type: "REMOVE_FOLLOWER", userId },
          (response) => {
            if (chrome.runtime.lastError) {
              addLog(`⚠️ Could not send message: ${chrome.runtime.lastError.message}`);
              setRowCampaignStatus(row, "error", "ERROR");
              currentIndex++;
              startCountdown(Math.round(waitTime / 1000), "");
              setTimeout(() => {
                if (window.stopCampaignRequested) {
                  addLog("🛑 Campaign stopped by user.");
                  if (typeof onDone === "function") onDone();
                  return;
                }
                removeNextFollower();
              }, waitTime);
              return;
            }

            if (response?.success) {
              setRowCampaignStatus(row, "success", "REMOVED");
              addLog(`✅ Removed follower ID: ${userId}`);
            } else {
              setRowCampaignStatus(row, "error", "ERROR");
              addLog(`❌ Failed to remove follower ID: ${userId}`);
            }

            currentIndex++;
            const nextUserRow = selectedRows[currentIndex];
            const nextUsername = nextUserRow?.closest('tr')?.querySelector('td:nth-child(3)')?.innerText?.trim()?.replace('@', '') || '';
            startCountdown(Math.round(waitTime / 1000), nextUsername);
            setTimeout(() => {
              if (window.stopCampaignRequested) {
                addLog("🛑 Campaign stopped by user.");
                if (typeof onDone === "function") onDone();
                return;
              }
              removeNextFollower();
            }, waitTime);
          }
        );
      });
    }

    removeNextFollower();
  }


  // ===========================
  // Start Watch Story Campaign
  // ===========================
  function startWatchStoryCampaign(onDone) {
    const selectedRows = document.querySelectorAll('#accounts-tbody input[type="checkbox"]:checked');
    const likeWhileWatching = document.getElementById("like-while-watching")?.checked;

    if (selectedRows.length === 0) {
      alert("⚠️ No users selected!");
      if (typeof onDone === "function") onDone();
      return;
    }

    let currentIndex = 0;
    const STORY_PAGE_LOAD_DELAY = 3000;

    function openNextStory() {
      // === SUPPORT FOR STOP BUTTON ===
      if (window.stopCampaignRequested) {
        addLog("🛑 Campaign stopped by user.");
        if (typeof onDone === "function") onDone();
        return;
      }

      if (currentIndex >= selectedRows.length) {
        alert("✅ Story campaign complete!");
        if (typeof onDone === "function") onDone();
        return;
      }

      const row = selectedRows[currentIndex].closest('tr');
      const usernameCell = row.querySelector('td:nth-child(3)');
      const username = usernameCell?.innerText?.replace('@', '')?.trim();

      if (!username) {
        addLog("❌ Username missing");
        setRowCampaignStatus(row, "error", "ERROR");
        currentIndex++;
        openNextStory();
        return;
      }
      const waitTime = getConfiguredWaitTime("story");
      addLog(`📺 Watching @${username}'s stories ${likeWhileWatching ? "(with like)" : ""}`);

      chrome.tabs.create({ url: `https://www.instagram.com/stories/${username}/`, active: false }, (tab) => {
        const tabId = tab.id;

        // Wait for story to load, then send message to content script
        const storyLoadTimeout = setTimeout(() => {
          chrome.tabs.sendMessage(tabId, {
            type: "START_STORY_VIEW",
            like: likeWhileWatching,
            waitTime: waitTime
          });
          startCountdown(Math.round(waitTime / 1000), username);
        }, STORY_PAGE_LOAD_DELAY);

        // Listen for story completion
        const storyListener = (msg) => {
          if (msg.type === "STORY_DONE") {
            cleanup();
            chrome.tabs.remove(tabId);

            // Mark as WATCHED (success, green)
            setRowCampaignStatus(row, "success", "WATCHED + LIKED");

            currentIndex++;
            setTimeout(() => {
              if (window.stopCampaignRequested) {
                addLog("🛑 Campaign stopped by user.");
                if (typeof onDone === "function") onDone();
                return;
              }
              openNextStory();
            }, waitTime); // slight buffer before next tab
          }
        };

        // Clean up listeners if tab closed manually
        const tabClosed = (closedTabId) => {
          if (closedTabId === tabId) {
            cleanup();
            currentIndex++;
            setTimeout(() => {
              if (window.stopCampaignRequested) {
                addLog("🛑 Campaign stopped by user.");
                if (typeof onDone === "function") onDone();
                return;
              }
              openNextStory();
            }, waitTime);
          }
        };

        function cleanup() {
          clearTimeout(storyLoadTimeout);
          chrome.runtime.onMessage.removeListener(storyListener);
          chrome.tabs.onRemoved.removeListener(tabClosed);
        }

        chrome.runtime.onMessage.addListener(storyListener);
        chrome.tabs.onRemoved.addListener(tabClosed);
      });
    }

    openNextStory();
  }


  // ===========================
  // Start Follow & Like Campaign
  // ===========================
  function startFollowLikeCampaign(onDone) {
    const selectedRows = document.querySelectorAll('#accounts-tbody input[type="checkbox"]:checked');
    if (selectedRows.length === 0) {
      alert("⚠️ No users selected!");
      if (typeof onDone === "function") onDone();
      return;
    }

    let currentIndex = 0;

    async function followLikeNext() {
      if (window.stopCampaignRequested) {
        addLog("🛑 Campaign stopped by user.");
        if (typeof onDone === "function") onDone();
        return;
      }

      // Rate limiting logic
      if (currentIndex > 0 && Settings.waitAfter50Actions && currentIndex % 50 === 0) {
        addLog(`⏳ 50 actions completed. Pausing for ${Settings.waitAfter50Actions} hour(s) to avoid block.`);
        startCountdown(Settings.waitAfter50Actions * 60 * 60, "PAUSE");
        setTimeout(() => {
          if (window.stopCampaignRequested) {
            addLog("🛑 Campaign stopped by user.");
            if (typeof onDone === "function") onDone();
            return;
          }
          followLikeNext();
        }, Settings.waitAfter50Actions * 60 * 60 * 1000);
        return;
      }

      if (currentIndex >= selectedRows.length) {
        setTimeout(() => {
          alert("✅ All accounts followed and first posts liked!");
          const el = document.getElementById('countdownTimer');
          if (el) el.textContent = '';
          if (typeof onDone === "function") onDone();
        }, 500);
        return;
      }

      // Row/user details
      const checkbox = selectedRows[currentIndex];
      const row = checkbox.closest('tr');
      const userId = row.getAttribute('data-userid');
      const username = row.querySelector('td:nth-child(3)')?.innerText?.replace('@', '').trim() || '';
      const isPrivate = row.querySelector('td:nth-child(10)')?.innerText === 'Yes';
      const isAlreadyFollowed = row.querySelector('td:nth-child(9)')?.innerText === 'Yes';
      const waitTime = getConfiguredWaitTime("follow");
      const nextUsername = selectedRows[currentIndex + 1]?.closest('tr')?.querySelector('td:nth-child(3)')?.innerText?.replace('@', '')?.trim() || '';

      if (!userId || !username) {
        setRowCampaignStatus(row, "error", "ERROR");
        addLog("❌ Missing userId or username");
        currentIndex++;
        // Start timer for NEXT user, after skip/error
        startCountdown(Math.round(waitTime / 1000), nextUsername);
        setTimeout(followLikeNext, waitTime);
        return;
      }

      if (isPrivate) {
        setRowCampaignStatus(row, "skip", "SKIPPED");
        addLog(`⚠️ Skipped @${username} — Private account`);
        currentIndex++;
        startCountdown(Math.round(waitTime / 1000), nextUsername);
        setTimeout(followLikeNext, waitTime);
        return;
      }

      addLog(`🚀 Attempting Follow & Like: @${username}`);

      // 1. FOLLOW (if not already followed)
      let followedThisRun = false;
      if (!isAlreadyFollowed) {
        let stopHere = false;
        await new Promise((resolve) => {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || !tabs.length) {
              addLog("❌ No active tab found.");
              setRowCampaignStatus(row, "error", "ERROR");
              currentIndex++;
              resolve();
              stopHere = true;
              return;
            }
            chrome.tabs.sendMessage(tabs[0].id, { type: "FOLLOW_USER", userId }, (response) => {
              if (response?.rateLimit === "soft") {
                addLog(`⚠️ Soft rate limit hit! Pausing for ${Settings.retrySoftRateLimit} minutes.`);
                startCountdown(Settings.retrySoftRateLimit * 60, username);
                setTimeout(followLikeNext, Settings.retrySoftRateLimit * 60 * 1000);
                stopHere = true;
                resolve();
                return;
              }
              if (response?.rateLimit === "429") {
                addLog(`⛔ 429 rate limit! Pausing for ${Settings.retry429RateLimit} minutes.`);
                startCountdown(Settings.retry429RateLimit * 60, username);
                setTimeout(followLikeNext, Settings.retry429RateLimit * 60 * 1000);
                stopHere = true;
                resolve();
                return;
              }
              if (response?.rateLimit === "hard") {
                addLog(`⛔ Hard rate limit! Pausing for ${Settings.retryHardRateLimit} hour(s).`);
                startCountdown(Settings.retryHardRateLimit * 60 * 60, username);
                setTimeout(followLikeNext, Settings.retryHardRateLimit * 60 * 60 * 1000);
                stopHere = true;
                resolve();
                return;
              }
              if (response?.success) {
                followedThisRun = true;
                addLog(`✅ Followed @${username}`);
              } else {
                addLog(`❌ Failed to follow @${username}`);
              }
              resolve();
            });
          });
        });
        if (stopHere) return;
      } else {
        followedThisRun = false; // If already followed, do not mark as followed "this run"
      }

      // 2. LIKE step (always try)
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "OPEN_PROFILE_AND_LIKE", username }, (likeResponse) => {
          let logMsg = "";
          // Show status based on real-time like/follow response
          if (followedThisRun && likeResponse?.success) {
            setRowCampaignStatus(row, "success", "FOLLOWED+LIKED");
            logMsg = `✅ Followed + liked 1st post of @${username}`;
          } else if (followedThisRun && likeResponse?.alreadyLiked) {
            setRowCampaignStatus(row, "success", "FOLLOWED (Already Liked)");
            logMsg = `✅ Followed @${username} (post already liked)`;
          } else if (isAlreadyFollowed && likeResponse?.alreadyLiked) {
            setRowCampaignStatus(row, "skip", "SKIPPED");
            logMsg = `ℹ️ Skipped @${username} (already followed & already liked)`;
          } else if (isAlreadyFollowed && likeResponse?.success) {
            setRowCampaignStatus(row, "success", "LIKED");
            logMsg = `✅ Liked 1st post of @${username} (already followed)`;
          } else if (likeResponse?.success) {
            setRowCampaignStatus(row, "success", "LIKED ONLY");
            logMsg = `✅ Liked 1st post of @${username} (Follow failed)`;
          } else if (likeResponse?.alreadyLiked) {
            setRowCampaignStatus(row, "skip", "ALREADY LIKED");
            logMsg = `ℹ️ Post of @${username} was already liked. Skipping...`;
          } else {
            setRowCampaignStatus(row, "error", "ERROR");
            logMsg = `❌ Failed to follow or like @${username}`;
          }
          addLog(logMsg);

          currentIndex++;
          // === Only now, start timer for NEXT user ===
          startCountdown(Math.round(waitTime / 1000), nextUsername);
          setTimeout(() => {
            if (window.stopCampaignRequested) {
              addLog("🛑 Campaign stopped by user.");
              if (typeof onDone === "function") onDone();
              return;
            }
            followLikeNext();
          }, waitTime);
          resolve();
        });
      });
    }

    // DO NOT start countdown initially; timer starts for next user after like/follow is finished.
    followLikeNext();
  }



  // ===========================
  // Start Like Only Campaign
  // ===========================

  function startLikeOnlyCampaign(onDone) {
    const selectedRows = document.querySelectorAll('#accounts-tbody input[type="checkbox"]:checked');
    if (selectedRows.length === 0) {
      alert("⚠️ No users selected!");
      if (typeof onDone === "function") onDone();
      return;
    }

    let currentIndex = 0;

    function likeOnlyNext() {
      // === STOP BUTTON SUPPORT ===
      if (window.stopCampaignRequested) {
        addLog("🛑 Campaign stopped by user.");
        if (typeof onDone === "function") onDone();
        return;
      }

      if (currentIndex >= selectedRows.length) {
        setTimeout(() => {
          alert("✅ Like Only campaign completed!");
          const el = document.getElementById('countdownTimer');
          if (el) el.textContent = '';
          if (typeof onDone === "function") onDone();
        }, 500);
        return;
      }

      const row = selectedRows[currentIndex].closest('tr');
      const username = row.querySelector('td:nth-child(3)')?.innerText?.replace('@', '').trim();
      const isPrivate = row.querySelector('td:nth-child(10)')?.innerText === 'Yes';
      const waitTime = getConfiguredWaitTime();
      const nextUsername = selectedRows[currentIndex + 1]?.closest('tr')?.querySelector('td:nth-child(3)')?.innerText?.replace('@', '')?.trim() || '';

      // For error or skip, immediately start timer for next user (or just finish)
      const finishOrNext = () => {
        currentIndex++;
        // If last user, finish immediately
        if (currentIndex >= selectedRows.length) {
          setTimeout(() => {
            alert("✅ Like Only campaign completed!");
            const el = document.getElementById('countdownTimer');
            if (el) el.textContent = '';
            if (typeof onDone === "function") onDone();
          }, 500);
          return;
        }
        startCountdown(Math.round(waitTime / 1000), nextUsername);
        setTimeout(likeOnlyNext, waitTime);
      };

      if (!username) {
        addLog("❌ Missing username");
        setRowCampaignStatus(row, "error", "ERROR");
        finishOrNext();
        return;
      }

      if (isPrivate) {
        setRowCampaignStatus(row, "skip", "SKIPPED");
        addLog(`⚠️ Skipped @${username} — Private account`);
        finishOrNext();
        return;
      }

      addLog(`⭐ Like Only: @${username}`);

      chrome.runtime.sendMessage({ type: "OPEN_PROFILE_AND_LIKE", username }, (likeResponse) => {
        if (chrome.runtime.lastError) {
          console.warn("❌ Error sending like-only message:", chrome.runtime.lastError.message);
          setRowCampaignStatus(row, "error", "ERROR");
          finishOrNext();
          return;
        }

        if (likeResponse?.success) {
          setRowCampaignStatus(row, "success", "LIKED");
          addLog(`✅ Liked 1st post of @${username}`);
        } else if (likeResponse?.alreadyLiked) {
          setRowCampaignStatus(row, "skip", "SKIPPED");
          addLog(`ℹ️ Already liked @${username}, skipped.`);
        } else {
          setRowCampaignStatus(row, "error", "ERROR");
          addLog(`❌ Failed to like @${username}`);
        }

        // Now, start countdown and setTimeout for the NEXT user
        finishOrNext();
      });
    }

    // Don't show timer until first user has been processed, to match your new campaign logic.
    likeOnlyNext();
  }

  // =======================================
  // Load Media Queue from Content Script
  // =======================================

  // Event listener for load media from feed 
  document.getElementById('load-feed-media')?.addEventListener('click', () => {
    const limitInput = document.getElementById('media-limit');
    const limit = parseInt(limitInput?.value || 0);

    if (!limit || limit < 1) {
      alert("⚠️ Please enter a valid number in 'Limit Queue' to fetch media posts.");
      return;
    }
    // Show scraping started message
    setMediaScrapingStatus("Scraping Started...", "Please wait while feed posts are being scraped...", true);
    startMediaScrapingCountdown(limit, 10);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (limit) => {
          if (typeof fetchFeedTimelinePosts === "function") {
            fetchFeedTimelinePosts(limit);
          } else {
            console.error('fetchFeedTimelinePosts is not defined.');
          }
        },
        args: [limit]
      });
    });
  });

  // Event listener for load media from Hashtag page
  document.getElementById('load-hashtag-media')?.addEventListener('click', () => {
    const limitInput = document.getElementById('media-limit');
    const limit = parseInt(limitInput?.value || 0);

    if (!limit || limit < 1) {
      alert("⚠️ Please enter a valid number in 'Limit Queue' to fetch media posts.");
      return;
    }
    // Show scraping started message
    setMediaScrapingStatus("Scraping Started...", "Please wait while hashtag page posts are being scraped...", true);
    startMediaScrapingCountdown(limit, 10);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (limit) => {
          if (typeof scrapeHashtagPostsFromSearchPage === "function") {
            scrapeHashtagPostsFromSearchPage(limit);
          } else {
            alert("❌ scrapeHashtagPostsFromSearchPage is not available.");
          }
        },
        args: [limit]
      });
    });
  });

  // Event listener for load media from Location page
  document.getElementById('load-location-media')?.addEventListener('click', () => {
    const limitInput = document.getElementById('media-limit');
    const limit = parseInt(limitInput?.value || 0);

    if (!limit || limit < 1) {
      alert("⚠️ Please enter a valid number in 'Limit Queue' to fetch media posts.");
      return;
    }
    // Show scraping started message
    setMediaScrapingStatus("Scraping Started...", "Please wait while location page posts are being scraped...", true);
    startMediaScrapingCountdown(limit, 3);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: (limit) => {
          if (typeof scrapeLocationPosts === "function") {
            scrapeLocationPosts(limit);
          } else {
            alert("❌ scrapeLocationPosts is not available.");
          }
        },
        args: [limit]
      });
    });
  });


  // Render Media Queue in the table

  function renderMediaQueue(mediaItems) {
    fullMediaQueueData = mediaItems;
    currentMediaPage = 1;
    updateMediaTable();
    stopMediaScrapingCountdown();
    setMediaScrapingStatus("", "", false); // <-- Hide the status box!
    addLog(`✅ Loaded ${mediaItems.length} media posts from feed`);
  }

  function updateMediaTable() {
    const tbody = document.getElementById("media-tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    const start = (currentMediaPage - 1) * mediaRowsPerPage;
    const end = start + mediaRowsPerPage;
    const pageData = fullMediaQueueData.slice(start, end);

    if (!pageData.length) {
      tbody.innerHTML = '<tr><td colspan="9">⚠️ No media found.</td></tr>';
      return;
    }

    // Determine whether media_id is present for this page
    const showMediaId = pageData.some(item => !!item.media_id);

    // Toggle the media_id <th> visibility
    const mediaIdHeader = document.getElementById("media-id-header");
    if (mediaIdHeader) {
      mediaIdHeader.style.display = showMediaId ? "" : "none";
    }

    pageData.forEach((item) => {
      const tr = document.createElement("tr");
      tr.setAttribute('data-mediaid', item.media_id || "");

      tr.innerHTML = `
      <td><input type="checkbox" /></td>
      ${showMediaId ? `<td>${item.media_id}</td>` : ""}
      <td><img src="${item.thumbnail}" width="180px" height="180px" style="border-radius: 4px; margin: 30px" referrerpolicy="no-referrer" crossorigin="anonymous" /></td>
      <td><a href="https://www.instagram.com/${item.username}/" target="_blank">@${item.username}</a></td>
      <td class="stamp-col">${Settings.showStampsInQueue ? item.date_taken : ""}</td>
      <td style="width:100px;">${sanitizeText(item.caption)}</td>
      <td>${item.type}</td>
      <td>${item.comments}</td>
      <td class="likes-col">${Settings.showLikesInQueue && item.likes ? item.likes : ""}</td>
    `;

      tbody.appendChild(tr);
    });

    // Show/hide columns using settings
    document.querySelectorAll('.stamp-col').forEach(col => {
      col.style.display = Settings.showStampsInQueue ? '' : 'none';
    });
    document.querySelectorAll('.likes-col').forEach(col => {
      col.style.display = Settings.showLikesInQueue ? '' : 'none';
    });

    // Update pagination display
    const totalPages = Math.ceil(fullMediaQueueData.length / mediaRowsPerPage);
    document.querySelector("#media-page-info").innerText = `Page ${currentMediaPage} of ${totalPages}`;
    document.querySelector("#media-prev-page").disabled = currentMediaPage <= 1;
    document.querySelector("#media-next-page").disabled = currentMediaPage >= totalPages;
  }

  //Media Queue pagination events
  document.querySelector("#media-prev-page")?.addEventListener("click", () => {
    if (currentMediaPage > 1) {
      currentMediaPage--;
      updateMediaTable();
    }
  });

  document.querySelector("#media-next-page")?.addEventListener("click", () => {
    const totalPages = Math.ceil(fullMediaQueueData.length / mediaRowsPerPage);
    if (currentMediaPage < totalPages) {
      currentMediaPage++;
      updateMediaTable();
    }
  });


  // === Media Queue: Select All / None / Remove Selected ===
  const selectAllMediaCheckbox = document.getElementById('select-all-media-checkbox');

  // Function 1: Toggle all checkboxes when header checkbox clicked
  selectAllMediaCheckbox?.addEventListener('change', () => {
    const checkboxes = document.querySelectorAll('#media-tbody input[type="checkbox"]');
    checkboxes.forEach(checkbox => checkbox.checked = selectAllMediaCheckbox.checked);
  });

  // Function 2: Update header checkbox state based on individual checkbox changes
  document.getElementById('media-tbody')?.addEventListener('change', (e) => {
    if (e.target && e.target.matches('input[type="checkbox"]')) {
      const checkboxes = document.querySelectorAll('#media-tbody input[type="checkbox"]');
      const allUnchecked = Array.from(checkboxes).every(checkbox => !checkbox.checked);

      selectAllMediaCheckbox.checked = !allUnchecked;
      selectAllMediaCheckbox.indeterminate = !allUnchecked;
    }
  });

  // Function 3: Select All from dropdown
  document.getElementById('select-all-media-rows')?.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('#media-tbody input[type="checkbox"]');
    checkboxes.forEach(checkbox => checkbox.checked = true);

    selectAllMediaCheckbox.checked = true;
    selectAllMediaCheckbox.indeterminate = false;
  });

  // Function 4: Select None from dropdown
  document.getElementById('select-none-media-rows')?.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('#media-tbody input[type="checkbox"]');
    checkboxes.forEach(checkbox => checkbox.checked = false);

    selectAllMediaCheckbox.checked = false;
    selectAllMediaCheckbox.indeterminate = false;
  });

  // Function 5: Remove Selected from dropdown
  document.getElementById('remove-selected-media-rows')?.addEventListener('click', () => {
    const checkboxes = document.querySelectorAll('#media-tbody input[type="checkbox"]:checked');
    checkboxes.forEach(checkbox => checkbox.closest('tr')?.remove());

    const allCheckboxes = document.querySelectorAll('#media-tbody input[type="checkbox"]');
    const allUnchecked = Array.from(allCheckboxes).every(cb => !cb.checked);

    selectAllMediaCheckbox.checked = !allUnchecked;
    selectAllMediaCheckbox.indeterminate = !allUnchecked;
  });


  //==================================================
  // Media Queue Campaign Functionalities
  //==================================================

  // --- Only define once globally ---
  let isMediaQueueLiking = false;
  let stopMediaQueueLikeRequested = false;

  // Reuse or define this if not available
  function setMediaRowStatus(row, type, msg) {
    row.classList.remove('success-row', 'skip-row', 'error-row');
    if (type === "success") row.classList.add('success-row');
    else if (type === "skip") row.classList.add('skip-row');
    else if (type === "error") row.classList.add('error-row');
    const td = row.querySelector('td');
    if (td) td.innerHTML = `<span class="campaign-status-msg">${msg}</span>`;
  }

  // Your Like Media Queue button should have id="like-media-queue-btn"
  const likeMediaBtn = document.getElementById('like-media-queue-btn');
  likeMediaBtn?.addEventListener('click', () => {
    // === STOP if already running ===
    if (isMediaQueueLiking) {
      stopMediaQueueLikeRequested = true;
      likeMediaBtn.disabled = true;
      likeMediaBtn.innerText = "Stopping...";
      return; // Will exit after current like
    }

    // === START ===
    const rows = document.querySelectorAll('#media-tbody tr');
    const selectedIndexes = Array.from(rows).reduce((acc, row, idx) => {
      const isChecked = row.querySelector('input[type="checkbox"]')?.checked;
      if (isChecked) acc.push(idx);
      return acc;
    }, []);

    if (selectedIndexes.length === 0) {
      alert("⚠️ No media selected!");
      return;
    }

    let currentIndex = 0;
    isMediaQueueLiking = true;
    stopMediaQueueLikeRequested = false;
    likeMediaBtn.classList.add("stop-processing");
    likeMediaBtn.innerText = "🛑 Stop Processing";
    likeMediaBtn.disabled = false;

    function finalizeMediaLikeBtn() {
      isMediaQueueLiking = false;
      stopMediaQueueLikeRequested = false;
      likeMediaBtn.disabled = false;
      likeMediaBtn.classList.remove("stop-processing");
      likeMediaBtn.innerText = "❤️ Like Media Queue";
      const el = document.getElementById('countdownTimer');
      if (el) el.textContent = '';
    }

    function likeNext() {
      // === STOP SUPPORT ===
      if (stopMediaQueueLikeRequested) {
        finalizeMediaLikeBtn();
        return;
      }

      // === FINISHED ===
      if (currentIndex >= selectedIndexes.length) {
        setTimeout(() => {
          alert("✅ Like Media Queue completed!");
          finalizeMediaLikeBtn();
        }, 500);
        return;
      }

      // === Row/Post Details ===
      const rowIndex = selectedIndexes[currentIndex];
      const row = rows[rowIndex];
      const mediaItem = fullMediaQueueData[rowIndex];
      const username = mediaItem?.username || 'user';
      const mediaId = mediaItem?.media_id || null;
      const postIndex = mediaItem?.postIndex;
      const postUrl = mediaItem?.post_url || '';
      const waitTime = getConfiguredWaitTime("follow");
      const nextUsername = fullMediaQueueData[selectedIndexes[currentIndex + 1]]?.username || '';

      // === Prepare Content Script Message ===
      let message = null;
      if (mediaId && !postIndex) {
        message = { type: "LIKE_MEDIA_POST", mediaId };
      } else if (typeof postIndex === "number") {
        const isLocation = postUrl.includes("/explore/locations/");
        message = {
          type: isLocation ? "LIKE_LOCATION_MODAL" : "LIKE_HASHTAG_MODAL",
          index: postIndex
        };
      }

      // === No message = can't process ===
      if (!message) {
        setMediaRowStatus(row, "error", "ERROR");
        currentIndex++;
        startCountdown(Math.round(waitTime / 1000), nextUsername);
        setTimeout(() => {
          if (stopMediaQueueLikeRequested) {
            finalizeMediaLikeBtn();
            return;
          }
          likeNext();
        }, waitTime);
        return;
      }

      // === Main like action ===
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ["content/content-script.js"]
        }, () => {
          chrome.tabs.sendMessage(tabs[0].id, message, (res) => {
            if (chrome.runtime.lastError) {
              setMediaRowStatus(row, "error", "ERROR");
            } else if (res?.success) {
              setMediaRowStatus(row, "success", "LIKED");
            } else {
              setMediaRowStatus(row, "error", "ERROR");
            }
            currentIndex++;
            // === Only now, start timer for NEXT media ===
            startCountdown(Math.round(waitTime / 1000), nextUsername);
            setTimeout(() => {
              if (stopMediaQueueLikeRequested) {
                finalizeMediaLikeBtn();
                return;
              }
              likeNext();
            }, waitTime);
          });
        });
      });
    }

    likeNext();
  });

  

});

