//Copyright (c) 2025 Outreach Machine . All rights reserved.



/*CONTENT SCRIPT FILE*/

// This script runs in the context of the web page and can interact with the DOM.
// It is injected by the extension and can communicate with the background script.


// 🚀 Inject Bot Toggle Button if not already added



if (!document.getElementById('insta-bot-toggle')) {
  const toggleBtn = document.createElement('div');
  toggleBtn.id = 'insta-bot-toggle';
  toggleBtn.innerHTML = `<img src="${chrome.runtime.getURL('assets/icon48.png')}" alt="Bot" />`;

  // 🔧 Style the floating icon so it’s always visible
  Object.assign(toggleBtn.style, {
    position: 'fixed',
    top: '10px',
    right: '20px',
    zIndex: '10000',
    width: '60px',
    height: '60px',
    cursor: 'pointer',
    backgroundColor: 'transparent',
    borderRadius: '50%',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  });

  document.body.appendChild(toggleBtn);

  // 🖼️ Create overlay iframe for full UI
  const overlay = document.createElement('iframe');
  overlay.id = 'insta-bot-ui';
  overlay.src = chrome.runtime.getURL('ui/index.html');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    border: 'none',
    zIndex: '9999',
    display: 'none',
  });
  document.body.appendChild(overlay);

  // ❌ Create close button for the iframe overlay
  const closeButton = document.createElement('div');
  closeButton.id = 'insta-bot-close';
  closeButton.innerText = 'X';
  Object.assign(closeButton.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    fontSize: '20px',
    color: '#fff',
    backgroundColor: 'red',
    width: '30px',
    height: '30px',
    textAlign: 'center',
    lineHeight: '30px',
    borderRadius: '50%',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.2)',
    cursor: 'pointer',
    zIndex: '2147483647', // super high
    display: 'none'
  });
  document.body.appendChild(closeButton);

  // 📂 Open the extension UI
  toggleBtn.addEventListener('click', () => {
    overlay.style.display = 'block';
    overlay.style.pointerEvents = 'auto';
    closeButton.style.display = 'block';
    toggleBtn.style.display = 'none';
  });

  // ❌ Close the extension UI
  closeButton.addEventListener('click', () => {
    overlay.style.display = 'none';
    overlay.style.pointerEvents = 'none';
    closeButton.style.display = 'none';
    toggleBtn.style.display = 'flex';
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "openInstaBotUI") {
    const overlay = document.getElementById('insta-bot-ui');
    const closeButton = document.getElementById('insta-bot-close');
    const toggleBtn = document.getElementById('insta-bot-toggle');
    if (overlay && closeButton && toggleBtn) {
      overlay.style.display = 'block';
      overlay.style.pointerEvents = 'auto';
      closeButton.style.display = 'block';
      toggleBtn.style.display = 'none';
    }
  }
});



// Default scraper settings, can be overridden by user settings

let ScraperSettings = {
  waitAfterFollow: 60,
  waitAfterSkip: 1,
  randomizeWait: 0,
  retrySoftRateLimit: 10,
  retryHardRateLimit: 1,
  retry429RateLimit: 10,
  retryAfter404: 10,
  waitAfter50Actions: 24
};
chrome.storage.sync.get('instabot_settings', (data) => {
  if (data.instabot_settings) {
    ScraperSettings = { ...ScraperSettings, ...data.instabot_settings };
    console.log("[InstaBot] ScraperSettings loaded:", ScraperSettings);
  }
});

// Helper for settings-based waits
function getScraperWait(baseType = "follow") {
  let base = 1000 * (baseType === "skip" ? ScraperSettings.waitAfterSkip : ScraperSettings.waitAfterFollow);
  let rand = ScraperSettings.randomizeWait || 0;
  if (rand > 0) {
    const maxExtra = Math.floor(base * rand / 100);
    base += Math.floor(Math.random() * (maxExtra + 1));
  }
  return base;
}

// Helper for per-user enrichment pause (2-3 seconds randomized)
function waitBetweenUsers() {
  return new Promise(res => setTimeout(res, 2000 + Math.floor(Math.random() * 1000)));
}



//=================================================
// Instagram Accounts Scraping Script
//=================================================


// First get instagram username from the URL
function getInstagramUsername() {
  const path = window.location.pathname;

  // If we're on a profile page: e.g., /cristiano/
  const match = path.match(/^\/([^\/\?\#]+)\/?$/);
  if (match && !['explore', 'accounts', 'direct', 'reels'].includes(match[1])) {
    return match[1];
  }

  return null;
}

// Send the username to popup when page loads or changes via SPA
function sendUsernameToPopup() {
  const username = getInstagramUsername();
  chrome.runtime.sendMessage({ type: "INSTAGRAM_USERNAME", username });
}

// Send username immediately
sendUsernameToPopup();

// Watch for SPA navigation changes on Instagram (client-side routing)
if (!window._instaObserverInitialized) {
  const observer = new MutationObserver(() => sendUsernameToPopup());
  observer.observe(document.body, { childList: true, subtree: true });
  window._instaObserverInitialized = true;
}



// Get CSRF token from browser cookies
function getCsrfFromCookie() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1] || '';
}



//Convert Instagram post/reel shortcode to numeric media ID
function shortcodeToInstaID(shortcode) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  let id = BigInt(0);
  for (let i = 0; i < shortcode.length; i++) {
    id = id * 64n + BigInt(alphabet.indexOf(shortcode[i]));
  }
  return id.toString();
}

//Search for user ID from username using Instagram topsearch API
async function fetchUserId(username) {
  const res = await fetch(`https://www.instagram.com/web/search/topsearch/?query=${username}`);
  const data = await res.json();
  const user = data.users.find(u => u.user.username.toLowerCase() === username.toLowerCase());
  return user?.user?.pk || null;
}

// =================================
// Scrape Followers from Profile
// =================================

// Fetch followers using GraphQL query

async function fetchFollowers(userId, after = null) {
  const variables = {
    id: userId,
    include_reel: false,
    fetch_mutual: true,
    first: 50,
    after: after
  };

  const url = `https://www.instagram.com/graphql/query/?query_hash=c76146de99bb02f6415203be841dd25a&variables=${encodeURIComponent(JSON.stringify(variables))}`;
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json();
  return data;
}


