/**
 * Chrome Extension Content Script
 * Injects autocomplete into all input fields on the page
 * 
 * Note: automobile-complete.js is loaded first by manifest.json
 * This script runs after it and initializes autocomplete
 */

(function() {
  'use strict';
  
  // Prevent multiple initializations
  if (window.__AUTOMOBILE_COMPLETE_INITIALIZED) {
    console.warn('[Automobile Complete] Content script already initialized, skipping');
    return;
  }
  
  // Check if we're on a chrome:// page (Chrome extensions cannot run on these pages)
  const currentUrl = window.location.href;
  if (currentUrl.startsWith('chrome://') || currentUrl.startsWith('chrome-extension://') || currentUrl.startsWith('moz-extension://')) {
    console.warn('[Automobile Complete] Cannot run on Chrome internal pages (chrome://). This is a Chrome security restriction. The extension will work on regular websites.');
    return;
  }
  
  // Cross-context logging is now handled by logging-setup.js which runs first
  // All console methods are already overridden to forward to page context
  
  // Log immediately with error handling and persistent markers
  try {
    // Use console.log with a distinctive prefix that's easy to filter
    console.log('%c[Automobile Complete] Content script loaded', 'color: #4CAF50; font-weight: bold; font-size: 14px;', currentUrl);
    // Also log to console.info for better visibility
    console.info('[Automobile Complete] Content script loaded on:', currentUrl);
    // Add a marker to window for debugging
    if (typeof window !== 'undefined') {
      window.__AUTOMOBILE_COMPLETE_LOADED = true;
      window.__AUTOMOBILE_COMPLETE_LOADED_TIME = new Date().toISOString();
    }
  } catch (e) {
    // Fallback if console.log fails
    try {
      console.error('[Automobile Complete] Content script loaded (console.log failed):', e);
    } catch (e2) {
      // Last resort - try alert (though this is annoying)
    }
  }
  
  // Glob pattern matcher
  function matchesPattern(url, pattern) {
    // Convert glob pattern to regex
    // * matches any sequence of characters except /
    // ? matches any single character except /
    // Escape special regex characters
    let regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
      .replace(/\*\*/g, '{{DOUBLE_STAR}}') // Temporarily replace **
      .replace(/\*/g, '[^/]*') // * matches any chars except /
      .replace(/\?/g, '[^/]') // ? matches single char except /
      .replace(/{{DOUBLE_STAR}}/g, '.*'); // ** matches any chars including /
    
    // If pattern doesn't start with http:// or https://, match against hostname and path
    if (!pattern.startsWith('http://') && !pattern.startsWith('https://')) {
      try {
        const urlObj = new URL(url);
        const hostnameAndPath = urlObj.hostname + urlObj.pathname;
        const regex = new RegExp('^' + regexPattern + '$', 'i');
        return regex.test(hostnameAndPath) || regex.test(urlObj.hostname);
      } catch (e) {
        return false;
      }
    }
    
    // Full URL match
    const regex = new RegExp('^' + regexPattern + '$', 'i');
    return regex.test(url);
  }

  // Check if URL matches any pattern in a list
  function matchesAnyPattern(url, patterns) {
    if (!patterns || patterns.length === 0) return false;
    return patterns.some(pattern => matchesPattern(url, pattern.trim()));
  }

  // Get completion list from storage, or use baked-in completions, or use default
  try {
    chrome.storage.local.get([
      'completionList', 
      'selector', 
      'globalSelector',
      'siteSelectors',
      'personalDictionary',
      'pageDictionaries',
      'defaultMode', 
      'whitelist', 
      'blacklist'
    ], (result) => {
    // Check if this site is enabled/disabled based on whitelist/blacklist mode
    const currentHostname = window.location.hostname;
    const currentUrl = window.location.href;
    const defaultMode = result.defaultMode || 'blacklist'; // Default to blacklist for backward compatibility
    
    const whitelist = result.whitelist || [];
    const blacklist = result.blacklist || [];
    const whitelistPatterns = Array.isArray(whitelist) ? whitelist : [];
    const blacklistPatterns = Array.isArray(blacklist) ? blacklist : [];
    
    let isEnabled = false;
    if (defaultMode === 'whitelist') {
      // Off by default, only enabled if in whitelist
      isEnabled = matchesAnyPattern(currentUrl, whitelistPatterns) || matchesAnyPattern(currentHostname, whitelistPatterns);
      if (!isEnabled) {
        console.log('%c[Automobile Complete] Disabled (whitelist mode, not in whitelist):', 'color: #FF9800; font-weight: bold;', currentHostname);
        console.info('[Automobile Complete] Disabled (whitelist mode, not in whitelist):', currentHostname);
        return; // Don't initialize autocomplete
      }
    } else {
      // On by default, disabled if in blacklist
      isEnabled = !matchesAnyPattern(currentUrl, blacklistPatterns) && !matchesAnyPattern(currentHostname, blacklistPatterns);
      if (!isEnabled) {
        console.log('%c[Automobile Complete] Disabled (blacklist mode, in blacklist):', 'color: #FF9800; font-weight: bold;', currentHostname);
        console.info('[Automobile Complete] Disabled (blacklist mode, in blacklist):', currentHostname);
        return; // Don't initialize autocomplete
      }
    }
    
    // Always use baked-in completions as the base, then merge with storage if present
    let completionList = '';
    
    // Always start with baked-in completions if available (this is the base list)
    if (typeof window !== 'undefined' && typeof window.__AUTOMOBILE_COMPLETE_BAKED_COMPLETIONS !== 'undefined') {
      completionList = window.__AUTOMOBILE_COMPLETE_BAKED_COMPLETIONS;
      console.log('[Automobile Complete] Using baked-in completion list as base, length:', completionList.length);
    } else {
      console.warn('[Automobile Complete] No baked-in completion list found!');
    }
    
    // Merge personal dictionary and page dictionary
    const personalDict = result.personalDictionary || '';
    const pageDictionaries = result.pageDictionaries || {};
    const pageDict = pageDictionaries[currentHostname] || '';
    
    // Combine dictionaries
    const dictParts = [];
    if (personalDict.trim()) dictParts.push(personalDict.trim());
    if (pageDict.trim()) dictParts.push(pageDict.trim());
    const combinedDict = dictParts.join('\n');
    
    // Merge with completionList (backward compatibility)
    if (result.completionList && result.completionList.trim().length > 0) {
      if (combinedDict) {
        dictParts.push(result.completionList.trim());
      } else {
        dictParts.push(result.completionList.trim());
      }
    }
    
    // Merge all dictionaries with baked-in
    if (dictParts.length > 0) {
      const allDicts = dictParts.join('\n');
      if (completionList) {
        console.log('[Automobile Complete] Merging dictionaries with baked-in list');
        completionList = completionList + '\n' + allDicts;
      } else {
        completionList = allDicts;
        console.log('[Automobile Complete] Using dictionaries only (no baked-in found)');
      }
    } else if (completionList) {
      console.log('[Automobile Complete] Using only baked-in completion list (no dictionaries)');
    }
    
    // Get selector: site-specific first, then global, then default
    const defaultSelector = 'input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], textarea, [contenteditable="true"]';
    const siteSelectors = result.siteSelectors || {};
    const siteSelector = siteSelectors[currentHostname];
    const globalSelector = result.globalSelector || result.selector;
    
    let selector = defaultSelector;
    if (siteSelector && siteSelector !== '<default>') {
      selector = siteSelector;
      console.log('[Automobile Complete] Using site-specific selector:', selector);
    } else if (globalSelector && globalSelector !== '<default>') {
      selector = globalSelector;
      console.log('[Automobile Complete] Using global selector:', selector);
    } else {
      console.log('[Automobile Complete] Using default selector');
    }
    
    if (completionList) {
      console.log('%c[Automobile Complete] Completion list found, initializing autocomplete...', 'color: #2196F3; font-weight: bold;');
      console.info('[Automobile Complete] Completion list found, initializing autocomplete...');
      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
          console.log('[Automobile Complete] DOMContentLoaded fired, initializing...');
          initializeAutocomplete(completionList, selector);
        });
      } else {
        console.log('[Automobile Complete] DOM already ready, initializing immediately...');
        initializeAutocomplete(completionList, selector);
      }
    } else {
      console.warn('%c[Automobile Complete] No completion list configured. Open the extension popup to set one up.', 'color: #FF9800; font-weight: bold;');
      console.warn('[Automobile Complete] No completion list configured. Open the extension popup to set one up.');
    }
    });
  } catch (error) {
    console.error('[Automobile Complete] Error accessing chrome.storage:', error);
  }

  function initializeAutocomplete(completionList, selector) {
    try {
      console.log('[Automobile Complete] Attempting to initialize with selector:', selector);
      
      const options = {};
      
      // Use the global AutomobileComplete from the IIFE bundle
      // The library exposes: window.AutomobileComplete.attachAutocomplete
      if (typeof window === 'undefined') {
        console.error('[Automobile Complete] window is undefined');
        return;
      }
      
      if (!window.AutomobileComplete) {
        console.error('[Automobile Complete] window.AutomobileComplete is not defined');
        console.log('[Automobile Complete] Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('auto')));
        return;
      }
      
      if (!window.AutomobileComplete.attachAutocomplete) {
        console.error('[Automobile Complete] window.AutomobileComplete.attachAutocomplete is not defined');
        console.log('[Automobile Complete] Available AutomobileComplete properties:', Object.keys(window.AutomobileComplete));
        return;
      }
      
      console.log('[Automobile Complete] Calling attachAutocomplete...');
      window.AutomobileComplete.attachAutocomplete(selector, completionList, options);
      console.log('[Automobile Complete] Successfully called attachAutocomplete');
      
      // Mark as initialized to prevent duplicate runs
      window.__AUTOMOBILE_COMPLETE_INITIALIZED = true;
    } catch (error) {
      console.error('[Automobile Complete] Error initializing:', error);
      console.error('[Automobile Complete] Error stack:', error.stack);
    }
  }

  // Listen for storage changes to reload autocomplete when settings change
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
      // Reload the page to reinitialize with new settings
      location.reload();
    }
  });

  // Listen for messages from popup to get current URL (no permissions needed)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'getCurrentUrl') {
      sendResponse({ 
        url: window.location.href,
        hostname: window.location.hostname
      });
      return true; // Keep channel open for async response
    }
    return false;
  });
})();
