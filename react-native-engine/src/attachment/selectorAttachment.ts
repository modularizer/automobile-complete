/**
 * Selector-based attachment logic.
 * Handles finding elements by query selector, MutationObserver setup, and auto-attachment.
 * This is separate from the actual attachment logic which only works with a single HTMLElement.
 */

import {AutocompleteTextController, AutocompleteTextControllerOptions} from "../engine/AutocompleteTextController";
import {AttachAutocompleteOptions} from "./config";
import {attachAutocomplete} from "./attachAutocomplete";
import {
  autoAttachmentRegistry,
  processingSelectors,
  globalAttachedElements,
  attachingElements,
  PLACEHOLDER_CLEANUP,
  getElementInfo,
  isElementHidden,
  isContentEditable,
  startGlobalInputTracking
} from "./elementDetection";

/**
 * Attach autocomplete to all elements matching a CSS selector.
 * Sets up MutationObserver to watch for new elements matching the selector.
 * 
 * @param selector - CSS selector string
 * @param controller - AutocompleteTextController instance or completion list string
 * @param options - Optional configuration
 * @returns Cleanup function to stop watching and detach all
 */
export function attachAutocompleteBySelector(
  selector: string,
  controller: AutocompleteTextController | string,
  options?: AttachAutocompleteOptions & AutocompleteTextControllerOptions
): () => void {
  // Prevent duplicate selector-based attachments (race condition protection)
  if (processingSelectors.has(selector)) {
    console.warn('[Automobile Complete] Selector already being processed, skipping:', selector);
    return () => {}; // Return empty cleanup function
  }
  processingSelectors.add(selector);
  
  // Start global input tracking if not already started
  if (typeof document !== 'undefined') {
    startGlobalInputTracking();
  }
  
  const cleanupFunctions: (() => void)[] = [];
  const attachedElements = new WeakSet<HTMLElement>();
  
  // CRITICAL: Store completion list string (not controller instance) for auto-attachment
  // This ensures each element gets its own controller instance
  // If a controller instance is passed, extract its completion list
  const completionListString = typeof controller === 'string' 
    ? controller 
    : controller instanceof AutocompleteTextController
    ? controller.originalCompletionList
    : null;
  if (!completionListString) {
    throw new Error('Selector-based attachment requires a completion list string or controller instance. Each element must get its own controller.');
  }
  
  // If controller is an instance, also store its options for cloning
  const controllerOptions = controller instanceof AutocompleteTextController 
    ? controller.getOptions() 
    : undefined;
  
  const attachToElement = (el: HTMLElement, skipSelectorCheck = false) => {
    // FIRST CHECK: Is this element already in our attachedElements WeakSet?
    if (attachedElements.has(el)) {
      // console.warn('[Automobile Complete] BLOCKED in attachToElement: Element already in attachedElements WeakSet:', getElementInfo(el));
      return;
    }
    
    // SECOND CHECK: Fast DOM checks
    if (el.hasAttribute('data-automobile-complete-attached')) {
      // console.warn('[Automobile Complete] BLOCKED in attachToElement: Element has attribute:', getElementInfo(el));
      return;
    }
    
    if (el.parentElement?.classList.contains('autocomplete-wrapper')) {
      // console.warn('[Automobile Complete] BLOCKED in attachToElement: Element has wrapper:', getElementInfo(el));
      return;
    }
    
    // THIRD CHECK: Global registry
    if (globalAttachedElements.has(el)) {
      const existingCleanup = globalAttachedElements.get(el);
      if (existingCleanup && existingCleanup !== PLACEHOLDER_CLEANUP) {
        // console.warn('[Automobile Complete] BLOCKED in attachToElement: Element already in global registry:', getElementInfo(el));
        return;
      }
    }
    
    // Check if any descendant INPUT ELEMENT is already attached - if so, prefer child over parent
    const attachedInputDescendant = el.querySelector('input[data-automobile-complete-attached], textarea[data-automobile-complete-attached], [contenteditable="true"][data-automobile-complete-attached]');
    if (attachedInputDescendant) {
      // console.log('[Automobile Complete] Child input element already attached, skipping parent:', getElementInfo(el));
      return;
    }
    
    // Check if any ancestor is attached - if so, detach ancestor and attach to this child instead
    let ancestor = el.parentElement;
    let attachedAncestor: HTMLElement | null = null;
    while (ancestor) {
      if (ancestor.hasAttribute('data-automobile-complete-attached') || 
          ancestor.classList.contains('autocomplete-wrapper') ||
          globalAttachedElements.has(ancestor)) {
        attachedAncestor = ancestor as HTMLElement;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    
    // If we found an attached ancestor, detach it first (prefer child over parent)
    if (attachedAncestor) {
      // console.log('[Automobile Complete] Detaching from parent to attach to child:', getElementInfo(attachedAncestor), '->', getElementInfo(el));
      const ancestorCleanup = globalAttachedElements.get(attachedAncestor);
      if (ancestorCleanup) {
        ancestorCleanup(); // Detach the parent
      }
      // Clean up the ancestor's state
      globalAttachedElements.delete(attachedAncestor);
      attachingElements.delete(attachedAncestor);
      attachedAncestor.removeAttribute('data-automobile-complete-attached');
    }
    
    // FIRST check: Global registry (prevents duplicate controllers across all calls)
    if (globalAttachedElements.has(el)) {
      const existingCleanup = globalAttachedElements.get(el);
      // If it's a placeholder, allow proceeding (previous attachment might have failed)
      // If it's a real cleanup function, the element is already attached
      if (existingCleanup && existingCleanup !== PLACEHOLDER_CLEANUP) {
        // Already attached globally, skip silently
        return;
      }
      // If it's a placeholder, log and allow proceeding (attachAutocomplete will handle the check)
      // console.log('[Automobile Complete] Element has placeholder in attachToElement, allowing attachment attempt:', getElementInfo(el));
    }
    
    // SECOND check: Skip if element itself is already attached (check attribute first - most reliable)
    if (el.hasAttribute('data-automobile-complete-attached') || 
        el.parentElement?.classList.contains('autocomplete-wrapper')) {
      // Already attached, skip silently
      return;
    }
    
    // THIRD check: Skip if already in our WeakSet
    if (attachedElements.has(el)) {
      return;
    }
    
    // Check if element matches selector (unless skipSelectorCheck is true, which allows contenteditable auto-attachment)
    if (!skipSelectorCheck) {
      try {
        // Use matches() to verify element matches the selector
        if (!el.matches || !el.matches(selector)) {
          return;
        }
      } catch (e) {
        // Invalid selector, skip
        // console.warn('[Automobile Complete] Invalid selector for mutation observer:', selector, e);
        return;
      }
    } else {
      // For auto-attachment, allow any input element (input, textarea, contenteditable)
      const isInput = el.tagName === 'INPUT' || 
                     el.tagName === 'TEXTAREA' || 
                     el.contentEditable === 'true' || 
                     el.isContentEditable;
      if (!isInput) {
        return;
      }
    }
    
    if (isElementHidden(el)) {
      // console.log(`%c[Automobile Complete] Skipping hidden element:`, 'color: #FF9800; font-weight: bold;', getElementInfo(el));
      // console.info(`[Automobile Complete] Skipping hidden element:`, getElementInfo(el));
      return;
    }
    
    // Final check right before attaching (element might have been attached between checks)
    if (el.hasAttribute('data-automobile-complete-attached')) {
      // console.warn('[Automobile Complete] BLOCKED in attachToElement: Element has attribute:', getElementInfo(el));
      return;
    }
    
    if (el.parentElement?.classList.contains('autocomplete-wrapper')) {
      // console.warn('[Automobile Complete] BLOCKED in attachToElement: Element has wrapper:', getElementInfo(el));
      return;
    }
    
    // Check global registry one more time
    if (globalAttachedElements.has(el)) {
      const existingCleanup = globalAttachedElements.get(el);
      if (existingCleanup && existingCleanup !== PLACEHOLDER_CLEANUP) {
        // console.warn('[Automobile Complete] BLOCKED in attachToElement: Element already in global registry:', getElementInfo(el));
        return;
      }
      // If it's a placeholder, log and allow proceeding
      // console.log('[Automobile Complete] Element has placeholder in attachToElement, allowing attachment attempt:', getElementInfo(el));
    }
    
    // Check if currently being attached
    if (attachingElements.has(el)) {
      // console.warn('[Automobile Complete] BLOCKED in attachToElement: Element currently being attached:', getElementInfo(el));
      return;
    }
    
    // Add to attachedElements IMMEDIATELY to prevent concurrent calls
    // This must happen BEFORE calling attachAutocomplete
    attachedElements.add(el);
    
    const elementInfo = getElementInfo(el);
    console.log(`%c[Automobile Complete] Attaching to element:`, 'color: #4CAF50; font-weight: bold;', elementInfo, el);
    console.info(`[Automobile Complete] Attaching to element:`, elementInfo, el);
    
    try {
      // CRITICAL: Always pass the completion list string (or URL), never a controller instance
      // This ensures each element gets its own controller instance via resolveController
      // attachAutocomplete will create a new controller for each element
      // Merge controller options if we have them from a cloned controller
      const elementOptions = controllerOptions 
        ? { ...options, ...controllerOptions }
        : options;
      const cleanup = attachAutocomplete(el, completionListString, elementOptions);
      // Check if attachment actually succeeded by verifying the element has the attribute or wrapper
      // If not, it was blocked/aborted, so remove from attachedElements
      if (!el.hasAttribute('data-automobile-complete-attached') && 
          !el.parentElement?.classList.contains('autocomplete-wrapper')) {
        console.warn('[Automobile Complete] Attachment was blocked, removing from attachedElements:', getElementInfo(el));
        attachedElements.delete(el);
      } else {
        cleanupFunctions.push(cleanup);
      }
    } catch (error) {
      // If attachment fails, remove from attachedElements
      console.error('[Automobile Complete] Attachment failed, removing from attachedElements:', error, getElementInfo(el));
      attachedElements.delete(el);
      throw error;
    }
  };
  
  // Register this attachment function for auto-attachment to contenteditable elements
  // completionListString is already validated above to be a string
  const registryEntry = {
    completionList: completionListString, // Must be a string (completion list or URL)
    options: options,
    attachedElements: attachedElements,
    attachFunction: (el: HTMLElement) => attachToElement(el, true) // Skip selector check for auto-attachment
  };
  autoAttachmentRegistry.push(registryEntry);
  
  const attachToElements = () => {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    console.log(`%c[Automobile Complete] Found ${elements.length} element(s) matching selector: "${selector}"`, 'color: #2196F3; font-weight: bold;');
    console.info(`[Automobile Complete] Found ${elements.length} element(s) matching selector: "${selector}"`);
    
    // Filter out elements that are not actual inputs
    const actualInputs: HTMLElement[] = [];
    
    elements.forEach((el) => {
      // Skip hidden elements
      if (isElementHidden(el)) {
        console.log(`%c[Automobile Complete] Skipping hidden element in selector:`, 'color: #FF9800; font-weight: bold;', getElementInfo(el));
        console.info(`[Automobile Complete] Skipping hidden element in selector:`, getElementInfo(el));
        return;
      }
      
      // Skip if element or its parent/child is already attached (prevent nested attachments)
      if (el.hasAttribute('data-automobile-complete-attached') || 
          el.parentElement?.classList.contains('autocomplete-wrapper') ||
          el.querySelector('[data-automobile-complete-attached]')) {
        console.log(`%c[Automobile Complete] Skipping element (already attached or has attached parent/child):`, 'color: #FF9800; font-weight: bold;', getElementInfo(el));
        console.info(`[Automobile Complete] Skipping element (already attached or has attached parent/child):`, getElementInfo(el));
        return;
      }
      
      // For contenteditable, always attach (we'll find the actual input element via tracking)
      if (isContentEditable(el)) {
        actualInputs.push(el);
      } else {
        // Regular input/textarea
        actualInputs.push(el);
      }
    });
    
    console.log(`%c[Automobile Complete] Attaching to ${actualInputs.length} actual input element(s)`, 'color: #4CAF50; font-weight: bold;');
    actualInputs.forEach((el) => {
      attachToElement(el);
    });
  };
  
  // If document is already loaded, attach immediately
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    attachToElements();
  } else {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', attachToElements);
    } else {
      // Fallback: wait for window load
      window.addEventListener('load', attachToElements);
    }
  }
  
  // Set up MutationObserver to watch for new input elements
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      // Check added nodes
      Array.from(mutation.addedNodes).forEach(node => {
        // If it's an input or textarea, check if it matches
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          
          // Check if the added node itself matches
          if (element.matches && (element.matches('input') || element.matches('textarea') || element.matches('[contenteditable="true"]'))) {
            attachToElement(element);
          }
          
          // Check for inputs/textareas/contenteditable within the added node
          // BUT skip any that are children of already-attached elements
          const inputs = element.querySelectorAll<HTMLElement>('input, textarea, [contenteditable="true"]');
          Array.from(inputs).forEach(input => {
            // Skip if this input is inside an already-attached element
            let parent = input.parentElement;
            let skip = false;
            while (parent && parent !== element) {
              if (parent.hasAttribute('data-automobile-complete-attached') || 
                  parent.classList.contains('autocomplete-wrapper')) {
                skip = true;
                break;
              }
              parent = parent.parentElement;
            }
            if (!skip) {
              attachToElement(input);
            }
          });
        }
      });
    }
  });
  
  // Start observing the entire document for new elements
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });
  
  console.log(`%c[Automobile Complete] MutationObserver set up to watch for new input elements matching: "${selector}"`, 'color: #9C27B0; font-weight: bold;');
  console.info(`[Automobile Complete] MutationObserver set up to watch for new input elements matching: "${selector}"`);
  
  // Return cleanup function that removes all listeners and stops observer
  return () => {
    observer.disconnect();
    cleanupFunctions.forEach(cleanup => cleanup());
    // Remove this registry entry
    const index = autoAttachmentRegistry.indexOf(registryEntry);
    if (index >= 0) {
      autoAttachmentRegistry.splice(index, 1);
    }
    // Remove selector from processing set
    processingSelectors.delete(selector);
    console.log('[Automobile Complete] MutationObserver disconnected and cleanup functions called');
  };
}