// Utility: Fetch full profile details for username
async function fetchProfileDetails(username) {
  try {
    const res = await fetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`, {
      credentials: 'include',
      headers: {
        'x-ig-app-id': '936619743392459'
      }
    });
    const json = await res.json();
    return json?.data?.user || {};
  } catch (e) {
    return {};
  }
}


let scrapeCooldownActive = false;

// Helper to send status to popup
function reportScrapingStatus(heading, detail, forTab) {
  chrome.runtime.sendMessage({
    type: "SCRAPING_STATUS",
    heading,
    detail,
    forTab
  });
}

// Helper for live countdown and user message
function showUserCountdownStatus(scrapedUser, scrapedIndex, total, seconds, callback) {
  let remaining = seconds;
  reportScrapingStatus(
    "Scraping in progress...",
    `Scraped @${scrapedUser} (${scrapedIndex}/${total}). Next user will be scraped in (${remaining}s)`
  );
  const interval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(interval);
      callback();
    } else {
      reportScrapingStatus(
        "Scraping in progress...",
        `Scraped @${scrapedUser} (${scrapedIndex}/${total}). Next user will be scraped in (${remaining}s)`
      );
    }
  }, 1000);
}

async function scrapeFollowers(limit = 50, mode = "full") {
  if (scrapeCooldownActive) {
    reportScrapingStatus("Please wait...", "Please wait a few minutes before scraping again, to avoid being blocked.");
    return;
  }

  scrapeCooldownActive = true;

  // Show countdown BEFORE first scrape (3 seconds)
  await new Promise(res => {
    let remaining = 3;
    reportScrapingStatus("Scraping will start soon...", `Starting in (${remaining}s)`);
    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        res();
      } else {
        reportScrapingStatus("Scraping will start soon...", `Starting in (${remaining}s)`);
      }
    }, 1000);
  });


  const username = getInstagramUsername();
  if (!username) {
    scrapeCooldownActive = false;
    reportScrapingStatus("Error!", "You must be on a profile page to scrape followers.");
    setTimeout(() => reportScrapingStatus("", "", false), 5000);
    return;
  }
  const userId = await fetchUserId(username);
  if (!userId) {
    scrapeCooldownActive = false;
    reportScrapingStatus("Error!", "Could not find user ID.");
    setTimeout(() => reportScrapingStatus("", "", false), 5000);
    return;
  }

  let hasNextPage = true;
  let after = null;
  let collected = [];
  let actionCount = 0;
  let stopped = false;

  // Show initial progress (0 scraped)
  reportScrapingStatus("Scraping in progress...", `Scraped 0/${limit} users so far...`);

  while (hasNextPage && collected.length < limit) {
    let followersData;
    let fetchError = null;

    try {
      followersData = await fetchFollowers(userId, after);
    } catch (err) {
      fetchError = err;
    }

    // --- Show errors live in popup status panel only for REAL errors ---
    if (fetchError?.status === 429 || followersData?.status === 429) {
      reportScrapingStatus(
        "⛔ 429 Rate Limit!",
        `Instagram is blocking requests. Pausing for ${ScraperSettings.retry429RateLimit} minute(s). Results may be incomplete.`
      );
      await new Promise(res => setTimeout(res, ScraperSettings.retry429RateLimit * 60 * 1000));
      stopped = true; break;
    }
    if (fetchError || (followersData?.message && /(please wait|temporarily|limit|blocked)/i.test(followersData.message))) {
      reportScrapingStatus(
        "⚠️ Instagram is limiting requests!",
        "Instagram is limiting requests. Please try again later. Results may be incomplete."
      );
      stopped = true; break;
    }
    if (followersData && followersData.status && followersData.status >= 400 && followersData.status !== 429) {
      reportScrapingStatus(
        "❌ Bad request!",
        `Bad request (${followersData.status}). Some data may be missing.`
      );
      stopped = true; break;
    }

    const edges = followersData?.data?.user?.edge_followed_by?.edges || [];
    if (!edges.length) break;
    collected = [...collected, ...edges.map(e => e.node)];
    const pageInfo = followersData?.data?.user?.edge_followed_by?.page_info;
    hasNextPage = pageInfo?.has_next_page;
    after = pageInfo?.end_cursor;

    actionCount++;
    reportScrapingStatus(
      "Scraping in progress...",
      `Scraped ${collected.length}/${limit} users so far...`
    );

    // After every 50 actions, long pause and alert user
    if (actionCount > 0 && ScraperSettings.waitAfter50Actions && actionCount % 50 === 0) {
      reportScrapingStatus(
        "Pause for Safety",
        `50 users scraped. For safety, the bot will pause for ${ScraperSettings.waitAfter50Actions} hour(s).`
      );
      await new Promise(res => setTimeout(res, ScraperSettings.waitAfter50Actions * 60 * 60 * 1000));
    }
  }
  collected = collected.slice(0, limit);

  if (collected.length === 0) {
    reportScrapingStatus(
      "No followers scraped!",
      "No followers could be scraped. Possible reasons: private account, not logged in, API change, or rate limiting."
    );
    setTimeout(() => reportScrapingStatus("", "", false), 7000);
    scrapeCooldownActive = false;
    return;
  }

  // Enrich each with full profile details, show progress and 3s countdown between users
  const allUsers = [];
  for (let i = 0; i < collected.length; i++) {
    const node = collected[i];
    let details = {};
    let retry404 = 0;
    while (retry404 < ScraperSettings.retryAfter404) {
      try {
        details = await fetchProfileDetails(node.username);
        break;
      } catch (e) {
        retry404++;
        if (retry404 >= ScraperSettings.retryAfter404) {
          details = {};
        } else {
          await new Promise(res => setTimeout(res, 2000));
        }
      }
    }


    if (mode === "light") {
      allUsers.push({
        id: node.id || "—",
        username: node.username || "—",
        profile_pic: node.profile_pic_url || "—",
        full_name: details.full_name || node.full_name || "—",

        has_anonymous_profile_picture: typeof node.has_anonymous_profile_picture === "boolean"
          ? node.has_anonymous_profile_picture
          : undefined
      });
    }
    else {
      allUsers.push({
        username: node.username || "—",

        full_name: details.full_name || node.full_name || "—",
        profile_pic: details.profile_pic_url || node.profile_pic_url || "—",
        has_anonymous_profile_picture: (typeof node.has_anonymous_profile_picture === "boolean"
          ? node.has_anonymous_profile_picture
          : undefined),
        id: node.id || "—",
        is_private: (typeof details.is_private === "boolean" ? details.is_private : node.is_private) ?? "—",
        is_verified: (typeof details.is_verified === "boolean" ? details.is_verified : node.is_verified) ?? "—",
        bio: details.biography || "—",
        posts: details.media_count ?? details.edge_owner_to_timeline_media?.count ?? "—",
        followers: details.follower_count ?? details.edge_followed_by?.count ?? "—",
        following: details.following_count ?? details.edge_follow?.count ?? "—",
        business_category: details.category_name || details.business_category_name || "—",
      
        follows_me: (details.follows_viewer ?? node.follows_viewer) ? "Yes" : "No",
        followed_by_me: (details.followed_by_viewer ?? node.followed_by_viewer) ? "Yes" : "No",
        is_mutual: ((details.friendship_status?.following && details.friendship_status?.followed_by) ? "Yes" : "No")
      });

    }



    // Show which user is scraped, and countdown to next user if not last
    if (i < collected.length - 1) {
      await new Promise(res => {
        showUserCountdownStatus(
          node.username,
          i + 1,
          collected.length,
          10, // 3 seconds countdown
          res
        );
      });
    } else {
      // Last user, just show progress
      reportScrapingStatus(
        "Scraping in progress...",
        `Scraped @${node.username} (${i + 1}/${collected.length}).`
      );
    }
  }

  chrome.runtime.sendMessage({
    type: "FOLLOWERS_DATA",
    data: allUsers,
    from: username,
    forTab: "accounts"
  });

  // After scrape, cooldown for 2–3 minutes before next scrape can start
  setTimeout(() => {
    scrapeCooldownActive = false;
  }, 2 * 60 * 1000 + Math.floor(Math.random() * 60000)); // 2-3 min

  // Show done status for 5 seconds, then hide
  if (stopped) {
    setTimeout(() => reportScrapingStatus("", "", false), 5000);
  } else {
    reportScrapingStatus(
      "Scraping completed!",
      `Scraped ${allUsers.length} users.`
    );
    setTimeout(() => reportScrapingStatus("", "", false), 5000);
  }
}

window.scrapeFollowers = scrapeFollowers

// --- Fetch the following list (paginated)
async function fetchFollowing(userId, after = null) {
  const variables = {
    id: userId,
    include_reel: false,
    fetch_mutual: true,
    first: 50,
    after: after
  };
  const url = `https://www.instagram.com/graphql/query/?query_hash=c56ee0ae1f89cdbd1c89e2bc6b8f3d18&variables=${encodeURIComponent(JSON.stringify(variables))}`;
  const res = await fetch(url, { credentials: "include" });
  const data = await res.json();
  return data;
}

// --- Main: Scrape and send following list (with full details)

async function scrapeFollowing(limit = 50, mode = "full") {
  let scrapeCooldownActive = false;
  if (scrapeCooldownActive) {
    reportScrapingStatus("Please wait...", "Please wait a few minutes before scraping again, to avoid being blocked. (3s)");
    return;
  }
  scrapeCooldownActive = true;

  // Countdown before first scrape
  await new Promise(res => {
    let remaining = 3;
    reportScrapingStatus("Scraping will start soon...", `Starting in (${remaining}s)`);
    const interval = setInterval(() => {
      remaining--;
      if (remaining <= 0) {
        clearInterval(interval);
        res();
      } else {
        reportScrapingStatus("Scraping will start soon...", `Starting in (${remaining}s)`);
      }
    }, 1000);
  });

  const username = getInstagramUsername();
  if (!username) {
    scrapeCooldownActive = false;
    reportScrapingStatus("Error!", "You must be on a profile page to scrape following.");
    setTimeout(() => reportScrapingStatus("", "", false), 5000);
    return;
  }
  const userId = await fetchUserId(username);
  if (!userId) {
    scrapeCooldownActive = false;
    reportScrapingStatus("Error!", "Could not find user ID.");
    setTimeout(() => reportScrapingStatus("", "", false), 5000);
    return;
  }

  let hasNextPage = true;
  let after = null;
  let collected = [];
  let stopped = false;

  // Initial status
  reportScrapingStatus("Scraping in progress...", `Scraped 0/${limit} users so far...`);

  while (hasNextPage && collected.length < limit) {
    let followingData;
    let fetchError = null;

    try {
      followingData = await fetchFollowing(userId, after);
    } catch (err) {
      fetchError = err;
    }

    // --- Handle API errors/blocks ---
    if (fetchError?.status === 429 || followingData?.status === 429) {
      reportScrapingStatus(
        "⛔ 429 Rate Limit!",
        `Instagram is blocking requests. Pausing for ${ScraperSettings.retry429RateLimit} minute(s). Results may be incomplete.`
      );
      await new Promise(res => setTimeout(res, ScraperSettings.retry429RateLimit * 60 * 1000));
      stopped = true; break;
    }
    if (fetchError || (followingData?.message && /(please wait|temporarily|limit|blocked)/i.test(followingData.message))) {
      reportScrapingStatus(
        "⚠️ Instagram is limiting requests!",
        "Instagram is limiting requests. Please try again later. Results may be incomplete."
      );
      stopped = true; break;
    }
    if (followingData && followingData.status && followingData.status >= 400 && followingData.status !== 429) {
      reportScrapingStatus(
        "❌ Bad request!",
        `Bad request (${followingData.status}). Some data may be missing.`
      );
      stopped = true; break;
    }

    const edges = followingData?.data?.user?.edge_follow?.edges || [];
    if (!edges.length) break;

    for (const { node } of edges) {
      let details = null;
      let retry404 = 0;
      while (retry404 < (ScraperSettings.retryAfter404 || 5)) {
        try {
          details = await fetchProfileDetails(node.username);
          break;
        } catch (err) {
          retry404++;
          if (retry404 >= (ScraperSettings.retryAfter404 || 5)) {
            details = null;
          } else {
            await new Promise(res => setTimeout(res, 2000));
          }
        }
      }

      if (mode === "light") {
        collected.push({
          id: node.id,
          username: node.username,
          full_name: node.full_name || "",

          profile_pic: node.profile_pic_url || "",
          has_anonymous_profile_picture: typeof node.has_anonymous_profile_picture === "boolean"
            ? node.has_anonymous_profile_picture
            : undefined

        })
      }
      else {
        collected.push({

          username: node.username,
          full_name: node.full_name || "",
          profile_pic: node.profile_pic_url || "",
          has_anonymous_profile_picture: (typeof node.has_anonymous_profile_picture === "boolean"
            ? node.has_anonymous_profile_picture
            : undefined),
          is_private: node.is_private,
          is_verified: node.is_verified,
          id: node.id,
          bio: details?.biography ?? node.biography ?? "—",
          posts: details?.media_count ?? details?.edge_owner_to_timeline_media?.count ?? "—",
          followers: details?.follower_count ?? details?.edge_followed_by?.count ?? "—",
          following: details?.following_count ?? details?.edge_follow?.count ?? "—",
          follows_me: (details?.follows_viewer ?? node?.follows_viewer) ? "Yes" : "No",
          followed_by_me: (details?.followed_by_viewer ?? node?.followed_by_viewer) ? "Yes" : "No",
          is_mutual: (node.followed_by_viewer || details?.friendship_status?.followed_by) ? "Yes" : "No",
          business_category:
            details?.business_category_name ||
            details?.overall_category_name ||
            details?.category_name ||
            details?.category ||
            node.business_category_name ||
            "—",
      
        });
      }


      // Show which user is scraped, and countdown to next user if not last
      if (collected.length < limit) {
        if (collected.length < limit && !(collected.length === edges.length && !hasNextPage)) {
          await new Promise(res => {
            showUserCountdownStatus(
              node.username,
              collected.length,
              limit,
              10, // 3 seconds countdown
              res
            );
          });
        } else {
          // Last user, just show progress
          reportScrapingStatus(
            "Scraping in progress...",
            `Scraped @${node.username} (${collected.length}/${limit}).`
          );
        }
      }
      if (collected.length >= limit) break;
    }

    const pageInfo = followingData?.data?.user?.edge_follow?.page_info;
    hasNextPage = pageInfo?.has_next_page;
    after = pageInfo?.end_cursor;
  }

  // Limit to requested amount
  const sliced = collected.slice(0, limit);

  if (sliced.length === 0) {
    reportScrapingStatus(
      "No following scraped!",
      "No following could be scraped. Possible reasons: private account, not logged in, API change, or rate limiting."
    );
    setTimeout(() => reportScrapingStatus("", "", false), 7000);
    scrapeCooldownActive = false;
    return;
  }

  chrome.runtime.sendMessage({
    type: "FOLLOWING_DATA",
    data: sliced,
    from: username,
    forTab: "accounts"
  });

  // After scrape, cooldown for 2–3 minutes before next scrape can start
  setTimeout(() => {
    scrapeCooldownActive = false;
  }, 2 * 60 * 1000 + Math.floor(Math.random() * 60000)); // 2-3 min

  // Show done status for 5 seconds, then hide
  if (stopped) {
    setTimeout(() => reportScrapingStatus("", "", false), 5000);
  } else {
    reportScrapingStatus(
      "Scraping completed!",
      `Scraped ${sliced.length} users.`
    );
    setTimeout(() => reportScrapingStatus("", "", false), 5000);
  }
}

// --- Make globally accessible
window.scrapeFollowing = scrapeFollowing;
// =================================
// Scrape Likers from Current Post
// ================================
// Fetch full profile info for a username (used for enrichment)

async function scrapeLikersFromCurrentPost(limit = 50, mode = "full") {
  // Parse shortcode from URL
  const url = window.location.href;
  let shorty;
  if (url.includes('/p/')) {
    shorty = url.split('/p/')[1].split('/')[0];
  } else if (url.includes('/reel/')) {
    shorty = url.split('/reel/')[1].split('/')[0];
  } else {
    reportScrapingStatus("Error!", "You must be on a post or reel page.");
    setTimeout(() => reportScrapingStatus("", "", false), 5000);
    return;
  }

  const mediaId = shortcodeToInstaID(shorty);
  const csrfToken = getCsrfFromCookie();

  try {
    reportScrapingStatus("Scraping is starting...", "Fetching list of likers...");
    let users = [];
    let max_id = null;
    let fetchedCount = 0;

    while (users.length < limit) {
      let endpoint = `https://www.instagram.com/api/v1/media/${mediaId}/likers/`;
      if (max_id) endpoint += `?max_id=${max_id}`;
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "X-Csrftoken": csrfToken,
          "x-instagram-ajax": "1010212815",
          "x-asbd-id": "129477",
          "x-ig-app-id": "936619743392459"
        },
        credentials: "include"
      });

      const data = await response.json();
      if (!data?.users?.length) break;
      users = users.concat(data.users);
      max_id = data.next_max_id;
      if (!max_id) break;
    }

    // Slice to requested limit
    const sliced = users.slice(0, limit);

    // OPTIONAL: Enrich each liker with profile info
    const finalUsers = [];
    for (let i = 0; i < sliced.length; i++) {
      const user = sliced[i];
      let details = {};
      try {
        details = await fetchProfileDetails(user.username);
      } catch (e) {
        details = {};
      }

      if (mode === "light") {
        finalUsers.push({
          id: user.pk || details.id || "—",
          username: user.username || "—",
          full_name: details.full_name || user.full_name || "—",
          profile_pic: details.profile_pic_url || user.profile_pic_url || "—",
          has_anonymous_profile_picture: typeof user.has_anonymous_profile_picture === "boolean"
            ? user.has_anonymous_profile_picture
            : undefined
        });
      } else {
        finalUsers.push({
          username: user.username || "—",
          full_name: details.full_name || user.full_name || "—",
          profile_pic: details.profile_pic_url || user.profile_pic_url || "—",
          has_anonymous_profile_picture: typeof user.has_anonymous_profile_picture === "boolean"
            ? user.has_anonymous_profile_picture
            : undefined,
          id: user.pk || details.id || "—",
          is_private: typeof details.is_private === "boolean" ? details.is_private : user.is_private ?? "—",
          is_verified: typeof details.is_verified === "boolean" ? details.is_verified : user.is_verified ?? "—",
          bio: details.biography || "—",
          posts: details.media_count ?? details.edge_owner_to_timeline_media?.count ?? "—",
          followers: details.follower_count ?? details.edge_followed_by?.count ?? "—",
          following: details.following_count ?? details.edge_follow?.count ?? "—",
          business_category: details.category_name || details.business_category_name || "—",
          last_posted: details.edge_owner_to_timeline_media?.edges?.[0]?.node?.taken_at_timestamp
            ? new Date(details.edge_owner_to_timeline_media.edges[0].node.taken_at_timestamp * 1000).toLocaleString()
            : "—",
        
          follows_me: (details.follows_viewer ?? user.follows_viewer) ? "Yes" : "No",
          followed_by_me: (details.followed_by_viewer ?? user.followed_by_viewer) ? "Yes" : "No",
          is_mutual: (user.friendship_status?.followed_by && user.friendship_status?.following) ? "Yes" : "No"
        });
      }

      // Show which user is scraped, and countdown to next user if not last
      if (i < sliced.length - 1) {
        await new Promise(res => {
          showUserCountdownStatus(
            user.username,
            i + 1,
            sliced.length,
            10,
            res
          );
        });
      } else {
        reportScrapingStatus(
          "Scraping in progress...",
          `Scraped @${user.username} (${i + 1}/${sliced.length}).`
        );
      }
    }

    chrome.runtime.sendMessage({
      type: "LIKERS_DATA",
      data: finalUsers,
      from: shorty,
      forTab: "accounts"
    });

    reportScrapingStatus(
      "Scraping completed!",
      `Scraped ${finalUsers.length} users.`
    );
    setTimeout(() => reportScrapingStatus("", "", false), 5000);

  } catch (err) {
    reportScrapingStatus("Failed!", "Failed to fetch likers: " + err.message);
    setTimeout(() => reportScrapingStatus("", "", false), 7000);
    console.error(err);
  }
}

