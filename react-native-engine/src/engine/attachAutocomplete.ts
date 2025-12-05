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

import {AutocompleteTextController, AutocompleteTextControllerOptions} from "./AutocompleteTextController";

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
  
  /**
   * If true, use paste events instead of directly setting the value.
   * In this mode, the suggestion overlay is hidden and the element handles everything natively.
   * This ensures we stay in sync with what the element actually thinks its value is.
   */
  usePasteEvents?: boolean;
  
  /**
   * If true, simulate typing each character one by one (keydown, keypress, input, keyup for each char).
   * This makes it look like the user typed the suggestion character by character.
   * Cannot be used together with usePasteEvents.
   */
  simulateTyping?: boolean;
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
 * @param el - The HTML input element to attach autocomplete to
 * @param controller - The AutocompleteTextController instance
 * @param options - Optional configuration
 * @returns Cleanup function to detach autocomplete
 */
export function attachAutocomplete(
  inputElement: HTMLInputElement | HTMLTextAreaElement | string,
  controller: AutocompleteTextController | string,
  options: AttachAutocompleteOptions & AutocompleteTextControllerOptions
): () => void {

  // If inputElement is a string, treat it as a query selector
  if (typeof inputElement === 'string') {
    const selector = inputElement;
    const cleanupFunctions: (() => void)[] = [];
    
    const attachToElements = () => {
      const elements = document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(selector);
      elements.forEach((el) => {
        const cleanup = attachAutocomplete(el, controller, options);
        cleanupFunctions.push(cleanup);
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
    
    // Return cleanup function that removes all listeners
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
    };
  }
  
  // From here on, inputElement is guaranteed to be HTMLInputElement | HTMLTextAreaElement
  // Use a local variable to avoid shadowing the parameter
  const el = inputElement as HTMLInputElement | HTMLTextAreaElement;
  
  // Handle controller initialization
  if (typeof controller === "string") {
    // split options
    const o = {};
    for (let k of ["maxCompletions", "tabBehavior", "tabSpacesCount", "maxLines"]){
      //@ts-ignore
      if (options[k] !== undefined) {
        //@ts-ignore
        o[k] = options[k];
        //@ts-ignore
        delete options[k];
      }
    }
    controller = new AutocompleteTextController(controller, o);
  }
  
  const {
    wrapperClass = 'autocomplete-wrapper',
    overlayClass = 'autocomplete-overlay',
    suggestionClass = 'autocomplete-suggestion',
    customStyles,
    usePasteEvents = false,
    simulateTyping = false,
  } = options;
  
  // Validate mode options
  if (usePasteEvents && simulateTyping) {
    throw new Error('Cannot use both usePasteEvents and simulateTyping - choose one mode');
  }

  // Check if already attached
  if (el.parentElement?.classList.contains(wrapperClass)) {
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
  const parent = el.parentElement;
  if (!parent) {
    throw new Error('Input element must have a parent');
  }
  
  parent.insertBefore(wrapper, el);
  wrapper.appendChild(el);
  wrapper.appendChild(overlay);

  // Set controller ref
  const ref = { current: el };
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
    const inputStyles = window.getComputedStyle(el);
    
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
    if (el.tagName === 'INPUT') {
      overlay.style.display = 'flex';
      overlay.style.alignItems = 'center';
      overlay.style.flexWrap = 'nowrap';
    } else if (el.tagName === 'TEXTAREA') {
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

  // Store original on* property handlers if they exist
  const originalOnInput = (el as any).oninput;
  const originalOnKeyDown = (el as any).onkeydown;
  const originalOnKeyUp = (el as any).onkeyup;
  
  // Track if we're in the middle of accepting a suggestion
  let acceptingSuggestion = false;
  let shouldPreventTabKeyUp = false;
  let acceptanceTimeoutId: number | null = null;
  let inputEventDispatchedForAcceptance = false; // Module-level flag to prevent multiple dispatches
  
  // Event handlers - call our handler first, then existing handler
  const handleInput = (e: Event) => {
      // console.log("handlingInput", e);
    const isOurEvent = (e as any).__autocompleteDispatched;
    
    // If this is our event and we're accepting a suggestion, we've already handled it
    // Don't let it propagate or get re-dispatched, and don't call originalOnInput again
    if (isOurEvent && acceptingSuggestion) {
      // This is our dispatched event during suggestion acceptance
      // We already called originalOnInput manually before dispatching
      // Don't call it again here to avoid duplicates
      return;
    }
    
    // Skip controller processing if this is an event we dispatched ourselves
    // OR if we're in the middle of accepting a suggestion (to avoid double processing)
    if (!isOurEvent && !acceptingSuggestion) {
      const target = e.target as HTMLInputElement;
      
      // Our handler first
      controller.handleTextChange(target.value);
      // Small delay to ensure DOM updates
      requestAnimationFrame(() => {
        updateOverlay();
      });
      
      // Don't call originalOnInput here - the browser already called it for native events
      // We only need to call it manually for events we dispatch ourselves
    } else if (isOurEvent && !acceptingSuggestion) {
      // For our dispatched events when NOT accepting (shouldn't happen, but just in case)
      // Rely entirely on dispatch - don't manually call originalOnInput
    }
    // If acceptingSuggestion and not our event, skip processing (browser already called oninput)
  };

  const handleKeyDown = (e: Event) => {
    // console.log("handlingKeydown", e);
    const keyEvent = e as KeyboardEvent;
    const key = keyEvent.key;
    
    // Check if this is a key that accepts suggestions (Tab or Enter)
    const isAcceptKey = key === 'Tab' || (key === 'Enter' && (controller.maxLines === null || controller.maxLines === 1));
    
    // Store old value BEFORE calling controller to detect if text was extended
    const oldValue = el.value;
    const oldCursorPos = el.selectionStart || 0;
    
    // If Tab is pressed and we have a suggestion, prevent the event immediately
    // This must happen BEFORE the event reaches onkeydown property handlers
    if (key === 'Tab' && controller.suggestion) {
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
      keyEvent.stopImmediatePropagation();
      shouldPreventTabKeyUp = true;
      acceptingSuggestion = true;
      
      // Accept the suggestion through the controller
      controller.handleKeyPress(keyEvent);
      updateOverlay();
      
      // Get the controller text after accepting
      const controllerTextAfterAccept = controller.text;
      
      // Simulate paste/typing events
      // Clear any existing timeout to prevent multiple dispatches
      if (acceptanceTimeoutId !== null) {
        clearTimeout(acceptanceTimeoutId);
      }
      inputEventDispatchedForAcceptance = false; // Reset flag
      acceptanceTimeoutId = window.setTimeout(() => {
        const textToInsert = controllerTextAfterAccept.slice(oldValue.length); // Only the new part
        
        if (simulateTyping) {
          // Type mode: simulate typing each character one by one
          // console.log('Suggestion accepted! Simulating typing. Text to type:', textToInsert);
          
          // Type each character sequentially
          let currentValue = oldValue;
          textToInsert.split('').forEach((char, index) => {
            setTimeout(() => {
              const charCode = char.charCodeAt(0);
              const key = char;
              const code = char.length === 1 && char >= 'a' && char <= 'z' ? `Key${char.toUpperCase()}` :
                          char.length === 1 && char >= 'A' && char <= 'Z' ? `Key${char}` :
                          char === ' ' ? 'Space' : `Digit${char}`;
              
              // 1. Dispatch keydown for this character
              const keyDown = new KeyboardEvent('keydown', {
                bubbles: true,
                cancelable: true,
                key: key,
                code: code,
                charCode: charCode,
                keyCode: charCode,
                which: charCode,
                ctrlKey: false,
                metaKey: false,
                shiftKey: false,
                altKey: false
              });
              (keyDown as any).__autocompleteDispatched = true;
              el.dispatchEvent(keyDown);
              
              // 2. Dispatch keypress for this character
              const keyPress = new KeyboardEvent('keypress', {
                bubbles: true,
                cancelable: true,
                key: key,
                code: code,
                charCode: charCode,
                keyCode: charCode,
                which: charCode,
                ctrlKey: false,
                metaKey: false,
                shiftKey: false,
                altKey: false
              });
              (keyPress as any).__autocompleteDispatched = true;
              el.dispatchEvent(keyPress);
              
              // 3. Update value (as if character was typed)
              currentValue += char;
              el.value = currentValue;
              const cursorPos = currentValue.length;
              el.setSelectionRange(cursorPos, cursorPos);
              
              // 4. Dispatch input event
              let inputEvent: Event;
              try {
                inputEvent = new InputEvent('input', {
                  bubbles: true,
                  cancelable: true,
                  data: char,
                  inputType: 'insertText'
                });
              } catch (e) {
                inputEvent = new Event('input', { bubbles: true, cancelable: true });
              }
              (inputEvent as any).__autocompleteDispatched = true;
              
              // Dispatch the event - rely entirely on dispatch
              el.dispatchEvent(inputEvent);
              
              // 5. Dispatch keyup for this character
              const keyUp = new KeyboardEvent('keyup', {
                bubbles: true,
                cancelable: true,
                key: key,
                code: code,
                charCode: charCode,
                keyCode: charCode,
                which: charCode,
                ctrlKey: false,
                metaKey: false,
                shiftKey: false,
                altKey: false
              });
              (keyUp as any).__autocompleteDispatched = true;
              el.dispatchEvent(keyUp);
            }, index * 10); // Small delay between characters to simulate typing speed
          });
          
          acceptingSuggestion = false;
        } else if (usePasteEvents) {
          // Paste mode: make it look exactly like Ctrl+V was pressed
          // console.log('Suggestion accepted! Simulating Ctrl+V paste. Text to paste:', textToInsert);
          
          // Create clipboard data
          const clipboardData = new DataTransfer();
          clipboardData.setData('text/plain', textToInsert);
          
          // 1. Dispatch Ctrl+V keydown (to simulate the paste keyboard shortcut)
          const ctrlVKeyDown = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'v',
            code: 'KeyV',
            ctrlKey: true,
            metaKey: false, // Use Ctrl, not Cmd
            shiftKey: false,
            altKey: false
          });
          (ctrlVKeyDown as any).__autocompleteDispatched = true;
          el.dispatchEvent(ctrlVKeyDown);
          
          // 2. Dispatch keypress (some browsers fire this)
          const ctrlVKeyPress = new KeyboardEvent('keypress', {
            bubbles: true,
            cancelable: true,
            key: 'v',
            code: 'KeyV',
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
            altKey: false
          });
          (ctrlVKeyPress as any).__autocompleteDispatched = true;
          el.dispatchEvent(ctrlVKeyPress);
          
          // 3. Dispatch paste event
          let pasteEvent: ClipboardEvent;
          try {
            pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: clipboardData
            });
          } catch (e) {
            // Fallback for browsers that don't support ClipboardEvent constructor
            pasteEvent = document.createEvent('ClipboardEvent') as ClipboardEvent;
            (pasteEvent as any).initClipboardEvent('paste', true, true, clipboardData);
          }
          (pasteEvent as any).__autocompleteDispatched = true;
          el.dispatchEvent(pasteEvent);
          
          // 4. Dispatch input event (normally fires after paste)
          let inputEvent: Event;
          try {
            inputEvent = new InputEvent('input', { 
              bubbles: true, 
              cancelable: true,
              data: textToInsert,
              inputType: 'insertFromPaste'
            });
          } catch (e) {
            inputEvent = new Event('input', { bubbles: true, cancelable: true });
          }
          (inputEvent as any).__autocompleteDispatched = true;
          
          // Call original handler
          // if (originalOnInput && typeof originalOnInput === 'function') {
          //   originalOnInput.call(el, inputEvent);
          // }
          el.dispatchEvent(inputEvent);
          
          // 5. Dispatch Ctrl+V keyup
          const ctrlVKeyUp = new KeyboardEvent('keyup', {
            bubbles: true,
            cancelable: true,
            key: 'v',
            code: 'KeyV',
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
            altKey: false
          });
          (ctrlVKeyUp as any).__autocompleteDispatched = true;
          el.dispatchEvent(ctrlVKeyUp);
        } else {
          // Normal mode: also simulate paste event for consistency
          // console.log('Suggestion accepted! Simulating Ctrl+V paste. Text to paste:', textToInsert);
          
          // Create clipboard data
          const clipboardData = new DataTransfer();
          clipboardData.setData('text/plain', textToInsert);
          
          // 1. Dispatch Ctrl+V keydown
          const ctrlVKeyDown = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: 'v',
            code: 'KeyV',
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
            altKey: false
          });
          (ctrlVKeyDown as any).__autocompleteDispatched = true;
          el.dispatchEvent(ctrlVKeyDown);
          
          // 2. Dispatch keypress
          const ctrlVKeyPress = new KeyboardEvent('keypress', {
            bubbles: true,
            cancelable: true,
            key: 'v',
            code: 'KeyV',
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
            altKey: false
          });
          (ctrlVKeyPress as any).__autocompleteDispatched = true;
          el.dispatchEvent(ctrlVKeyPress);
          
          // 3. Dispatch paste event (this will trigger browser's paste handling)
          let pasteEvent: ClipboardEvent;
          try {
            pasteEvent = new ClipboardEvent('paste', {
              bubbles: true,
              cancelable: true,
              clipboardData: clipboardData
            });
          } catch (e) {
            pasteEvent = document.createEvent('ClipboardEvent') as ClipboardEvent;
            (pasteEvent as any).initClipboardEvent('paste', true, true, clipboardData);
          }
          (pasteEvent as any).__autocompleteDispatched = true;
          
          // Prevent default paste behavior - we'll handle the value change ourselves
          pasteEvent.preventDefault();
          pasteEvent.stopPropagation();
          pasteEvent.stopImmediatePropagation();
          el.dispatchEvent(pasteEvent);
          
          // 4. Set the value (as if paste happened)
          el.value = controllerTextAfterAccept;
          el.setSelectionRange(controllerTextAfterAccept.length, controllerTextAfterAccept.length);
          
          // 5. Dispatch input event (normally fires after paste)
          // Only dispatch once - use module-level flag to ensure we don't dispatch multiple times
          if (!inputEventDispatchedForAcceptance) {
            inputEventDispatchedForAcceptance = true;
            let inputEvent: Event;
            try {
              inputEvent = new InputEvent('input', { 
                bubbles: true, 
                cancelable: true,
                data: textToInsert,
                inputType: 'insertFromPaste'
              });
            } catch (e) {
              inputEvent = new Event('input', { bubbles: true, cancelable: true });
            }
            (inputEvent as any).__autocompleteDispatched = true;
            (inputEvent as any).__autocompleteEventId = Math.random(); // Unique ID for debugging
            
            // console.log('Dispatching input event once, ID:', (inputEvent as any).__autocompleteEventId);
            
            // Dispatch the event - rely entirely on dispatch, don't manually call originalOnInput
            el.dispatchEvent(inputEvent);
          } else {
            // console.log('Skipping duplicate input event dispatch - already dispatched');
          }
          
          // 6. Dispatch Ctrl+V keyup
          const ctrlVKeyUp = new KeyboardEvent('keyup', {
            bubbles: true,
            cancelable: true,
            key: 'v',
            code: 'KeyV',
            ctrlKey: true,
            metaKey: false,
            shiftKey: false,
            altKey: false
          });
          (ctrlVKeyUp as any).__autocompleteDispatched = true;
          el.dispatchEvent(ctrlVKeyUp);
        }
        
        acceptingSuggestion = false;
      }, 0);
      
      // Return early - we've handled Tab acceptance
      return;
    }
    
    // Normal key processing (not Tab acceptance with suggestion)
    // Mark that we might be accepting a suggestion
    if (isAcceptKey) {
      acceptingSuggestion = true;
    }
    
    // Our handler first
    controller.handleKeyPress(keyEvent);
    updateOverlay();
    
    // Get the new controller text
    const controllerText = controller.text;
    
    // Sync the input value if needed (for normal typing, not suggestion acceptance)
    if (el.value !== controllerText) {
      el.value = controllerText;
    }
    
    if (el.value !== controllerText) {
      // Controller changed value but not a suggestion acceptance - preserve cursor
      setTimeout(() => {
        const newPos = Math.min(oldCursorPos, controllerText.length);
        el.setSelectionRange(newPos, newPos);
        acceptingSuggestion = false;
      }, 0);
    } else {
      // Value didn't change - normal typing, don't touch cursor
      acceptingSuggestion = false;
    }
    
    // Don't call original keydown handler here - the browser already calls it for native events
    // We only need to call it manually for events we dispatch ourselves
  };
  
  // Handle keyup to prevent Tab keyup when accepting suggestions
  const handleKeyUp = (e: Event) => {
    const keyEvent = e as KeyboardEvent;
    
    if (shouldPreventTabKeyUp && keyEvent.key === 'Tab') {
      keyEvent.preventDefault();
      keyEvent.stopPropagation();
      keyEvent.stopImmediatePropagation();
      shouldPreventTabKeyUp = false;
      // Don't call original keyup handler - we're replacing Tab with Ctrl+V simulation
      return;
    }
    
    // Don't call original keyup handler here - the browser already calls it for native events
    // We only need to call it manually for events we dispatch ourselves
  };

  // Keep original handlers - we'll call them manually
  // Don't clear them - let browser call them for native events, we'll call them for our events

  // Attach event listeners
  // Use capture phase for keydown/keyup so we can intercept Tab events before on* property handlers
  // Use bubble phase for input so oninput property handlers work correctly
  el.addEventListener('input', handleInput, false);
  el.addEventListener('keydown', handleKeyDown, true); // Capture phase
  el.addEventListener('keyup', handleKeyUp, true); // Capture phase
  
  // Subscribe to controller changes
  const unsubscribe = controller.subscribe(() => {
    // Always update overlay (works in both modes)
    requestAnimationFrame(() => {
      updateOverlay();
    });
    
    // In paste mode, don't sync value - let element handle it via paste events
    // Also, don't sync in normal mode if we're accepting a suggestion (keydown handler will handle it)
    if (!usePasteEvents && !acceptingSuggestion) {
      // Sync input value (only in normal mode, and not when accepting suggestions)
      const controllerText = controller.text;
      if (el.value !== controllerText) {
        el.value = controllerText;
        
        setTimeout(() => {
          // Preserve cursor position for normal controller updates
          const cursorPos = el.selectionStart || 0;
          const newPos = Math.min(cursorPos, controllerText.length);
          el.setSelectionRange(newPos, newPos);
        }, 0);
      }
    }
    // In paste mode, we don't sync the value here - let the element's native paste handler update it
    // We'll sync our controller when the input event fires (in handleInput)
  });

  // Initial update - use setTimeout to ensure styles are computed
  setTimeout(() => {
    updateOverlay();
  }, 0);

  // Cleanup function
  return () => {
    el.removeEventListener('input', handleInput, false);
    el.removeEventListener('keydown', handleKeyDown, false);
    unsubscribe();
    
    // Restore original on* handlers if they existed
    if (originalOnInput !== null && originalOnInput !== undefined) {
      (el as any).oninput = originalOnInput;
    } else {
      (el as any).oninput = null;
    }
    if (originalOnKeyDown !== null && originalOnKeyDown !== undefined) {
      (el as any).onkeydown = originalOnKeyDown;
    } else {
      (el as any).onkeydown = null;
    }
    
    // Restore original structure
    if (wrapper.parentElement) {
      wrapper.parentElement.insertBefore(el, wrapper);
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

export default attachAutocomplete;