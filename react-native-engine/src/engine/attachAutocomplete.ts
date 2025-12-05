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

import { AutocompleteTextController } from "./AutocompleteTextController";

export interface AttachAutocompleteOptions {
  /**
   * CSS class name for the wrapper container (default: 'autocomplete-wrapper')
   */
  wrapperClass?: string;
  
  /**
   * CSS class name for the overlay element (default: 'autocomplete-overlay')
   */
  overlayClass?: string;
  
  /**
   * CSS class name for the suggestion text (default: 'autocomplete-suggestion')
   */
  suggestionClass?: string;
  
  /**
   * Custom CSS styles to inject (optional)
   */
  customStyles?: string;
}

/**
 * Attaches autocomplete to any HTML input element.
 * 
 * This function:
 * 1. Wraps the input in a container div
 * 2. Creates an overlay div that shows the suggestion text
 * 3. Attaches event handlers (input, keydown)
 * 4. Updates the overlay when controller state changes
 * 
 * @param inputElement - The HTML input element to attach autocomplete to
 * @param controller - The AutocompleteTextController instance
 * @param options - Optional configuration
 * @returns Cleanup function to detach autocomplete
 */
export function attachAutocomplete(
  inputElement: HTMLInputElement | HTMLTextAreaElement,
  controller: AutocompleteTextController,
  options: AttachAutocompleteOptions = {}
): () => void {
  const {
    wrapperClass = 'autocomplete-wrapper',
    overlayClass = 'autocomplete-overlay',
    suggestionClass = 'autocomplete-suggestion',
    customStyles,
  } = options;

  // Check if already attached
  if (inputElement.parentElement?.classList.contains(wrapperClass)) {
    console.warn('Autocomplete already attached to this input');
    return () => {};
  }

  // Create wrapper
  const wrapper = document.createElement('div');
  wrapper.className = wrapperClass;
  
  // Create overlay
  const overlay = document.createElement('div');
  overlay.className = overlayClass;
  
  // Insert wrapper before input
  const parent = inputElement.parentElement;
  if (!parent) {
    throw new Error('Input element must have a parent');
  }
  
  parent.insertBefore(wrapper, inputElement);
  wrapper.appendChild(inputElement);
  wrapper.appendChild(overlay);

  // Set controller ref
  const ref = { current: inputElement };
  controller.setInputRef(ref);

  // Inject default styles if not already present
  if (!document.getElementById('autocomplete-styles')) {
    const styleSheet = document.createElement('style');
    styleSheet.id = 'autocomplete-styles';
    styleSheet.textContent = getDefaultStyles(customStyles);
    document.head.appendChild(styleSheet);
  }

  // Update overlay content
  const updateOverlay = () => {
    const text = controller.text;
    const suggestion = controller.suggestion;
    
    // Match input's computed styles exactly
    const inputStyles = window.getComputedStyle(inputElement);
    
    // Copy all relevant styles to match input positioning
    overlay.style.fontSize = inputStyles.fontSize;
    overlay.style.fontFamily = inputStyles.fontFamily;
    overlay.style.fontWeight = inputStyles.fontWeight;
    overlay.style.fontStyle = inputStyles.fontStyle;
    overlay.style.lineHeight = inputStyles.lineHeight;
    overlay.style.padding = inputStyles.padding;
    overlay.style.paddingLeft = inputStyles.paddingLeft;
    overlay.style.paddingRight = inputStyles.paddingRight;
    overlay.style.paddingTop = inputStyles.paddingTop;
    overlay.style.paddingBottom = inputStyles.paddingBottom;
    overlay.style.border = inputStyles.border;
    overlay.style.borderRadius = inputStyles.borderRadius;
    overlay.style.boxSizing = inputStyles.boxSizing;
    overlay.style.textAlign = inputStyles.textAlign;
    overlay.style.width = inputStyles.width;
    overlay.style.height = inputStyles.height;
    overlay.style.minHeight = inputStyles.minHeight;
    overlay.style.letterSpacing = inputStyles.letterSpacing;
    overlay.style.textIndent = inputStyles.textIndent;
    
    // Match vertical alignment - inputs are typically centered, textareas start at top
    if (inputElement.tagName === 'INPUT') {
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.flexWrap = 'nowrap';
    } else if (inputElement.tagName === 'TEXTAREA') {
      overlay.style.display = 'block';
    }
    
    // Update content - typed text is transparent, suggestion is gray
    // Use inline spans so text flows naturally
    if (suggestion) {
      overlay.innerHTML = `
        <span style="color: transparent; white-space: pre;">${escapeHtml(text)}</span><span class="${suggestionClass}">${escapeHtml(suggestion)}</span>
      `;
    } else {
      overlay.innerHTML = `<span style="color: transparent; white-space: pre;">${escapeHtml(text)}</span>`;
    }
  };

  // Event handlers
  const handleInput = (e: Event) => {
    const target = e.target as HTMLInputElement;
    controller.handleTextChange(target.value);
    // Small delay to ensure DOM updates
    requestAnimationFrame(() => {
      updateOverlay();
    });
  };

  const handleKeyDown = (e: Event) => {
    const keyEvent = e as KeyboardEvent;
    const key = keyEvent.key;
    
    // Check if this is a key that accepts suggestions (Tab or Enter)
    const isAcceptKey = key === 'Tab' || (key === 'Enter' && (controller.maxLines === null || controller.maxLines === 1));
    
    // Store old value to detect if text was extended (suggestion accepted)
    const oldValue = inputElement.value;
    const oldCursorPos = inputElement.selectionStart || 0;
    
    // Mark that we might be accepting a suggestion
    if (isAcceptKey) {
      acceptingSuggestion = true;
    }
    
    controller.handleKeyPress(keyEvent);
    updateOverlay();
    
    // Update input value if controller changed it
    const controllerText = controller.text;
    if (inputElement.value !== controllerText) {
      inputElement.value = controllerText;
      
      // If a suggestion was accepted (text got longer), move cursor to end
      // Otherwise, try to preserve cursor position
      setTimeout(() => {
        if (isAcceptKey && controllerText.length > oldValue.length) {
          // Suggestion accepted - move cursor to end
          inputElement.setSelectionRange(controllerText.length, controllerText.length);
          acceptingSuggestion = false;
        } else {
          // Normal typing - preserve cursor position
          const newPos = Math.min(oldCursorPos, controllerText.length);
          inputElement.setSelectionRange(newPos, newPos);
          acceptingSuggestion = false;
        }
      }, 0);
    } else {
      acceptingSuggestion = false;
    }
  };

  // Attach event listeners
  inputElement.addEventListener('input', handleInput);
  inputElement.addEventListener('keydown', handleKeyDown);
  
  // Track if we're in the middle of accepting a suggestion
  let acceptingSuggestion = false;
  
  // Subscribe to controller changes
  const unsubscribe = controller.subscribe(() => {
    requestAnimationFrame(() => {
      updateOverlay();
    });
    // Sync input value
    const controllerText = controller.text;
    if (inputElement.value !== controllerText) {
      const oldValue = inputElement.value;
      inputElement.value = controllerText;
      
      setTimeout(() => {
        // If text got longer (suggestion accepted), move cursor to end
        // Otherwise preserve cursor position
        if (acceptingSuggestion && controllerText.length > oldValue.length) {
          inputElement.setSelectionRange(controllerText.length, controllerText.length);
          acceptingSuggestion = false;
        } else {
          const cursorPos = inputElement.selectionStart || 0;
          const newPos = Math.min(cursorPos, controllerText.length);
          inputElement.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  });

  // Initial update - use setTimeout to ensure styles are computed
  setTimeout(() => {
    updateOverlay();
  }, 0);

  // Cleanup function
  return () => {
    inputElement.removeEventListener('input', handleInput);
    inputElement.removeEventListener('keydown', handleKeyDown);
    unsubscribe();
    
    // Restore original structure
    if (wrapper.parentElement) {
      wrapper.parentElement.insertBefore(inputElement, wrapper);
      wrapper.remove();
    }
  };
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getDefaultStyles(customStyles?: string): string {
  return `
    .autocomplete-wrapper {
      position: relative;
      display: inline-block;
      width: 100%;
    }
    
    .autocomplete-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      white-space: nowrap;
      word-wrap: normal;
      overflow: hidden;
      z-index: 1;
    }
    
    .autocomplete-wrapper textarea + .autocomplete-overlay {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    
    .autocomplete-suggestion {
      color: #999;
    }
    
    .autocomplete-wrapper input,
    .autocomplete-wrapper textarea {
      position: relative;
      background: transparent;
      z-index: 2;
    }
    
    ${customStyles || ''}
  `;
}