window.scrapeLikersFromCurrentPost = scrapeLikersFromCurrentPost;



// ====================================
// Scrape Commenters from Current Post
// ====================================

// Helper: Convert Instagram shortcode to numeric media ID for v1 endpoints
function shortcodeToInsta(shortcode) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let id = 0;
    for (let i = 0; i < shortcode.length; i++) {
        id = id * 64 + alphabet.indexOf(shortcode[i]);

    }
    
    return id.toString();
}

// Main function: scrape all commenters with proper pagination
async function scrapeCommentersFromCurrentPost(limit = 50, mode = "full") {
  // Extract shortcode from URL
  const url = window.location.href;
  let shorty;
  if (url.includes('/p/')) {
    shorty = url.split('/p/')[1].split('/')[0];
  } else if (url.includes('/reel/')) {
    shorty = url.split('/reel/')[1].split('/')[0];
  } else {
    reportScrapingStatus("Error!", "You must be on a post or reel page.");
    setTimeout(() => reportScrapingStatus("", "", false), 5000);
    return;
  }

  const query_hash = "97b41c52301f77ce508f55e66d17620e";
  let after = null;
  let count = 0;
  let users = [];
  let has_next_page = true;
  const csrfToken = getCsrfFromCookie();

  try {
    reportScrapingStatus("Scraping is starting...", "Fetching list of commenters...");
    while (has_next_page && count < limit) {
      const first = Math.min(50, limit - count);
      const variables = encodeURIComponent(JSON.stringify({
        shortcode: shorty,
        first,
        after
      }));

      const fetchUrl = `https://www.instagram.com/graphql/query/?query_hash=${query_hash}&variables=${variables}`;

      const response = await fetch(fetchUrl, {
        method: "GET",
        credentials: "include",
        headers: {
          "X-Csrftoken": csrfToken,
          "x-instagram-ajax": "1010212815",
          "x-asbd-id": "129477",
          "x-ig-app-id": "936619743392459"
        }
      });
      const data = await response.json();
      const edge = data.data.shortcode_media.edge_media_to_parent_comment;
      if (!edge || !edge.edges.length) break;

      for (let i = 0; i < edge.edges.length && count < limit; i++) {
        const c = edge.edges[i].node;
        const user = c.owner;
        let details = {};
        try {
          details = await fetchProfileDetails(user.username);
        } catch (e) {
          details = {};
        }

        // Prepare user object
        if (mode === "light") {
          users.push({
            id: user.id || details.id || "—",
            full_name: details.full_name || user.full_name || "—",
            username: user.username || "—",
            profile_pic: details.profile_pic_url || user.profile_pic_url || "—",
            has_anonymous_profile_picture: typeof user.has_anonymous_profile_picture === "boolean"
              ? user.has_anonymous_profile_picture
              : undefined
          });
        } else {
          users.push({
            username: user.username || "—",
            full_name: details.full_name || user.full_name || "—",
            profile_pic: details.profile_pic_url || user.profile_pic_url || "—",
            has_anonymous_profile_picture: typeof user.has_anonymous_profile_picture === "boolean"
              ? user.has_anonymous_profile_picture
              : undefined,
            id: user.id || details.id || "—",
            is_private: typeof details.is_private === "boolean" ? details.is_private : user.is_private ?? "—",
            is_verified: typeof details.is_verified === "boolean" ? details.is_verified : user.is_verified ?? "—",
            bio: details.biography || "—",
            posts: details.media_count ?? details.edge_owner_to_timeline_media?.count ?? "—",
            followers: details.follower_count ?? details.edge_followed_by?.count ?? "—",
            following: details.following_count ?? details.edge_follow?.count ?? "—",
            business_category: details.category_name || details.business_category_name || "—",
           
            follows_me: (details.follows_viewer ?? user.follows_viewer) ? "Yes" : "No",
            followed_by_me: (details.followed_by_viewer ?? user.followed_by_viewer) ? "Yes" : "No",
            is_mutual: (user.friendship_status?.followed_by && user.friendship_status?.following) ? "Yes" : "No"
          });
        }

        // Show progress & apply 10s delay between users (except last)
        if (count < limit - 1) {
          await new Promise(res => {
            showUserCountdownStatus(
              user.username,
              count + 1,
              limit,
              10,
              res // callback after countdown (10s)
            );
          });
        } else {
          reportScrapingStatus(
            "Scraping in progress...",
            `Scraped @${user.username} (${count + 1}/${limit}).`
          );
        }
        count++;
      }

      has_next_page = edge.page_info.has_next_page;
      after = edge.page_info.end_cursor;
    }

    chrome.runtime.sendMessage({
      type: "COMMENTERS_DATA",
      data: users,
      from: shorty,
      forTab: "accounts"
    });

    reportScrapingStatus(
      "Scraping completed!",
      `Scraped ${users.length} users.`
    );
    setTimeout(() => reportScrapingStatus("", "", false), 5000);

  } catch (err) {
    reportScrapingStatus("Failed!", "Failed to fetch comments: " + err.message);
    setTimeout(() => reportScrapingStatus("", "", false), 7000);
    console.error(err);
  }
}
window.scrapeCommentersFromCurrentPost = scrapeCommentersFromCurrentPost;



