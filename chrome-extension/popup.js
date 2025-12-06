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

// Highlight matching patterns in textarea
function highlightMatchingPatterns(textareaId, patterns, currentUrl) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;
  
  const lines = textarea.value.split('\n');
  const highlightedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    const matches = matchesPattern(currentUrl, trimmed) || matchesPattern(window.location.hostname, trimmed);
    if (matches) {
      return `<span class="pattern-match">${line}</span>`;
    }
    return line;
  });
  
  // Store original value
  const originalValue = textarea.value;
  const cursorPos = textarea.selectionStart;
  
  // Create a temporary div to render HTML
  const tempDiv = document.createElement('div');
  tempDiv.style.position = 'absolute';
  tempDiv.style.visibility = 'hidden';
  tempDiv.style.whiteSpace = 'pre-wrap';
  tempDiv.style.fontFamily = 'monospace';
  tempDiv.style.fontSize = '12px';
  tempDiv.style.padding = '8px';
  tempDiv.style.border = '1px solid #ccc';
  tempDiv.style.width = textarea.offsetWidth + 'px';
  tempDiv.innerHTML = highlightedLines.join('\n');
  document.body.appendChild(tempDiv);
  
  // This approach won't work well for highlighting. Let's use a simpler approach:
  // Just add a class to matching lines by checking on blur/input
}

// Simple approach: check each line and add background color via data attribute
function updatePatternHighlighting(textareaId, currentUrl) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;
  
  // Store cursor position
  const cursorPos = textarea.selectionStart;
  const scrollTop = textarea.scrollTop;
  
  // Check each line
  const lines = textarea.value.split('\n');
  const newLines = lines.map((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    const matches = matchesPattern(currentUrl, trimmed) || matchesPattern(window.location.hostname, trimmed);
    return line; // Keep original line, we'll use CSS
  });
  
  // Restore cursor
  textarea.value = newLines.join('\n');
  textarea.setSelectionRange(cursorPos, cursorPos);
  textarea.scrollTop = scrollTop;
  
  // Apply highlighting via CSS based on line content
  // We'll do this by wrapping matching lines in spans when displaying
  // But for simplicity, let's just add a data attribute and use CSS
}

// Better approach: use a contenteditable div or overlay
// For now, let's use a simpler visual indicator - add a checkmark icon next to matching patterns
// Actually, let's just update the textarea's rows to show which lines match

