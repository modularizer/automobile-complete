/**
 * Universal autocomplete attachment utility for HTML inputs.
 * Works with any HTML input element - vanilla JS, React, Vue, Angular, etc.
 * 
 * This uses the standard CSS overlay pattern:
 * - Wraps input in a container with position: relative
 * - Creates an overlay div with position: absolute
 * - Overlay shows typed text + gray suggestion text
 * - Overlay is transparent to pointer events
 * 
 * @example
 * ```html
 * <input id="myInput" type="text" />
 * <script>
 *   const controller = new AutocompleteTextController(completionList);
 *   attachAutocomplete(document.getElementById('myInput'), controller);
 * </script>
 * ```
 */

import {AutocompleteTextController, AutocompleteTextControllerOptions} from "../engine/AutocompleteTextController";
import {
  attachingElements,
  globalAttachedElements,
  PLACEHOLDER_CLEANUP,
  getElementInfo,
  isContentEditable
} from "./elementDetection";
import {
  AttachAutocompleteOptions,
  getDefaultSelector,
  handleUrlController,
  resolveController,
  splitOptions,
  exposeControllerToWindow,
  DEFAULT_ATTACHMENT_OPTIONS,
  DEFAULT_SELECTOR
} from "./config";
import {attachAutocompleteBySelector} from "./selectorAttachment";
import {CompletionOverlay} from "./overlay";
import {getTextManipulator} from "./textManipulation";

// Re-export for backwards compatibility
export type { AttachAutocompleteOptions };

/**
 * Attaches autocomplete to any HTML input element.
 * 
 * This function:
 * 1. Wraps the input in a container div
 * 2. Creates an overlay div that shows the suggestion text
 * 3. Attaches event handlers (input, keydown)
 * 4. Updates the overlay when controller state changes
 * 
 * @param el - The HTML input element to attach autocomplete to
 * @param controller - The AutocompleteTextController instance
 * @param options - Optional configuration
 * @returns Cleanup function to detach autocomplete
 */