//========== PROCESSING THE ACCOUNTS QUEUE ==========//


// =============================================
// Follow User Campaign 
// =============================================

// 📥 Function to Follow a User Quietly
async function followUser(userId) {
  try {
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];

    if (!csrfToken) {
      console.error("❌ CSRF token not found. Cannot follow user.");
      return false;
    }

    const res = await fetch(`https://www.instagram.com/web/friendships/${userId}/follow/`, {
      method: 'POST',
      headers: {
        'x-csrftoken': csrfToken,
        'accept': '*/*',
        'content-type': 'application/x-www-form-urlencoded',
        'x-ig-app-id': '936619743392459', // standard IG app id
      },
      credentials: 'include',
    });

    if (res.ok) {
      console.log(`✅ Followed User ID: ${userId}`);
      return true;
    } else {
      const errorText = await res.text();
      console.error(`❌ Failed to follow ${userId}:`, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Follow User API Error:', error);
    return false;
  }
}

// ==============================================
// Unfollow user Campaign
// ==============================================

async function unfollowUser(userId) {
  // Validation
  if (!userId) {
    console.error("❌ userId not provided to unfollowUser!");
    return { success: false, error: "Missing userId" };
  }

  // Extract CSRF token
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrftoken='))
    ?.split('=')[1];

  if (!csrfToken) {
    console.error("❌ CSRF token not found. You might not be logged in!");
    return { success: false, error: "Missing CSRF token" };
  }

  const url = `https://www.instagram.com/web/friendships/${userId}/unfollow/`;
  try {
    console.log("🔗 Sending unfollow POST request to:", url);

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-csrftoken': csrfToken,
        'accept': '*/*',
        'content-type': 'application/x-www-form-urlencoded',
        'x-ig-app-id': '936619743392459',
        // 'referer': 'https://www.instagram.com/', // Optional, sometimes helps with IG
      },
      credentials: 'include',
    });

    // Success?
    if (res.ok) {
      console.log(`✅ Unfollowed User ID: ${userId}`);
      return { success: true };
    }

    // Fail with IG response
    let text = "";
    try { text = await res.text(); } catch { }
    console.error(`❌ Failed to unfollow ${userId}: [${res.status}] ${text}`);
    return { success: false, error: `Status ${res.status}: ${text}` };

  } catch (error) {
    // Most likely: Network error, CORS, blocked by IG, or session invalid
    if (error instanceof TypeError && error.message === "Failed to fetch") {
      console.error("❌ Fetch failed: Could not reach Instagram. Possible reasons:");
      console.error("- Not logged in / Session expired.");
      console.error("- Blocked by browser CORS policy.");
      console.error("- Network error.");
      console.error("- Rate limited or blocked by Instagram.");
    }
    console.error('❌ Unfollow User API Error:', error);
    return { success: false, error: error.message || error.toString() };
  }
}