// Get current tab URL
let currentTabUrl = '';
let currentHostname = '';

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTab = tabs[0];
  if (currentTab && currentTab.url) {
    try {
      const url = new URL(currentTab.url);
      currentHostname = url.hostname;
      currentTabUrl = url.href;
      
      // Check if extension can run on this page
      const isRestrictedPage = currentTabUrl.startsWith('chrome://') || 
                               currentTabUrl.startsWith('chrome-extension://') || 
                               currentTabUrl.startsWith('moz-extension://') ||
                               currentTabUrl.startsWith('about:');
      
      const siteToggleContainer = document.getElementById('siteToggleContainer');
      const restrictedPageMessage = document.getElementById('restrictedPageMessage');
      
      if (isRestrictedPage) {
        // Hide site toggle, show message
        siteToggleContainer.style.display = 'none';
        restrictedPageMessage.style.display = 'block';
      } else {
        // Show site toggle, hide message
        siteToggleContainer.style.display = 'flex';
        restrictedPageMessage.style.display = 'none';
      }

      
      // Load saved settings
      chrome.storage.local.get([
        'completionList', 
        'selector',
        'globalSelector',
        'siteSelectors',
        'defaultMode',
        'whitelist',
        'blacklist',
        'personalDictionary',
        'pageDictionaries'
      ], (result) => {
        // Load mode (default to blacklist mode for backward compatibility)
        const defaultMode = result.defaultMode || 'blacklist';
        const modeToggleBtn = document.getElementById('modeToggle');
        
        // Update toggle button based on mode
        updateModeToggle(defaultMode);
        
        // Show/hide whitelist/blacklist based on mode
        updateModeVisibility(defaultMode);
        
        // Load whitelist and blacklist
        const whitelist = result.whitelist || [];
        const blacklist = result.blacklist || [];
        const whitelistText = Array.isArray(whitelist) ? whitelist.join('\n') : whitelist;
        const blacklistText = Array.isArray(blacklist) ? blacklist.join('\n') : blacklist;
        document.getElementById('whitelist').value = whitelistText;
        document.getElementById('blacklist').value = blacklistText;
        
        // Load selectors
        const globalSelector = result.globalSelector || result.selector || '<default>';
        const siteSelectors = result.siteSelectors || {};
        const siteSelector = siteSelectors[currentHostname] || '<default>';
        
        document.getElementById('globalSelector').value = globalSelector === 'input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], textarea, [contenteditable="true"]' ? '<default>' : globalSelector;
        document.getElementById('siteSelector').value = siteSelector;
        
        // Load dictionaries
        // Personal dictionary is stored in chrome.storage.local.personalDictionary (shared across all sites)
        // Page dictionary is stored per-site in pageDictionaries[hostname] (site-specific)
        let personalDict = '';
        if (result.personalDictionary !== undefined && result.personalDictionary !== null) {
          personalDict = String(result.personalDictionary);
        }
        
        const pageDictionaries = result.pageDictionaries || {};
        let pageDict = '';
        if (pageDictionaries[currentHostname] !== undefined && pageDictionaries[currentHostname] !== null) {
          pageDict = String(pageDictionaries[currentHostname]);
        }
        
        // Handle migration from old completionList format (backward compatibility)
        // Only migrate if we don't have the new format dictionaries
        if (result.completionList && result.completionList.trim()) {
          if (!personalDict && !pageDict) {
            // Old format - no separate dictionaries, use completionList as page dictionary
            pageDict = result.completionList;
            console.log('[Popup] Migrating old completionList to page dictionary');
          }
          // If either personalDict or pageDict exists, ignore old completionList (new format takes precedence)
        }
        
        // Set the values
        document.getElementById('personalDictionary').value = personalDict;
        document.getElementById('pageDictionary').value = pageDict;
        
        // Debug logging
        console.log('[Popup] Loaded dictionaries:', {
          personalDictLength: personalDict.length,
          pageDictLength: pageDict.length,
          hasCompletionList: !!result.completionList
        });
        
        // Check if current site is enabled/disabled
        const whitelistPatterns = Array.isArray(whitelist) ? whitelist : (whitelistText ? whitelistText.split('\n').filter(p => p.trim()) : []);
        const blacklistPatterns = Array.isArray(blacklist) ? blacklist : (blacklistText ? blacklistText.split('\n').filter(p => p.trim()) : []);
        
        let isEnabled = false;
        let isWhitelisted = false;
        let isBlacklisted = false;
        
        if (defaultMode === 'whitelist') {
          isWhitelisted = matchesAnyPattern(currentTabUrl, whitelistPatterns) || matchesAnyPattern(currentHostname, whitelistPatterns);
          isEnabled = isWhitelisted;
        } else {
          isBlacklisted = matchesAnyPattern(currentTabUrl, blacklistPatterns) || matchesAnyPattern(currentHostname, blacklistPatterns);
          isEnabled = !isBlacklisted;
        }
        
        // Update site toggle
        const siteToggle = document.getElementById('siteToggle');
        const currentSiteLabel = document.getElementById('currentSiteLabel');
        currentSiteLabel.textContent = currentHostname;
        siteToggle.checked = isEnabled;
        
        // Highlight matching patterns
        highlightPatternsInTextarea('whitelist', currentTabUrl);
        highlightPatternsInTextarea('blacklist', currentTabUrl);
      });
    } catch (e) {
      console.error('Error parsing URL:', e);
      const currentSiteLabel = document.getElementById('currentSiteLabel');
      if (currentSiteLabel) {
        currentSiteLabel.textContent = 'Unable to detect site';
      }
    }
  }
});

// Update mode toggle checkbox
function updateModeToggle(mode) {
  const modeToggle = document.getElementById('modeToggle');
  // blacklist mode = enabled by default (checked), whitelist mode = disabled by default (unchecked)
  modeToggle.checked = mode === 'blacklist';
}

// Update visibility of whitelist/blacklist sections
function updateModeVisibility(mode) {
  const whitelistSection = document.getElementById('whitelistSection');
  const blacklistSection = document.getElementById('blacklistSection');
  
  if (mode === 'whitelist') {
    whitelistSection.style.display = 'block';
    blacklistSection.style.display = 'none';
  } else {
    whitelistSection.style.display = 'none';
    blacklistSection.style.display = 'block';
  }
}