export function attachAutocomplete(
  inputElement?: HTMLInputElement | HTMLTextAreaElement | HTMLElement | string,
  controller?: AutocompleteTextController | string,
  options?: AttachAutocompleteOptions & AutocompleteTextControllerOptions
): () => void {
  
  // Handle parameter loading and configuration
  // If inputElement is a string, route to selector-based attachment
  if (typeof inputElement === 'string') {
    const selector = inputElement;
    
    // If controller is a URL, fetch it first
    if (typeof controller === 'string' && (controller.startsWith('http://') || controller.startsWith('https://'))) {
      return handleUrlController(controller, selector, options, (el, ctrl, opts) => {
        if (typeof el === 'string') {
          return attachAutocompleteBySelector(el, ctrl, opts);
        }
        return attachAutocomplete(el, ctrl, opts);
      });
    }
    
    // Resolve controller for selector-based attachment
    const resolvedController = resolveController(controller, options);
    const { attachmentOptions } = splitOptions(options);
    exposeControllerToWindow(resolvedController);
    
    return attachAutocompleteBySelector(selector, resolvedController, attachmentOptions);
  }
  
  // If inputElement is undefined, use default selector
  if (inputElement === undefined) {
    const selector = DEFAULT_SELECTOR;
    
    // If controller is a URL, fetch it first
    if (typeof controller === 'string' && (controller.startsWith('http://') || controller.startsWith('https://'))) {
      return handleUrlController(controller, selector, options, (el, ctrl, opts) => {
        if (typeof el === 'string') {
          return attachAutocompleteBySelector(el, ctrl, opts);
        }
        return attachAutocomplete(el, ctrl, opts);
      });
    }
    
    // Resolve controller for selector-based attachment
    const resolvedController = resolveController(controller, options);
    const { attachmentOptions } = splitOptions(options);
    exposeControllerToWindow(resolvedController);
    
    return attachAutocompleteBySelector(selector, resolvedController, attachmentOptions);
  }
  
  // From here on, inputElement is guaranteed to be HTMLElement (not string)
  const el = inputElement as HTMLElement;
  
  // Get text manipulator for this element type
  const textManipulator = getTextManipulator(el);
  
  // If controller is a URL, fetch it
  if (typeof controller === 'string' && (controller.startsWith('http://') || controller.startsWith('https://'))) {
    return handleUrlController(controller, el, options, attachAutocomplete);
  }
  
  // Resolve controller (always creates a new AutocompleteTextController instance)
  // If a controller instance is passed, it will be cloned via resolveController
  const resolvedController = resolveController(controller, options);
  
  // Split options into controller options and attachment options
  const { attachmentOptions } = splitOptions(options);
  
  // Expose controller to window for debugging
  exposeControllerToWindow(resolvedController);
  
  // Use resolved controller and attachment options from here on
  controller = resolvedController;
  options = attachmentOptions;

  // Single source of truth: check global registry
  const existingCleanup = globalAttachedElements.get(el);
  if (existingCleanup && existingCleanup !== PLACEHOLDER_CLEANUP) {
    // Already attached - return existing cleanup
    return existingCleanup;
  }
  
  // Clean up stale placeholder if present
  if (existingCleanup === PLACEHOLDER_CLEANUP) {
    globalAttachedElements.delete(el);
    attachingElements.delete(el);
    el.removeAttribute('data-automobile-complete-attached');
  }
  
  // Check if currently being attached (prevents concurrent attachments)
  if (attachingElements.has(el)) {
    return () => {};
  }


  // Handle ancestor/descendant conflicts: prefer child over parent
  const attachedInputDescendant = el.querySelector('input[data-automobile-complete-attached], textarea[data-automobile-complete-attached], [contenteditable="true"][data-automobile-complete-attached]');
  if (attachedInputDescendant) {
    return () => {};
  }
  
  // Check if any ancestor is attached - detach it to attach to child instead
  let ancestor = el.parentElement;
  while (ancestor) {
    const ancestorCleanup = globalAttachedElements.get(ancestor);
    if (ancestorCleanup && ancestorCleanup !== PLACEHOLDER_CLEANUP) {
      ancestorCleanup();
      globalAttachedElements.delete(ancestor);
      attachingElements.delete(ancestor);
      ancestor.removeAttribute('data-automobile-complete-attached');
      break;
    }
    ancestor = ancestor.parentElement;
  }
  
  // Atomic operation: set locks
  attachingElements.add(el);
  el.setAttribute('data-automobile-complete-attached', 'true');
  globalAttachedElements.set(el, PLACEHOLDER_CLEANUP);
  
  console.info('[Automobile Complete] Attaching autocomplete to element:', el);
  
  // Wrap attachment logic in try-catch to ensure cleanup on failure
  try {
  
  // Create overlay component
  const overlay = new CompletionOverlay(el, controller);
  
  // Set controller ref
  const ref = { current: el };
  controller.setInputRef(ref);
  
  // Store original caret color and set to green for monitored elements
  const originalCaretColor = el.style.caretColor;
  el.style.caretColor = 'green';

  // Update overlay based on current element text - never modifies the element
  const updateOverlayFromElement = () => {
    const currentText = textManipulator.getText(el);
    controller.handleTextChange(currentText);
    overlay.update();
  };

  // Handle keydown - only modify text on Tab, otherwise just update overlay
  const handleKeyDown = (e: KeyboardEvent) => {
    const key = e.key;
    
    // If Tab is pressed and we have a suggestion, accept it (ONLY time we modify text)
    if (key === 'Tab' && controller.suggestion) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      
      // Get the completion suffix to insert
      const completion = controller.suggestion;
      
      // Process Tab in controller to update its internal state
      controller.handleKeyPress(e);
      
      // ONLY place we modify the element text - insert completion at cursor position
      // This doesn't touch existing text, just inserts the completion
      textManipulator.insertTextAtCursor(el, completion);
      
      // Update overlay
      overlay.update();
      
      return;
    }
    
    // For all other keys, just update overlay after native handler processes the key
    // Use requestAnimationFrame to read text after native handler updates it
    requestAnimationFrame(updateOverlayFromElement);
  };

  // Handle input events - only update overlay, never modify text
  const handleInput = () => {
    updateOverlayFromElement();
  };

  // Attach listeners - use capture phase for keydown to intercept Tab
  el.addEventListener('keydown', handleKeyDown, true);
  el.addEventListener('input', handleInput, false);

  // Initial update - use setTimeout to ensure styles are computed
  setTimeout(() => {
    const currentText = textManipulator.getText(el);
    controller.handleTextChange(currentText);
    overlay.update();
  }, 0);

    // Create cleanup function
    const cleanup = () => {
      el.removeEventListener('keydown', handleKeyDown, true);
      el.removeEventListener('input', handleInput, false);
      el.removeAttribute('data-automobile-complete-attached');
      // Restore original caret color
      if (originalCaretColor) {
        el.style.caretColor = originalCaretColor;
      } else {
        el.style.removeProperty('caret-color');
      }
      attachingElements.delete(el);
      globalAttachedElements.delete(el);
      overlay.destroy();
    };
    globalAttachedElements.set(el, cleanup);
    return cleanup;
  } catch (error) {
    // If attachment fails, clean up the placeholder and re-throw
    console.error('[Automobile Complete] Error during attachment, cleaning up placeholder:', error, getElementInfo(el), el);
    globalAttachedElements.delete(el);
    attachingElements.delete(el);
    el.removeAttribute('data-automobile-complete-attached');
    throw error;
  }
}