// ==============================================
// Remove Followers Campaign
// ==============================================

async function removeFollowerUser(userId) {
  try {
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];

    if (!csrfToken) {
      console.error("❌ CSRF token not found. Cannot remove follower.");
      return false;
    }

    const res = await fetch(`https://www.instagram.com/web/friendships/${userId}/remove_follower/`, {
      method: 'POST',
      headers: {
        'x-csrftoken': csrfToken,
        'accept': '*/*',
        'content-type': 'application/x-www-form-urlencoded',
        'x-ig-app-id': '936619743392459',
      },
      credentials: 'include',
    });

    if (res.ok) {
      console.log(`✅ Removed follower ID: ${userId}`);
      return true;
    } else {
      const errorText = await res.text();
      console.error(`❌ Failed to remove follower ${userId}:`, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Remove Follower API Error:', error);
    return false;
  }
}


// ======================================
//  BLOCK USERS Campaign
// ======================================

// Function to block a user
async function blockUser(userId) {
  try {
    const csrfToken = document.cookie
      .split('; ')
      .find(row => row.startsWith('csrftoken='))
      ?.split('=')[1];

    if (!csrfToken) {
      console.error("❌ CSRF token not found. Cannot block user.");
      return false;
    }

    const res = await fetch(`https://www.instagram.com/web/friendships/${userId}/block/`, {
      method: 'POST',
      headers: {
        'x-csrftoken': csrfToken,
        'accept': '*/*',
        'content-type': 'application/x-www-form-urlencoded',
        'x-ig-app-id': '936619743392459',
      },
      credentials: 'include',
    });

    if (res.ok) {
      console.log(`✅ Blocked User ID: ${userId}`);
      return true;
    } else {
      const errorText = await res.text();
      console.error(`❌ Failed to block ${userId}:`, errorText);
      return false;
    }
  } catch (error) {
    console.error('❌ Block User API Error:', error);
    return false;
  }
}



// ====================================
// Watch and Like Stories Campaign
// ====================================

async function wait(ms) {
  return new Promise(res => setTimeout(res, ms));
}

async function getWaitFromSettings() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('waitSettings', (data) => {
      const { baseWait = 60, randomize = 0 } = data.waitSettings || {};
      let randomExtra = 0;

      if (randomize > 0) {
        randomExtra = Math.floor(Math.random() * (baseWait * randomize / 100));
      }

      resolve((baseWait + randomExtra) * 1000);
    });
  });
}

async function waitForStoryToRender(timeout = 5000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const media = document.querySelector('video, img');
    if (media && (media.tagName === 'IMG' || media.readyState >= 2)) return;
    await wait(200);
  }
}

async function waitForStoryToComplete(fallbackTime = 4000) {
  const start = Date.now();
  const timeout = start + 15000;

  while (Date.now() < timeout) {
    const bars = document.querySelectorAll('div[style*="transform"]');
    const activeBar = Array.from(bars).find(bar => bar?.style?.transform?.includes("scaleX"));
    if (!activeBar || activeBar.style.transform === "scaleX(1)") break;
    await wait(300);
  }

  await wait(fallbackTime);
}

async function clickViewStoryButton(timeout = 5000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const viewStoryBtn = Array.from(document.querySelectorAll('button, div[role="button"]'))
      .find(el => el.textContent?.trim()?.toLowerCase() === 'view story');

    if (viewStoryBtn) {
      console.log("👆 Clicking 'View Story' button...");
      viewStoryBtn.click();
      await wait(1000); // Let story begin loading
      return true;
    }

    await wait(200);
  }

  console.warn("❌ 'View Story' button not found.");
  return false;
}

async function waitForLikeButton(timeout = 5000) {
  const start = Date.now();

  while (Date.now() - start < timeout) {
    const btns = Array.from(document.querySelectorAll('div[role="button"]'));
    const likeBtn = btns.find(btn => {
      const svg = btn.querySelector('svg');
      const label = svg?.getAttribute('aria-label');
      return label === 'Like';
    });

    if (likeBtn) return likeBtn;

    const alreadyLiked = btns.find(btn => {
      const svg = btn.querySelector('svg');
      return svg?.getAttribute('aria-label') === 'Unlike';
    });

    if (alreadyLiked) return null;

    await wait(200);
  }

  return null;
}

async function watchAndLikeAllStories({ like }) {
  console.log("📺 Starting story viewing. Like =", like);
  await clickViewStoryButton(5000); // NEW: auto-click overlay

  const seenStorySrcs = new Set(); // To avoid reprocessing the same story
  let lastUsername = null;
  let loopAttempts = 0;

  while (loopAttempts < 100) { // safety limit
    await waitForStoryToRender();
    await wait(1000);

    // Avoid duplicate story processing (Instagram loops stories sometimes)
    const media = document.querySelector('video, img');
    const src = media?.currentSrc || media?.src;
    if (seenStorySrcs.has(src)) {
      console.log("⏩ Already seen this story, skipping.");
    } else {
      seenStorySrcs.add(src);

      // Get current username shown above the story
      const usernameEl = document.querySelector('header a[role="link"]');
      const currentUsername = usernameEl?.textContent?.trim() || null;

      if (lastUsername !== currentUsername) {
        console.log(`👤 Now viewing: ${currentUsername}`);
        lastUsername = currentUsername;
      }

      if (like) {
        try {
          const likeBtn = await waitForLikeButton(5000);
          if (likeBtn) {
            likeBtn.click();
            console.log("❤️ Liked story");
          } else {
            console.log("🟡 Already liked or button missing");
          }

          const likeWait = await getWaitFromSettings();
          await wait(likeWait);
        } catch (err) {
          console.warn("❌ Error during like:", err);
        }
      }

      await waitForStoryToComplete(2000);
    }

    const nextBtn = document.querySelector('svg[aria-label="Next"]')?.closest('div[role="button"]');
    if (nextBtn) {
      nextBtn.click();
      console.log("⏭️ Next story clicked");
      await wait(1500); // Buffer before next render
    } else {
      console.log("✅ No more stories.");
      break;
    }

    loopAttempts++;
  }

  chrome.runtime.sendMessage({ type: "STORY_DONE" });
  window.close();
}


