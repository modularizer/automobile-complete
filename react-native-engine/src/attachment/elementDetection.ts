/**
 * Element detection and finding utilities for autocomplete.
 * Handles finding input elements, tracking active elements, and auto-attachment logic.
 */

import {AutocompleteTextController, AutocompleteTextControllerOptions} from "../engine/AutocompleteTextController";
import {AttachAutocompleteOptions} from "./config";

// Global tracking for detecting actual input elements
export let globalInputTracker: {
  activeElement: HTMLElement | null;
  elementTextMap: WeakMap<HTMLElement, string>;
  isTracking: boolean;
} = {
  activeElement: null,
  elementTextMap: new WeakMap(),
  isTracking: false
};

// Global registry for auto-attachment callbacks
// When a contenteditable element is detected, we'll try to attach to it
// CRITICAL: completionList must be a string (completion list or URL), never a controller instance
// This ensures each element gets its own controller instance
export let autoAttachmentRegistry: Array<{
  completionList: string; // Completion list string or URL - never a controller instance
  options?: AttachAutocompleteOptions & AutocompleteTextControllerOptions;
  attachedElements: WeakSet<HTMLElement>;
  attachFunction: (el: HTMLElement) => void;
}> = [];

// Global set to track elements currently being attached (prevents race conditions)
export const attachingElements = new WeakSet<HTMLElement>();

// Global set to track selectors that are being processed (prevents duplicate selector-based attachments)
export const processingSelectors = new Set<string>();

// Global WeakMap to track ALL attached elements across ALL calls (ultimate protection)
// Maps element -> cleanup function, so we can detect and prevent duplicates
export const globalAttachedElements = new WeakMap<HTMLElement, () => void>();

// Shared placeholder cleanup function - used to mark elements as "attaching in progress"
// This allows us to detect if an element is in the middle of attachment vs fully attached
export const PLACEHOLDER_CLEANUP = () => {
  console.warn('[Automobile Complete] Placeholder cleanup called - this should not happen!');
};

// Helper function to get element info for logging
export function getElementInfo(element: HTMLElement): string {
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = element.className ? `.${element.className.split(' ').join('.')}` : '';
  const type = (element as HTMLInputElement).type ? `[type="${(element as HTMLInputElement).type}"]` : '';
  const name = (element as HTMLInputElement).name ? `[name="${(element as HTMLInputElement).name}"]` : '';
  const contenteditable = element.contentEditable === 'true' ? '[contenteditable="true"]' : '';
  return `${tag}${id}${classes}${type}${name}${contenteditable}`;
}

// Helper to get text for tracking (handles both input/textarea and contenteditable)
export function getElementTextForTracking(element: HTMLElement): string {
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    return (element as HTMLInputElement | HTMLTextAreaElement).value || '';
  } else if (element.contentEditable === 'true' || element.isContentEditable) {
    // For contenteditable, find the actual text container
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;
      
      // Find the element containing the text
      let node: Node | null = commonAncestor;
      while (node && node !== element) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          if (el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'SPAN') {
            return el.innerText || el.textContent || '';
          }
        }
        node = node.parentNode;
      }
    }
    return element.innerText || element.textContent || '';
  }
  return '';
}

// Find the actual input element that's currently receiving input
export function findActiveInputElement(): HTMLElement | null {
  // First check if we have a tracked active element
  if (globalInputTracker.activeElement) {
    // Verify it's still in the document and potentially active
    if (document.contains(globalInputTracker.activeElement)) {
      return globalInputTracker.activeElement;
    }
  }
  
  // Fallback: check document.activeElement
  const activeEl = document.activeElement as HTMLElement;
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || 
                   activeEl.contentEditable === 'true' || activeEl.isContentEditable)) {
    return activeEl;
  }
  
  return null;
}

// Check if element is contenteditable
export function isContentEditable(element: HTMLElement): element is HTMLElement {
  return element.contentEditable === 'true' || element.getAttribute('contenteditable') === 'true';
}

