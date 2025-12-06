/**
 * Browser-only entry point - excludes React Native dependencies
 * Use this for web/HTML builds
 */

import { AutocompleteTextController } from "./AutocompleteTextController";
import type { AutocompleteTextControllerOptions, CompletionOption } from "./AutocompleteTextController";
import { attachAutocomplete } from "./attachAutocomplete";
import type { AttachAutocompleteOptions } from "./attachAutocomplete";

// Export for ES modules
export { AutocompleteTextController, attachAutocomplete };
export type { AutocompleteTextControllerOptions, CompletionOption, AttachAutocompleteOptions };

// For IIFE builds, expose on window object
if (typeof window !== 'undefined') {
  (window as any).AutomobileComplete = {
    AutocompleteTextController,
    attachAutocomplete
  };
}

// Auto-initialize from script tag parameters if present
if (typeof window !== 'undefined') {
  // Check if we're loaded via a script tag with data attributes or URL params
  const currentScript = document.currentScript as HTMLScriptElement | null;
  
  // Get attributes from dataset (camelCase) or directly from getAttribute (kebab-case)
  const getScriptAttr = (name: string): string | null => {
    if (!currentScript) return null;
    // Try dataset first (camelCase: data-completionlist -> completionlist)
    const camelCase = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    if (currentScript.dataset[camelCase]) {
      return currentScript.dataset[camelCase] || null;
    }
    // Try getAttribute (kebab-case: data-completionlist)
    return currentScript.getAttribute(`data-${name}`) || null;
  };
  
  // Also check URL search params
  const urlParams = new URLSearchParams(window.location.search);
  
  // Get selector from data-selector, data-target, or URL param (default to "input, textarea")
  const selector = getScriptAttr('selector') || 
                   getScriptAttr('target') || 
                   urlParams.get('autocomplete-selector') || 
                   urlParams.get('selector') || 
                   'input, textarea';
  
  // Get completion list from various data attributes or URL param
  // Support: data-completions, data-completionlist, data-list, data-completions-list
  let completionList = getScriptAttr('completions') || 
                       getScriptAttr('completionlist') || 
                       getScriptAttr('list') || 
                       getScriptAttr('completions-list') ||
                       urlParams.get('autocomplete-completions') || 
                       urlParams.get('completions') || 
                       urlParams.get('completionlist') ||
                       undefined;
  
  // Check if we should add innerHTML content
  const addInnerHTML = getScriptAttr('add-inner-html') === 'true' || 
                       urlParams.get('add-inner-html') === 'true' ||
                       true; // Default to true if innerHTML exists
  
  // If script tag has innerHTML/text content and addInnerHTML is true, add it to completion list
  if (currentScript && addInnerHTML) {
    const innerContent = currentScript.textContent || currentScript.innerHTML || '';
    const trimmedContent = innerContent.trim();
    if (trimmedContent.length > 0) {
      // Trim each line and filter empty lines
      const lines = trimmedContent.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
      
      if (lines.length > 0) {
        const innerHTMLList = lines.join('\n');
        // Append to existing completion list if it exists
        if (completionList) {
          completionList = completionList + '\n' + innerHTMLList;
        } else {
          completionList = innerHTMLList;
        }
      }
    }
  }
  
  // Handle multi-line values in data attributes (browsers may normalize newlines)
  // HTML attributes can contain newlines, but they might be normalized to spaces
  // We'll normalize any whitespace sequences to single newlines
  // If the completion list is on a single line (no newlines), split on semicolons
  let normalizedCompletionList: string | undefined = undefined;
  if (completionList) {
    const hasNewlines = completionList.includes('\n');
    if (!hasNewlines) {
      // Single line - split on semicolons
      normalizedCompletionList = completionList.split(';').map(s => s.trim()).filter(s => s.length > 0).join('\n');
    } else {
      // Multi-line - normalize line endings
      normalizedCompletionList = completionList
        .replace(/\r\n/g, '\n')  // Windows line endings
        .replace(/\r/g, '\n')    // Old Mac line endings
        .replace(/[ \t]+/g, ' ') // Multiple spaces/tabs to single space
        .replace(/ \n/g, '\n')   // Space before newline
        .replace(/\n /g, '\n')   // Space after newline
        .replace(/\n{3,}/g, '\n\n'); // Multiple newlines to double newline
    }
  }
  
  // Get options from data attributes or URL params
  const usePasteEvents = getScriptAttr('use-paste-events') === 'true' || urlParams.get('use-paste-events') === 'true';
  const simulateTyping = getScriptAttr('simulate-typing') === 'true' || urlParams.get('simulate-typing') === 'true';
  
  // Auto-initialize if we have a completion list
  if (normalizedCompletionList) {
    const init = () => {
      const options: any = {};
      if (usePasteEvents) options.usePasteEvents = true;
      if (simulateTyping) options.simulateTyping = true;
      
      attachAutocomplete(selector, normalizedCompletionList, options);
    };
    
    // Wait for DOM to be ready
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      init();
    } else {
      document.addEventListener('DOMContentLoaded', init);
    }
  }
}