// Highlight matching patterns in textarea
function highlightPatternsInTextarea(textareaId, currentUrl) {
  addPatternHighlights(textareaId, currentUrl);
}

// Listen for mode toggle change
document.getElementById('modeToggle').addEventListener('change', (e) => {
  const newMode = e.target.checked ? 'blacklist' : 'whitelist';
  
  // Update visibility
  updateModeVisibility(newMode);
  
  // Update site toggle state based on new mode
  updateSiteToggleState(newMode);
  
  setTimeout(() => {
    highlightPatternsInTextarea(newMode === 'whitelist' ? 'whitelist' : 'blacklist', currentTabUrl);
    addPatternHighlights(newMode === 'whitelist' ? 'whitelist' : 'blacklist', currentTabUrl);
  }, 100);
});

// Listen for site toggle change
document.getElementById('siteToggle').addEventListener('change', (e) => {
  const isEnabled = e.target.checked;
  const modeToggle = document.getElementById('modeToggle');
  const defaultMode = modeToggle.checked ? 'blacklist' : 'whitelist';
  
  // Get current whitelist/blacklist
  const whitelistText = document.getElementById('whitelist').value;
  const blacklistText = document.getElementById('blacklist').value;
  const whitelist = whitelistText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
  const blacklist = blacklistText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
  
  if (defaultMode === 'whitelist') {
    // Whitelist mode: add/remove from whitelist
    if (isEnabled) {
      // Add to whitelist if not already there
      if (!whitelist.includes(currentHostname)) {
        const newWhitelist = [...whitelist, currentHostname];
        document.getElementById('whitelist').value = newWhitelist.join('\n');
        addPatternHighlights('whitelist', currentTabUrl);
      }
    } else {
      // Remove from whitelist
      const newWhitelist = whitelist.filter(p => p !== currentHostname);
      document.getElementById('whitelist').value = newWhitelist.join('\n');
      addPatternHighlights('whitelist', currentTabUrl);
    }
  } else {
    // Blacklist mode: add/remove from blacklist
    if (!isEnabled) {
      // Add to blacklist if not already there
      if (!blacklist.includes(currentHostname) && !blacklist.includes(currentHostname + '/*')) {
        const newBlacklist = [...blacklist, currentHostname + '/*'];
        document.getElementById('blacklist').value = newBlacklist.join('\n');
        addPatternHighlights('blacklist', currentTabUrl);
      }
    } else {
      // Remove from blacklist
      const newBlacklist = blacklist.filter(p => p !== currentHostname && p !== currentHostname + '/*');
      document.getElementById('blacklist').value = newBlacklist.join('\n');
      addPatternHighlights('blacklist', currentTabUrl);
    }
  }
  
  showStatus(isEnabled ? 'Site enabled' : 'Site disabled', 'success');
});

// Update site toggle state based on current mode and patterns
function updateSiteToggleState(mode) {
  const whitelistText = document.getElementById('whitelist').value;
  const blacklistText = document.getElementById('blacklist').value;
  const whitelistPatterns = whitelistText ? whitelistText.split('\n').filter(p => p.trim()) : [];
  const blacklistPatterns = blacklistText ? blacklistText.split('\n').filter(p => p.trim()) : [];
  
  const siteToggle = document.getElementById('siteToggle');
  
  if (mode === 'whitelist') {
    const isWhitelisted = matchesAnyPattern(currentTabUrl, whitelistPatterns) || matchesAnyPattern(currentHostname, whitelistPatterns);
    siteToggle.checked = isWhitelisted;
  } else {
    const isBlacklisted = matchesAnyPattern(currentTabUrl, blacklistPatterns) || matchesAnyPattern(currentHostname, blacklistPatterns);
    siteToggle.checked = !isBlacklisted;
  }
}