// ==============================================
//  Follow + Like Campaign
// ==============================================

async function likeFirstPostOnProfile() {
  try {
    await new Promise(res => setTimeout(res, 2000));

    const firstPost = document.querySelector('div._aagw');
    if (!firstPost) {
      console.warn("❌ First post not found");
      return false;
    }

    firstPost.click();
    await new Promise(res => setTimeout(res, 2000));

    const likeBtn = Array.from(document.querySelectorAll('svg[aria-label="Like"]'))
      .find(svg => svg.closest('div[role="button"]'));

    if (likeBtn) {
      likeBtn.closest('div[role="button"]').click();
      console.log("✅ First post liked");
      return true;
    } else {
      console.warn("⚠️ Already liked or like button not found");
      return false;
    }

  } catch (err) {
    console.error("❌ Like error:", err);
    return false;
  }
}


//=============================================
// Instagram Media Scraping Script
//=============================================

// ======================================
// Scrape Feed Timeline Posts 
// ======================================


async function fetchFeedTimelinePosts(targetLimit = 50) {
  const posts = [];
  let nextMaxId = null;
  let totalFetched = 0;
  let page = 1;

  try {
    reportScrapingStatus("Scraping feed posts...", `Preparing to fetch up to ${targetLimit} posts.`);

    do {

      const url = nextMaxId
        ? `https://i.instagram.com/api/v1/feed/timeline/?max_id=${nextMaxId}`
        : 'https://i.instagram.com/api/v1/feed/timeline/';

      console.log(`📥 Fetching page ${page}... URL:`, url);

      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'X-CSRFToken': getCsrfFromCookie(),
          'X-IG-App-ID': '936619743392459',
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': '*/*',
          'Referer': 'https://www.instagram.com/',
          'User-Agent': navigator.userAgent
        }
      });

      const data = await response.json();
      const feedItems = data.feed_items || [];

      if (!feedItems.length) {
        console.log('⚠️ No feed items found on this page.');
        break;
      }

      for (const feedItem of feedItems) {
        const media = feedItem.media_or_ad;
        if (!media) continue;

        const shortcode = media.code || media.shortcode || "";
        let type = "Picture";
        if (media.media_type === 2) type = "Reel";
        else if (media.media_type === 8) type = "Carousel";

        const post_url = `https://www.instagram.com/${type === "Reel" ? "reels" : "p"}/${shortcode}/`;




        posts.push({
          media_id: media.pk || media.id,
          username: media.user?.username || "Unknown",
          thumbnail: media.image_versions2?.candidates?.[0]?.url || "",
          caption: media.caption?.text || "—",
          type,
          comments: media.comment_count || 0,
          likes: media.like_count || 0,
          date_taken: media.taken_at ? new Date(media.taken_at * 1000).toLocaleString() : "—",
          post_url,
        });

        totalFetched++;


        if (posts.length >= targetLimit) {
          console.log(`✅ Target of ${targetLimit} posts reached.`);
          break;
        }

        // ✅ LIVE STATUS MESSAGE:
        const delaySec = 10;
        reportScrapingStatus(
          "Scraping feed posts...",
          `Scraped @${media.user?.username || 'unknown'} (${totalFetched}/${targetLimit}). Next post will be scraped in (${delaySec}s)`
        );

        // Wait 10 seconds
        await new Promise(res => setTimeout(res, delaySec * 1000));


        if (posts.length >= targetLimit) {
          break;
        }
      }

      console.log(`📈 Total posts collected so far: ${totalFetched}`);

      nextMaxId = data.next_max_id || null;
      page++;

      if (!nextMaxId) {
        console.log('⛔ No more pages to load (next_max_id missing).');
        break;
      }

      // Wait 3 seconds before next page (very important to avoid detection)
      await new Promise(res => setTimeout(res, 3000));

    } while (posts.length < targetLimit);

    // Send posts back to popup
    chrome.runtime.sendMessage({
      type: "MEDIA_DATA",
      data: posts,
      forTab: "media"
    });

    console.log(`✅ Finished fetching. Total posts collected: ${posts.length}`);
    reportScrapingStatus("Scraping completed!", `✅ Scraped ${posts.length} feed posts.`);
    setTimeout(() => reportScrapingStatus("", "", false), 5000);

  } catch (error) {
    reportScrapingStatus("Error!", "❌ Failed to fetch feed posts.");
    setTimeout(() => reportScrapingStatus("", "", false), 7000);
    console.error('❌ Failed to fetch feed timeline posts:', error);
    alert('⚠️ Failed to fetch feed posts. Check console for more details.');
  }
}

// Make fetchFeedTimelinePosts globally accessible
window.fetchFeedTimelinePosts = fetchFeedTimelinePosts;


// =====================================
// Scrape Hashtag Posts from Search Page
// =====================================

/**
 * Scrape hashtag posts by opening each post modal, extracting info, and rate-limiting as needed.
 * Shows progress/status messages above the media table.
 * Includes strong error handling, long delays after errors, and safe modal closing.
 */
async function scrapeHashtagPostsFromSearchPage(limit = 20) {
  const results = [];
  const csrf = getCsrfFromCookie();

  let currentIndex = 0;
  let failedScrolls = 0;
  const maxFailedScrolls = 8; // how many failed scroll attempts before abort

  reportScrapingStatus(
    "Scraping Started...",
    `Scraping up to ${limit} hashtag posts.`
  );

  while (results.length < limit) {
    // Refresh node list on every iteration!
    let postElems = Array.from(document.querySelectorAll('div._aagw'));

    // If the requested post isn't yet loaded, scroll to load more
    if (!postElems[currentIndex]) {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(r => setTimeout(r, 1200));
      postElems = Array.from(document.querySelectorAll('div._aagw'));

      // If still not available after scroll, count failed attempt
      if (!postElems[currentIndex]) {
        failedScrolls++;
        if (failedScrolls >= maxFailedScrolls) {
          reportScrapingStatus(
            "⚠️ Not enough posts loaded",
            `Only ${results.length} posts could be scraped. Instagram may be limiting results.`
          );
          break;
        }
        continue; // Try again after scroll
      }
    }

    failedScrolls = 0; // reset if post found
    const el = postElems[currentIndex];
    const postRoot = el.closest('._aagu._aato');
    let gridImg = postRoot?.querySelector('._aagv img');
    let thumbnail = gridImg?.src || "";

    // Scroll grid image into view to trigger lazy-load
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(r => setTimeout(r, 400));
    if (!thumbnail) {
      gridImg = postRoot?.querySelector('._aagv img');
      thumbnail = gridImg?.src || "";
    }

    // Open modal
    el.click();
    await waitForModal();

    const modal = document.querySelector('div[role="dialog"]');
    if (!modal) {
      reportScrapingStatus(
        "Scraping hashtag posts...",
        `⚠️ Modal not found for post ${currentIndex + 1}. Retrying...`
      );
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }

    // Get modal thumbnail if needed (largest image in modal)
    if (!thumbnail) {
      const imgs = Array.from(modal.querySelectorAll('img'));
      let maxSize = 0;
      imgs.forEach(img => {
        const size = img.naturalWidth * img.naturalHeight;
        if (size > maxSize) {
          thumbnail = img.src;
          maxSize = size;
        }
      });
    }

    // If still missing, fallback to profile pic
    if (!thumbnail) {
      let profilePic = null;
      const headerImg = modal.querySelector('header img');
      if (headerImg) profilePic = headerImg.src;
      else {
        const imgs = Array.from(modal.querySelectorAll('img'));
        let minSize = Infinity;
        imgs.forEach(img => {
          const size = img.naturalWidth * img.naturalHeight;
          if (size > 0 && size < minSize) {
            profilePic = img.src;
            minSize = size;
          }
        });
      }
      thumbnail = profilePic || "";
    }

    // Username
    let username = modal.querySelector('a.x1i10hfl')?.innerText?.trim();
    if (!username) {
      const anchor = modal.querySelector('a[href^="/"][role="link"]');
      username = anchor?.getAttribute('href')?.replaceAll("/", "")?.trim() || "—";
    }

    // Caption
    const caption = modal.querySelector('h1._ap3a')?.innerText?.trim() || "—";

    // Shortcode & link
    let postLink = modal.querySelector('a[href*="/p/"], a[href*="/reel/"]')?.getAttribute('href');
    let shortcode = null;
    if (postLink?.includes("/p/")) {
      shortcode = postLink.split("/p/")[1]?.split("/")[0];
    } else if (postLink?.includes("/reel/")) {
      shortcode = postLink.split("/reel/")[1]?.split("/")[0];
    }
    if (!shortcode) {
      reportScrapingStatus(
        "Scraping hashtag posts...",
        `❌ Could not extract shortcode for post ${currentIndex + 1}. Skipping...`
      );
      modal.querySelector('[aria-label="Close"]')?.click();
      await new Promise(r => setTimeout(r, 800));
      currentIndex++;
      continue;
    }

    // Media info via private API
    let likeCount = 0, commentCount = 0, dateTaken = "—", type = "Picture";
    let post_url = "";
    try {
      const mediaId = shortcodeToInstaID(shortcode);
      const res = await fetch(`https://www.instagram.com/api/v1/media/${mediaId}/info/`, {
        headers: {
          "x-csrftoken": csrf,
          "x-ig-app-id": "936619743392459",
          "accept": "*/*"
        },
        credentials: "include"
      });
      if (!res.ok) throw new Error(res.statusText);
      const json = await res.json();
      const item = json?.items?.[0];
      if (item) {
        likeCount = item.like_count || 0;
        commentCount = item.comment_count || 0;
        dateTaken = item.taken_at ? new Date(item.taken_at * 1000).toLocaleString() : "—";
        switch (item.media_type) {
          case 1: type = "Picture"; break;
          case 2: type = "Reel"; break;
          case 8: type = "Carousel"; break;
        }
        post_url = `https://www.instagram.com/${type === "Reel" ? "reel" : "p"}/${shortcode}/`;
      }
    } catch (err) {
      reportScrapingStatus(
        "Scraping hashtag posts...",
        `❌ Failed to fetch info for post ${currentIndex + 1}. Waiting 1 minute to avoid ban...`
      );
      modal.querySelector('[aria-label="Close"]')?.click();
      await new Promise(r => setTimeout(r, 60000));
      currentIndex++;
      continue;
    }

    // Store post data
    results.push({
      postIndex: currentIndex,
      post_url,
      username,
      caption,
      type,
      thumbnail,
      likes: likeCount,
      comments: commentCount,
      date_taken: dateTaken
    });

    // Progress
    const delaySec = 10;
    reportScrapingStatus(
      "Scraping hashtag posts...",
      `Scraped @${username} (${results.length}/${limit}). Next post in ${delaySec}s`
    );

    // Close modal, delay, move to next post
    modal.querySelector('[aria-label="Close"]')?.click();
    await new Promise(r => setTimeout(r, delaySec * 1000));
    currentIndex++;
  }

  // Send data back to extension
  chrome.runtime.sendMessage({ type: "MEDIA_DATA", data: results, forTab: "media" });

  // Done message
  reportScrapingStatus(
    "✅ Hashtag scraping finished!",
    `${results.length} hashtag post(s) scraped.`
  );
  setTimeout(() => reportScrapingStatus("", "", false), 5000);
}


// Wait for modal to appear
function waitForModal(timeout = 5000) {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      const modal = document.querySelector('div[role="dialog"]');
      if (modal || Date.now() - start > timeout) return resolve();
      setTimeout(check, 100);
    };
    check();
  });
}

