/**
 * Completion overlay component.
 * Manages the visual display of completion suggestions over input elements.
 * This is a base implementation - different overlay styles can be created by extending this.
 */

import {AutocompleteTextController} from "../../engine/AutocompleteTextController";
import {AttachAutocompleteOptions} from "../config";
import {getElementInfo} from "../elementDetection";

export interface OverlayUpdate {
  text: string;
  suggestion: string | null;
}

/**
 * Base class for completion overlay implementations.
 * Handles creating, updating, and managing the overlay DOM element.
 */
export class CompletionOverlay {
  protected overlay: HTMLDivElement;
  protected wrapper: HTMLDivElement;
  protected inputElement: HTMLElement;
  protected controller: AutocompleteTextController;
  protected options: AttachAutocompleteOptions;
  private borderWasApplied: boolean = false;
  private originalBorder: string = '';
  private originalBorderWidth: string = '';
  private originalBorderStyle: string = '';
  private originalBorderColor: string = '';
  private originalBoxSizing: string = '';
  private originalZIndex: string = '';
  private originalPosition: string = '';
  private originalOutline: string = '';
  private originalPadding: string = '';
  private originalPaddingLeft: string = '';

  constructor(
    inputElement: HTMLElement,
    controller: AutocompleteTextController,
    options: AttachAutocompleteOptions
  ) {
    this.inputElement = inputElement;
    this.controller = controller;
    this.options = options;

    // Store original styles before any modifications
    this.storeOriginalStyles();

    // Create wrapper
    this.wrapper = document.createElement('div');
    this.wrapper.className = options.wrapperClass || 'autocomplete-wrapper';

    // Create overlay
    this.overlay = document.createElement('div');
    this.overlay.className = options.overlayClass || 'autocomplete-overlay';

    // Insert wrapper before input
    const parent = inputElement.parentElement;
    if (!parent) {
      throw new Error('Input element must have a parent');
    }

    parent.insertBefore(this.wrapper, inputElement);
    this.wrapper.appendChild(inputElement);
    this.wrapper.appendChild(this.overlay);

    // Apply debug border if appropriate
    this.applyDebugBorder();
  }

  /**
   * Store original styles before applying any modifications
   */
  private storeOriginalStyles(): void {
    this.originalBorder = this.inputElement.style.border;
    this.originalBorderWidth = this.inputElement.style.borderWidth;
    this.originalBorderStyle = this.inputElement.style.borderStyle;
    this.originalBorderColor = this.inputElement.style.borderColor;
    this.originalBoxSizing = this.inputElement.style.boxSizing;
    this.originalZIndex = this.inputElement.style.zIndex;
    this.originalPosition = this.inputElement.style.position;
    this.originalOutline = this.inputElement.style.outline;
    this.originalPadding = this.inputElement.style.padding;
    this.originalPaddingLeft = this.inputElement.style.paddingLeft;
  }

  /**
   * Apply debug border to visualize attached elements
   * Only applies if this is the top-level attached element (no attached parent or child)
   */
  private applyDebugBorder(): void {
    const wrapperClass = this.options.wrapperClass || 'autocomplete-wrapper';
    
    // Check if this element has an attached parent or child - if so, don't show border
    // (We still attach functionality, but only show border on the top-level element)
    let shouldShowBorder = true;
    
    // Check if any parent is already attached
    let checkParent = this.inputElement.parentElement;
    while (checkParent) {
      if (checkParent.hasAttribute('data-automobile-complete-attached') || 
          checkParent.classList.contains(wrapperClass)) {
        shouldShowBorder = false;
        console.log('[Automobile Complete] Parent already attached, skipping border on child:', getElementInfo(this.inputElement));
        break;
      }
      checkParent = checkParent.parentElement;
    }
    
    // Check if any child is already attached
    if (shouldShowBorder) {
      const attachedChild = this.inputElement.querySelector('[data-automobile-complete-attached]');
      if (attachedChild) {
        shouldShowBorder = false;
        console.log('[Automobile Complete] Child already attached, skipping border on parent:', getElementInfo(this.inputElement));
      }
    }
    
    if (shouldShowBorder) {
      this.borderWasApplied = true;
      
      // ONLY apply border - don't change position, z-index, padding, or any other styles
      // Use !important to ensure the border is visible even if other CSS tries to override it
      // Use bright green (#00FF00) for maximum visibility
      // Thinner border with rounded corners for better aesthetics
      this.inputElement.style.setProperty('border', '2px solid #00FF00', 'important');
      this.inputElement.style.setProperty('border-radius', '4px', 'important');
      
      // Also set individual border properties as backup (some browsers need this)
      this.inputElement.style.setProperty('border-width', '2px', 'important');
      this.inputElement.style.setProperty('border-style', 'solid', 'important');
      this.inputElement.style.setProperty('border-color', '#00FF00', 'important');
      
      // Debug: Log the computed styles to verify they're applied
      setTimeout(() => {
        const computed = window.getComputedStyle(this.inputElement);
        console.log('[Automobile Complete] Border debug for element:', getElementInfo(this.inputElement), this.inputElement);
        console.log('  - border:', computed.border);
        console.log('  - border-color:', computed.borderColor);
        console.log('  - border-width:', computed.borderWidth);
        console.log('  - z-index:', computed.zIndex);
        console.log('  - position:', computed.position);
      }, 100);
    }
  }