// Better pattern highlighting: create a visual overlay or use contenteditable
// For simplicity, let's add a helper that shows matching patterns below the textarea
function addPatternHighlights(textareaId, currentUrl) {
  const textarea = document.getElementById(textareaId);
  if (!textarea) return;
  
  // Create a highlight indicator
  let highlightDiv = document.getElementById(textareaId + '_highlight');
  if (!highlightDiv) {
    highlightDiv = document.createElement('div');
    highlightDiv.id = textareaId + '_highlight';
    highlightDiv.className = 'help-text';
    highlightDiv.style.marginTop = '4px';
    highlightDiv.style.fontSize = '11px';
    textarea.parentNode.insertBefore(highlightDiv, textarea.nextSibling);
  }
  
  const lines = textarea.value.split('\n').map(l => l.trim()).filter(l => l);
  const matchingLines = lines.filter(line => 
    matchesPattern(currentUrl, line) || matchesPattern(currentHostname, line)
  );
  
  if (matchingLines.length > 0) {
    highlightDiv.innerHTML = `✓ ${matchingLines.length} pattern(s) match: ${matchingLines.slice(0, 2).join(', ')}${matchingLines.length > 2 ? '...' : ''}`;
    highlightDiv.style.color = '#4CAF50';
    highlightDiv.style.fontWeight = '500';
  } else {
    highlightDiv.innerHTML = '';
  }
}

// Update highlights when textarea changes
['whitelist', 'blacklist'].forEach(id => {
  const textarea = document.getElementById(id);
  if (textarea) {
    textarea.addEventListener('input', () => {
      addPatternHighlights(id, currentTabUrl);
    });
    // Initial highlight
    setTimeout(() => addPatternHighlights(id, currentTabUrl), 100);
  }
});

// Save button handler
document.getElementById('save').addEventListener('click', () => {
  const globalSelectorInput = document.getElementById('globalSelector').value.trim();
  const siteSelectorInput = document.getElementById('siteSelector').value.trim();
  const personalDict = document.getElementById('personalDictionary').value;
  const pageDict = document.getElementById('pageDictionary').value;
  
  // Get mode from toggle checkbox
  const modeToggle = document.getElementById('modeToggle');
  const defaultMode = modeToggle.checked ? 'blacklist' : 'whitelist';
  
  // Get whitelist and blacklist (split by newlines, filter empty)
  const whitelistText = document.getElementById('whitelist').value;
  const blacklistText = document.getElementById('blacklist').value;
  const whitelist = whitelistText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
  const blacklist = blacklistText.split('\n').map(p => p.trim()).filter(p => p.length > 0);
  
  // Handle selectors
  const defaultSelector = 'input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], textarea, [contenteditable="true"]';
  const globalSelector = (globalSelectorInput === '<default>' || !globalSelectorInput) ? defaultSelector : globalSelectorInput;
  const siteSelector = (siteSelectorInput === '<default>' || !siteSelectorInput) ? null : siteSelectorInput;
  
  // Get existing site selectors
  chrome.storage.local.get(['siteSelectors', 'pageDictionaries'], (result) => {
    const siteSelectors = result.siteSelectors || {};
    const pageDictionaries = result.pageDictionaries || {};
    
    // Update site-specific selector
    if (siteSelector) {
      siteSelectors[currentHostname] = siteSelector;
    } else {
      delete siteSelectors[currentHostname];
    }
    
    // Update page dictionary
    if (pageDict.trim()) {
      pageDictionaries[currentHostname] = pageDict;
    } else {
      delete pageDictionaries[currentHostname];
    }
    
    // Merge personal and page dictionaries for backward compatibility
    const completionList = personalDict + (personalDict && pageDict ? '\n' : '') + pageDict;
    
    // Save to storage
    chrome.storage.local.set({
      completionList: completionList, // Keep for backward compatibility
      personalDictionary: personalDict,
      pageDictionaries: pageDictionaries,
      globalSelector: globalSelector,
      siteSelectors: siteSelectors,
      selector: globalSelector, // Keep for backward compatibility
      defaultMode: defaultMode,
      whitelist: whitelist,
      blacklist: blacklist
    }, () => {
      showStatus('Settings saved! Reload the page to apply.', 'success');
      
      // Notify content script to reload
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'reloadAutocomplete' });
      });
    });
  });
});

function showStatus(message, type) {
  const statusDiv = document.getElementById('status');
  statusDiv.textContent = message;
  statusDiv.className = `status ${type}`;
  setTimeout(() => {
    statusDiv.textContent = '';
    statusDiv.className = '';
  }, 3000);
}