// Make scrapeLocationPosts globally accessible
window.scrapeHashtagPostsFromSearchPage = scrapeHashtagPostsFromSearchPage;

// =====================================
// Scrape Posts from Locations Page
// =====================================

async function scrapeLocationPosts(limit = 50) {
  await autoScrollPosts(limit);

  const results = [];
  const csrf = getCsrfFromCookie();

  reportScrapingStatus(
    "Scraping Started...",
    "Please wait while location posts are being scraped..."
  );

  for (let i = 0; i < limit; i++) {
    // Always freshly select the _aagw element before scraping
    const aagwList = document.querySelectorAll('div._aagw');
    const aagw = aagwList[i];
    if (!aagw) continue;

    const postRoot = aagw.closest('._aagu._aato');
    let gridImg = postRoot?.querySelector('._aagv img');
    let thumbnail = gridImg?.src || "";

    aagw.scrollIntoView({ behavior: 'smooth', block: 'center' });
    await new Promise(r => setTimeout(r, 400));
    if (!thumbnail) {
      gridImg = postRoot?.querySelector('._aagv img');
      thumbnail = gridImg?.src || "";
    }

    aagw.click();
    await waitForModal();

    const modal = document.querySelector('div[role="dialog"]');
    if (!modal) continue;

    // If still missing, fallback to modal image (largest image)
    if (!thumbnail) {
      const imgs = Array.from(modal.querySelectorAll('img'));
      let maxSize = 0;
      imgs.forEach(img => {
        const size = img.naturalWidth * img.naturalHeight;
        if (size > maxSize) {
          thumbnail = img.src;
          maxSize = size;
        }
      });
    }

    // Username and fallback profile pic extraction
    let username = modal.querySelector('a.x1i10hfl')?.innerText?.trim();
    if (!username) {
      const anchor = modal.querySelector('a[href^="/"][role="link"]');
      username = anchor?.getAttribute('href')?.replaceAll("/", "")?.trim() || "—";
    }

    // If thumbnail still not found, fallback to user profile pic
    if (!thumbnail) {
      // Find profile pic in modal (usually first small img in header)
      let profilePic = null;
      // Try to find an img tag near username
      const headerImg = modal.querySelector('header img');
      if (headerImg) profilePic = headerImg.src;
      else {
        // As a fallback, use the smallest image among all modal images
        const imgs = Array.from(modal.querySelectorAll('img'));
        let minSize = Infinity;
        imgs.forEach(img => {
          const size = img.naturalWidth * img.naturalHeight;
          if (size > 0 && size < minSize) {
            profilePic = img.src;
            minSize = size;
          }
        });
      }
      thumbnail = profilePic || ""; // use profile pic if found
    }

    const caption = modal.querySelector('h1._ap3a')?.innerText?.trim() || "—";

    let postLink = modal.querySelector('a[href*="/p/"], a[href*="/reel/"]')?.getAttribute('href');
    let shortcode = null;
    if (postLink?.includes("/p/")) {
      shortcode = postLink.split("/p/")[1]?.split("/")[0];
    } else if (postLink?.includes("/reel/")) {
      shortcode = postLink.split("/reel/")[1]?.split("/")[0];
    }
    if (!shortcode) {
      modal.querySelector('[aria-label="Close"]')?.click();
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }

    let likeCount = 0, commentCount = 0, dateTaken = "—", type = "Picture";
    let post_url = "";

    try {
      const mediaId = shortcodeToInstaID(shortcode);
      const res = await fetch(`https://www.instagram.com/api/v1/media/${mediaId}/info/`, {
        headers: {
          "x-csrftoken": csrf,
          "x-ig-app-id": "936619743392459",
          "accept": "*/*"
        },
        credentials: "include"
      });

      const json = await res.json();
      const item = json?.items?.[0];

      if (item) {
        likeCount = item.like_count || 0;
        commentCount = item.comment_count || 0;
        dateTaken = item.taken_at ? new Date(item.taken_at * 1000).toLocaleString() : "—";
        switch (item.media_type) {
          case 1: type = "Picture"; break;
          case 2: type = "Reel"; break;
          case 8: type = "Carousel"; break;
        }
        post_url = `https://www.instagram.com/${type === "Reel" ? "reel" : "p"}/${shortcode}/`;
      }
    } catch (err) {
      console.warn("❌ API /media/{id}/info/ failed:", err);
    }

    results.push({
      postIndex: i,
      post_url,
      username,
      caption,
      type,
      thumbnail, // Now grid, then modal, then profile pic!
      likes: likeCount,
      comments: commentCount,
      date_taken: dateTaken
    });

   const delaySec = 10;
reportScrapingStatus(
  "Scraping location posts...",
  `Scraped @${username} (${i + 1}/${limit}). Next post will be scraped in (${delaySec}s)`
);

modal.querySelector('[aria-label="Close"]')?.click();
await new Promise(r => setTimeout(r, delaySec * 1000));

  }

  reportScrapingStatus(
    "✅ Location scraping finished!",
    `${results.length} location post(s) scraped.`
  );
  setTimeout(() => reportScrapingStatus("", "", false), 3500);

  chrome.runtime.sendMessage({ type: "MEDIA_DATA", data: results, forTab: "media" });
}