  /**
   * Restore original border styles
   */
  private restoreBorderStyles(): void {
    if (!this.borderWasApplied) {
      return;
    }

    // Restore original border style
    if (this.originalBorder) {
      this.inputElement.style.border = this.originalBorder;
    } else {
      // Restore individual border properties if they existed
      if (this.originalBorderWidth) {
        this.inputElement.style.borderWidth = this.originalBorderWidth;
      } else {
        this.inputElement.style.removeProperty('border-width');
      }
      if (this.originalBorderStyle) {
        this.inputElement.style.borderStyle = this.originalBorderStyle;
      } else {
        this.inputElement.style.removeProperty('border-style');
      }
      if (this.originalBorderColor) {
        this.inputElement.style.borderColor = this.originalBorderColor;
      } else {
        this.inputElement.style.removeProperty('border-color');
      }
      this.inputElement.style.removeProperty('border');
    }
    
    if (this.originalBoxSizing) {
      this.inputElement.style.boxSizing = this.originalBoxSizing;
    } else {
      this.inputElement.style.removeProperty('box-sizing');
    }
    
    // Restore original z-index and position
    if (this.originalZIndex) {
      this.inputElement.style.zIndex = this.originalZIndex;
    } else {
      this.inputElement.style.removeProperty('z-index');
    }
    if (this.originalPosition) {
      this.inputElement.style.position = this.originalPosition;
    } else {
      this.inputElement.style.removeProperty('position');
    }
    
    // Restore original outline
    if (this.originalOutline) {
      this.inputElement.style.outline = this.originalOutline;
    } else {
      this.inputElement.style.removeProperty('outline');
      this.inputElement.style.removeProperty('outline-offset');
    }
    
    // Restore original padding
    if (this.originalPadding) {
      this.inputElement.style.padding = this.originalPadding;
    } else {
      this.inputElement.style.removeProperty('padding');
    }
    if (this.originalPaddingLeft) {
      this.inputElement.style.paddingLeft = this.originalPaddingLeft;
    } else {
      this.inputElement.style.removeProperty('padding-left');
    }
  }

  /**
   * Update the overlay content based on controller state
   */
  update(): void {
    const text = this.controller.text;
    const suggestion = this.controller.suggestion;

    // Match input's computed styles exactly
    this.syncStyles();

    // Update content
    this.updateContent(text, suggestion);
  }

  /**
   * Sync overlay styles to match the input element
   */
  protected syncStyles(): void {
    const inputStyles = window.getComputedStyle(this.inputElement);

    // Copy all relevant styles to match input positioning
    this.overlay.style.fontSize = inputStyles.fontSize;
    this.overlay.style.fontFamily = inputStyles.fontFamily;
    this.overlay.style.fontWeight = inputStyles.fontWeight;
    this.overlay.style.fontStyle = inputStyles.fontStyle;
    this.overlay.style.lineHeight = inputStyles.lineHeight;
    this.overlay.style.padding = inputStyles.padding;
    this.overlay.style.paddingLeft = inputStyles.paddingLeft;
    this.overlay.style.paddingRight = inputStyles.paddingRight;
    this.overlay.style.paddingTop = inputStyles.paddingTop;
    this.overlay.style.paddingBottom = inputStyles.paddingBottom;
    this.overlay.style.border = 'none';
    this.overlay.style.borderRadius = inputStyles.borderRadius;
    this.overlay.style.boxSizing = inputStyles.boxSizing;
    this.overlay.style.textAlign = inputStyles.textAlign;
    this.overlay.style.width = inputStyles.width;
    this.overlay.style.height = inputStyles.height;
    this.overlay.style.minHeight = inputStyles.minHeight;
    this.overlay.style.letterSpacing = inputStyles.letterSpacing;
    this.overlay.style.textIndent = inputStyles.textIndent;

    // Match vertical alignment - inputs are typically centered, textareas and contenteditable start at top
    if (this.inputElement.tagName === 'INPUT') {
      this.overlay.style.display = 'flex';
      this.overlay.style.alignItems = 'center';
      this.overlay.style.flexWrap = 'nowrap';
    } else if (this.inputElement.tagName === 'TEXTAREA' || 
               this.inputElement.contentEditable === 'true' || 
               this.inputElement.isContentEditable) {
      this.overlay.style.display = 'block';
    }
  }

  /**
   * Update the overlay content (text + suggestion)
   * Override this in subclasses for different display styles
   */
  protected updateContent(text: string, suggestion: string | null): void {
    const suggestionClass = this.options.suggestionClass || 'autocomplete-suggestion';

    
    if (suggestion) {
        suggestion = suggestion?.replaceAll("\b", "")

      this.overlay.innerHTML = `
        <span style="color: transparent; white-space: pre;">${this.escapeHtml(text)}</span><span class="${suggestionClass}">${this.escapeHtml(suggestion)}</span>
      `;
    } else {
      this.overlay.innerHTML = `<span style="color: transparent; white-space: pre;">${this.escapeHtml(text)}</span>`;
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  protected escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Cleanup and remove the overlay
   */
  destroy(): void {
    // Restore border styles
    this.restoreBorderStyles();
    
    // Restore original structure
    if (this.wrapper.parentElement) {
      this.wrapper.parentElement.insertBefore(this.inputElement, this.wrapper);
      this.wrapper.remove();
    }
  }

  /**
   * Get the wrapper element
   */
  getWrapper(): HTMLDivElement {
    return this.wrapper;
  }

  /**
   * Get the overlay element
   */
  getOverlay(): HTMLDivElement {
    return this.overlay;
  }
}