// Find the actual input element that receives text (for contenteditable elements)
export function findActualInputElement(element: HTMLElement): HTMLElement {
  if (!isContentEditable(element)) {
    return element;
  }
  
  // First, check if the global tracker has identified this element as active
  const activeInput = findActiveInputElement();
  if (activeInput && element.contains(activeInput)) {
    // The active input is within our element - use it
    // console.log('[Automobile Complete] Using tracked active input element:', activeInput.tagName, activeInput.id || activeInput.className);
    return activeInput;
  }
  
  // Check if element itself has focus
  if (document.activeElement === element) {
    return element;
  }
  
  // Check for selection within the element to find where text actually goes
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const commonAncestor = range.commonAncestorContainer;
    
    // If selection is within this element, find the containing element
    if (element.contains(commonAncestor)) {
      let node: Node | null = commonAncestor;
      // Walk up to find the closest element that's a child of our contenteditable
      while (node && node !== element) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          // If it's a text container (p, div, span) within our element, use it
          if (el.tagName === 'P' || el.tagName === 'DIV' || el.tagName === 'SPAN') {
            return el;
          }
        }
        node = node.parentNode;
      }
    }
  }
  
  // Check if a child element has focus
  const activeElement = document.activeElement;
  if (activeElement && element.contains(activeElement) && activeElement !== element) {
    if (activeElement instanceof HTMLElement) {
      // If it's a text container, use it
      if (activeElement.tagName === 'P' || activeElement.tagName === 'DIV' || activeElement.tagName === 'SPAN') {
        return activeElement;
      }
    }
  }
  
  // Check for common ProseMirror/rich text editor patterns
  // Look for the first <p> tag (common in ProseMirror)
  const firstP = element.querySelector('p');
  if (firstP) {
    return firstP as HTMLElement;
  }
  
  // Default: return the contenteditable element itself
  return element;
}

// Get text from element (handles both input/textarea and contenteditable)
export function getElementText(element: HTMLElement): string {
  if (isContentEditable(element)) {
    // Find the actual input element (might be a child like <p>)
    const actualElement = findActualInputElement(element);
    // Use innerText for better handling of visible text, fallback to textContent
    return actualElement.innerText || actualElement.textContent || '';
  } else {
    // For input/textarea, use value property
    return (element as HTMLInputElement | HTMLTextAreaElement).value || '';
  }
}

// Check if element is hidden
export function isElementHidden(element: HTMLElement): boolean {
  // Check computed style (most reliable)
  const style = window.getComputedStyle(element);
  if (style.display === 'none' || style.visibility === 'hidden') {
    return true;
  }
  // Check inline style
  if (element.style.display === 'none' || element.style.visibility === 'hidden') {
    return true;
  }
  // Check for fallback/hidden indicators
  if (element.hasAttribute('data-fallback') || element.classList.contains('fallback')) {
    return true;
  }
  // For textareas, check if it's a fallback (common pattern)
  if (element.tagName === 'TEXTAREA' && (element.classList.contains('fallback') || element.classList.contains('wcDTda_fallbackTextarea'))) {
    return true;
  }
  // Only use offsetParent as a hint for textareas/inputs (not contenteditable, which can have null offsetParent legitimately)
  if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
    if (element.offsetParent === null) {
      // Double-check with computed style - if display is none, it's definitely hidden
      if (style.display === 'none') {
        return true;
      }
      // Otherwise, offsetParent being null might be due to positioning, so don't treat as hidden
    }
  }
  return false;
}

// Helper to check if element is already attached (has the data attribute or wrapper)
export function isElementAttached(el: HTMLElement): boolean {
  return el.hasAttribute('data-automobile-complete-attached') || 
         el.parentElement?.classList.contains('autocomplete-wrapper') ||
         false;
}