// Helper: scroll to load more posts
async function autoScrollPosts(minPosts = 30, maxScrolls = 10) {
  let lastHeight = 0;
  let attempts = 0;

  while (document.querySelectorAll('div._aagw').length < minPosts && attempts < maxScrolls) {
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 1500));
    const newHeight = document.body.scrollHeight;

    if (newHeight === lastHeight) attempts++;
    else attempts = 0;

    lastHeight = newHeight;
  }
}


// Make scrapeLocationPosts globally accessible
window.scrapeLocationPosts = scrapeLocationPosts;



// =====================================
// Media Queue Campaign
// =====================================

// ========== LIKE feed post by mediaId ==========

async function likeMediaPost(mediaId) {
  const csrf = getCsrfFromCookie();
  if (!csrf || !mediaId) {
    console.warn("❌ Missing CSRF token or mediaId");
    return false;
  }

  try {
    const res = await fetch(`https://www.instagram.com/web/likes/${mediaId}/like/`, {
      method: "POST",
      headers: {
        "x-csrftoken": csrf,
        "x-ig-app-id": "936619743392459",
        "x-requested-with": "XMLHttpRequest",
        "content-type": "application/x-www-form-urlencoded",
        "accept": "*/*"
      },
      credentials: "include"
    });

    if (res.ok) {
      console.log("✅ Liked media:", mediaId);
      return true;
    } else {
      const err = await res.text();
      console.error(`❌ Failed to like media ID ${mediaId}:`, err);
      return false;
    }
  } catch (err) {
    console.error("❌ Like error:", err);
    return false;
  }
}

// ========== LIKE post from hashtag/location modal ==========

async function likeHashtagModalPost(index) {
  try {
    const postElems = document.querySelectorAll('div._aagw');
    const post = postElems[index];
    if (!post) {
      console.warn("❌ Hashtag post not found at index", index);
      return false;
    }

    post.scrollIntoView({ behavior: 'smooth', block: 'center' });
    post.click();
    await waitForModal();
    await new Promise(r => setTimeout(r, 1000));

    const modal = document.querySelector('div[role="dialog"]');
    if (!modal) return false;

    const article = modal.querySelector('article');
    const buttons = article?.querySelectorAll('div[role="button"]') || [];

    for (const btn of buttons) {
      const svg = btn.querySelector('svg');
      const label = svg?.getAttribute('aria-label');

      if (label === "Like") {
        btn.click();
        console.log("❤️ Hashtag modal liked at index", index);
        modal.querySelector('[aria-label="Close"]')?.click();
        return true;
      } else if (label === "Unlike") {
        console.log("✅ Already liked hashtag post at index", index);
        modal.querySelector('[aria-label="Close"]')?.click();
        return true;
      }
    }

    modal.querySelector('[aria-label="Close"]')?.click();
    return false;
  } catch (err) {
    console.error("❌ Hashtag like modal error:", err);
    return false;
  }
}

async function likeLocationModalPost(index) {
  try {
    const postElems = document.querySelectorAll('div._aagw');
    const post = postElems[index];
    if (!post) {
      console.warn("❌ Post element not found at index:", index);
      return false;
    }

    // Scroll and click to open modal
    post.scrollIntoView({ behavior: 'smooth', block: 'center' });
    post.click();
    await waitForModal();
    await new Promise(r => setTimeout(r, 1200));

    const modal = document.querySelector('div[role="dialog"]');
    if (!modal) {
      console.warn("❌ Modal not found after opening post.");
      return false;
    }

    const article = modal.querySelector('article');
    if (!article) {
      console.warn("❌ Article element not found in modal.");
      return false;
    }

    // Look for correct Like button inside article
    const likeBtn = Array.from(article.querySelectorAll('svg[aria-label="Like"]'))
      .find(svg => svg.closest('div[role="button"]'));

    if (likeBtn) {
      likeBtn.closest('div[role="button"]').click();
      console.log("❤️ Liked location modal post at index", index);

      // Wait for visual change
      await new Promise(resolve => setTimeout(resolve, 1000));

      const filledHeart = article.querySelector('svg[aria-label="Unlike"]');
      modal.querySelector('[aria-label="Close"]')?.click();

      return !!filledHeart;
    }


    const unlikeBtn = article.querySelector('svg[aria-label="Unlike"]');
    if (unlikeBtn) {
      console.log("🟡 Already liked location modal post at index", index);
      modal.querySelector('[aria-label="Close"]')?.click();
      return true;
    }

    console.warn("❌ Like button not found in article");
    modal.querySelector('[aria-label="Close"]')?.click();
    return false;

  } catch (err) {
    console.error("❌ Error in likeLocationModalPost:", err);
    return false;
  }
}


// ========= Message Listeners=========

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === "SCRAPING_STATUS") {
    // Let's say you are in the Accounts tab:
    if (activeTab === 'accounts' && msg.forTab === 'accounts') {
      // Show message in Accounts tab
      updateAccountsScrapeStatus(msg.heading, msg.detail);
    }
    // And for Media tab:
    if (activeTab === 'media' && msg.forTab === 'media') {
      updateMediaScrapeStatus(msg.heading, msg.detail);
    }
    
    // Or just ignore if not for this tab!
  }



  if (msg.type === "START_SCRAPE_FOLLOWERS") {
    scrapeFollowers(msg.limit || 50);
  }

  if (msg.type === "FOLLOW_USER") {
    followUser(msg.userId).then(success => {
      sendResponse({ success });
    });
    return true; // async response
  }
  if (msg.type === "UNFOLLOW_USER") {
    unfollowUser(msg.userId).then(success => {
      sendResponse({ success });
    });
    return true;  // ✅ Keep message channel open for async reply
  }
  if (msg.type === "REMOVE_FOLLOWER") {
    removeFollowerUser(msg.userId).then(success => {
      sendResponse({ success });
    });
    return true;
  }

  if (msg.type === "BLOCK_USER") {
    blockUser(msg.userId).then(success => {
      sendResponse({ success });
    });
    return true;
  }


  if (msg.type === "START_STORY_VIEW") {
    watchAndLikeAllStories({ like: msg.like, waitTime: msg.waitTime || 4000 });
    sendResponse({ started: true });
  }

  if (msg.type === "START_LIKE_FIRST_POST") {
    likeFirstPostOnProfile().then(success => {
      sendResponse({ success });
    });
    return true; // async
  }


  if (msg.type === "LIKE_MEDIA_POST" && msg.mediaId) {
    likeMediaPost(msg.mediaId).then(success => sendResponse({ success }));
    return true;
  }

  if (msg.type === "LIKE_HASHTAG_MODAL" && typeof msg.index === "number") {
    likeHashtagModalPost(msg.index).then(success => sendResponse({ success }));
    return true;
  }

  if (msg.type === "LIKE_LOCATION_MODAL" && typeof msg.index === "number") {
    likeLocationModalPost(msg.index).then(success => sendResponse({ success }));
    return true;
  }


});