// Start global keyboard tracking to detect which element receives input
export function startGlobalInputTracking() {
  if (globalInputTracker.isTracking) {
    return; // Already tracking
  }
  
  if (typeof document === 'undefined') {
    return; // Not in browser environment
  }
  
  globalInputTracker.isTracking = true;
  globalInputTracker.elementTextMap = new WeakMap();
  
  // Track all potential input elements and their text content
  const trackElementText = () => {
    const allInputs = document.querySelectorAll<HTMLElement>(
      'input, textarea, [contenteditable="true"]'
    );
    allInputs.forEach(el => {
      const text = getElementTextForTracking(el);
      globalInputTracker.elementTextMap.set(el, text);
    });
  };
  
  // Initial tracking
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    trackElementText();
  } else {
    document.addEventListener('DOMContentLoaded', trackElementText);
  }
  
  // Helper to try auto-attaching to any input element
  const tryAutoAttach = (element: HTMLElement) => {
    // FIRST check: Global registry (most reliable - prevents duplicate controllers)
    if (globalAttachedElements.has(element)) {
      const existingCleanup = globalAttachedElements.get(element);
      // If it's a placeholder, allow proceeding (previous attachment might have failed)
      // If it's a real cleanup function, the element is already attached
      if (existingCleanup && existingCleanup !== PLACEHOLDER_CLEANUP) {
        // console.warn('[Automobile Complete] BLOCKED in tryAutoAttach: Element already attached with cleanup function');
        return;
      }
      // If it's a placeholder, log and allow proceeding (attachAutocomplete will handle the check)
      // console.log('[Automobile Complete] Element has placeholder, allowing attachment attempt:', getElementInfo(element));
    }
    
    // SECOND check: Attribute and wrapper class (fast DOM check)
    const hasAttr = element.hasAttribute('data-automobile-complete-attached');
    const hasWrapper = element.parentElement?.classList.contains('autocomplete-wrapper');
    if (hasAttr || hasWrapper) {
      // console.warn('[Automobile Complete] BLOCKED in tryAutoAttach: Element has attribute:', hasAttr, 'or wrapper:', hasWrapper);
      return;
    }
    
    // Check if it's any kind of input element
    const isInput = element.tagName === 'INPUT' || 
                    element.tagName === 'TEXTAREA' || 
                    element.contentEditable === 'true' || 
                    element.isContentEditable;
    
    if (!isInput) {
      return;
    }
    
    // Check if element is hidden
    if (isElementHidden(element)) {
      return; // Skip hidden elements
    }
    
    // For textarea/input, check for common hidden patterns
    if (element.tagName === 'TEXTAREA' || element.tagName === 'INPUT') {
      // Skip fallback textareas (common in rich text editors)
      if (element.classList.contains('fallback') || 
          element.classList.contains('wcDTda_fallbackTextarea') ||
          element.hasAttribute('data-fallback')) {
        return;
      }
    }
    
    // Final check before attempting attachment (element might have been attached between checks)
    if (isElementAttached(element)) {
      return; // Already attached, skip
    }
    
    // Try to attach using any registered attachment functions
    for (const registry of autoAttachmentRegistry) {
      // Check WeakSet first (fastest check)
      if (registry.attachedElements.has(element)) {
        continue; // Already in this registry, skip
      }
      
      // Check element attribute again (might have been attached by another registry)
      if (isElementAttached(element)) {
        return; // Was just attached, skip all registries
      }
      
      try {
        // Final checks right before attaching (element might have been attached between checks)
        // Check attribute first (fastest)
        if (element.hasAttribute('data-automobile-complete-attached')) {
          // console.warn('[Automobile Complete] BLOCKED in registry: Element has attribute:', getElementInfo(element));
          return;
        }
        
        // Check wrapper
        if (element.parentElement?.classList.contains('autocomplete-wrapper')) {
          // console.warn('[Automobile Complete] BLOCKED in registry: Element has wrapper:', getElementInfo(element));
          return;
        }
        
        // Check global registry
        if (globalAttachedElements.has(element)) {
          const existingCleanup = globalAttachedElements.get(element);
          // If it's a placeholder, allow proceeding (might be stale)
          if (existingCleanup && existingCleanup !== PLACEHOLDER_CLEANUP) {
            // Element is already attached with a real cleanup function
            // console.warn('[Automobile Complete] BLOCKED in registry: Element already attached:', getElementInfo(element));
            return;
          }
          // If it's a placeholder, log and allow proceeding
          console.log('[Automobile Complete] Element has placeholder in registry, allowing attachment attempt:', getElementInfo(element));
        }
        
        // ONE MORE check right before calling attachFunction (final safety check)
        if (element.hasAttribute('data-automobile-complete-attached') ||
            element.parentElement?.classList.contains('autocomplete-wrapper')) {
          // console.warn('[Automobile Complete] BLOCKED in registry (final check): Element already attached:', getElementInfo(element));
          return;
        }
        
        if (globalAttachedElements.has(element)) {
          const existingCleanup = globalAttachedElements.get(element);
          if (existingCleanup && existingCleanup !== PLACEHOLDER_CLEANUP) {
            // console.warn('[Automobile Complete] BLOCKED in registry (final check): Element already attached:', getElementInfo(element));
            return;
          }
        }
        
        const elementInfo = getElementInfo(element);
        console.log('[Automobile Complete] Auto-attaching to input element detected by global tracker:', elementInfo, element);
        registry.attachFunction(element);
        registry.attachedElements.add(element);
        // Break after first successful attachment to avoid multiple attachments
        break;
      } catch (e) {
        console.warn('[Automobile Complete] Failed to auto-attach to element:', e);
      }
    }
  };
  
  // Track on focus
  document.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || 
                   target.contentEditable === 'true' || target.isContentEditable)) {
      globalInputTracker.activeElement = target;
      const text = getElementTextForTracking(target);
      globalInputTracker.elementTextMap.set(target, text);
      // console.log('[Automobile Complete] Global tracker: Focused element:', target.tagName, target.id || target.className);
      
      // Try to auto-attach to any input element
      tryAutoAttach(target);
    }
  }, true);
  
  // Track on keydown to detect which element receives keyboard input
  document.addEventListener('keydown', (e) => {
    // Only track printable characters and editing keys
    if (e.key.length === 1 || e.key === 'Backspace' || e.key === 'Delete' || 
        e.key === 'Enter' || e.key === 'Tab' || e.key.startsWith('Arrow')) {
      // Get the target element from the event
      const target = e.target as HTMLElement;
      
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || 
                     target.contentEditable === 'true' || target.isContentEditable)) {
        // This is an input element - track it
        globalInputTracker.activeElement = target;
        const text = getElementTextForTracking(target);
        globalInputTracker.elementTextMap.set(target, text);
        // console.log('[Automobile Complete] Global tracker: Keydown on input element:', target.tagName, target.id || target.className, 'key:', e.key);
        
        // Try to auto-attach to any input element
        tryAutoAttach(target);
      } else {
        // Check if document.activeElement is an input
        const activeEl = document.activeElement as HTMLElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || 
                         activeEl.contentEditable === 'true' || activeEl.isContentEditable)) {
          globalInputTracker.activeElement = activeEl;
          const text = getElementTextForTracking(activeEl);
          globalInputTracker.elementTextMap.set(activeEl, text);
          // console.log('[Automobile Complete] Global tracker: Keydown on active element:', activeEl.tagName, activeEl.id || activeEl.className, 'key:', e.key);
          
          // Try to auto-attach to any input element
          tryAutoAttach(activeEl);
        }
      }
    }
  }, true);
  
  // Also track on input events
  document.addEventListener('input', (e) => {
    const target = e.target as HTMLElement;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || 
                   target.contentEditable === 'true' || target.isContentEditable)) {
      globalInputTracker.activeElement = target;
      const text = getElementTextForTracking(target);
      globalInputTracker.elementTextMap.set(target, text);
      
      // Try to auto-attach to any input element
      tryAutoAttach(target);
    }
  }, true);
  
  console.log('[Automobile Complete] Global input tracking started');
}

