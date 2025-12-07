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
  private shadowHost: HTMLElement | null = null;
  private shadowOverlay: HTMLElement | null = null;
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

    // Create overlay (kept for compatibility, but we'll use shadow DOM)
    this.overlay = document.createElement('div');
    this.overlay.className = options.overlayClass || 'autocomplete-overlay';
    
    // Create Shadow DOM overlay - isolated from page CSS
    this.createShadowOverlay();

    // Insert wrapper before input
    const parent = inputElement.parentElement;
    if (!parent) {
      throw new Error('Input element must have a parent');
    }

    parent.insertBefore(this.wrapper, inputElement);
    this.wrapper.appendChild(inputElement);
    // Don't append overlay to wrapper - it's in document.body

    // Apply debug border if appropriate
    this.applyDebugBorder();
  }

  /**
   * Create isolated Shadow DOM overlay that can't be affected by page CSS
   */
  private createShadowOverlay(): void {
    // Check if shadow host already exists (shared across all instances)
    let host = document.getElementById('__automobile-caret-overlay-host') as HTMLElement;
    
    if (!host) {
      // Create root host
      host = document.createElement('div');
      host.id = '__automobile-caret-overlay-host';
      Object.assign(host.style, {
        position: 'fixed',
        inset: '0',
        pointerEvents: 'none',
        zIndex: '2147483647',
      });
      document.documentElement.appendChild(host);
      
      // Create Shadow DOM so page CSS can't mess with it
      const shadow = host.attachShadow({ mode: 'open' });
      
      // Overlay element that will follow the caret
      const caretOverlay = document.createElement('div');
      Object.assign(caretOverlay.style, {
        position: 'fixed',
        left: '0px',
        top: '0px',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '12px',
        color: '#999',
        pointerEvents: 'none',
        whiteSpace: 'pre',
        visibility: 'hidden',
      });
      caretOverlay.textContent = '';
      
      shadow.appendChild(caretOverlay);
      
      this.shadowHost = host;
      this.shadowOverlay = caretOverlay;
    } else {
      // Reuse existing shadow host
      this.shadowHost = host;
      const shadow = host.shadowRoot;
      if (shadow) {
        this.shadowOverlay = shadow.firstElementChild as HTMLElement;
      }
    }
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

    // COMPLETELY NEW OVERLAY SYSTEM: Use CSS custom properties and native cursor position
    this.updateOverlayCompletely(text, suggestion);
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
   * BACK TO BASICS: Use the original simple approach that actually worked
   */
  private updateOverlayCompletely(text: string, suggestion: string | null): void {
    if (!this.shadowOverlay) {
      return;
    }
    
    if (!suggestion) {
      this.shadowOverlay.style.visibility = 'hidden';
      this.shadowOverlay.textContent = '';
      return;
    }
    
    const cleanSuggestion = suggestion.replaceAll("\b", "");
    
    // Get cursor position using unified caret tracker
    const cursorPos = this.getUnifiedCaretPosition();
    
    if (!cursorPos) {
      this.shadowOverlay.style.visibility = 'hidden';
      this.shadowOverlay.textContent = '';
      return;
    }
    
    // Update shadow overlay position and content
    this.shadowOverlay.style.left = `${cursorPos.left}px`;
    this.shadowOverlay.style.top = `${cursorPos.top - 2}px`;
    this.shadowOverlay.textContent = cleanSuggestion;
    this.shadowOverlay.style.visibility = 'visible';
    
    // Match input font styles
    const inputStyles = window.getComputedStyle(this.inputElement);
    this.shadowOverlay.style.fontSize = inputStyles.fontSize;
    this.shadowOverlay.style.fontFamily = inputStyles.fontFamily;
    this.shadowOverlay.style.fontWeight = inputStyles.fontWeight;
    this.shadowOverlay.style.fontStyle = inputStyles.fontStyle;
    this.shadowOverlay.style.lineHeight = inputStyles.lineHeight;
    this.shadowOverlay.style.letterSpacing = inputStyles.letterSpacing;
  }

  /**
   * Unified caret tracker - works for both input/textarea and contenteditable
   */
  private getUnifiedCaretPosition(): { left: number; top: number } | null {
    // For contenteditable: use Range.getBoundingClientRect() - most reliable
    if (this.inputElement.contentEditable === 'true' || this.inputElement.isContentEditable) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        try {
          const range = selection.getRangeAt(0);
          if (this.inputElement.contains(range.commonAncestorContainer)) {
            const collapsedRange = range.cloneRange();
            collapsedRange.collapse(true);
            const rect = collapsedRange.getBoundingClientRect();
            return { left: rect.left, top: rect.top };
          }
        } catch (e) {
          return null;
        }
      }
      return null;
    }
    
    // For input/textarea: mirror text in hidden clone and get rects
    const input = this.inputElement as HTMLInputElement | HTMLTextAreaElement;
    const selectionStart = input.selectionStart;
    if (selectionStart === null) return null;
    
    return this.getInputCaretPosition(input, selectionStart);
  }

  /**
   * Get caret position for input/textarea by mirroring in hidden clone
   */
  private getInputCaretPosition(input: HTMLInputElement | HTMLTextAreaElement, selectionStart: number): { left: number; top: number } | null {
    const computed = window.getComputedStyle(input);
    const inputRect = input.getBoundingClientRect();
    const textBeforeCursor = input.value.substring(0, selectionStart);
    
    // Create hidden mirror element
    const mirror = document.createElement(input.tagName.toLowerCase()) as HTMLInputElement | HTMLTextAreaElement;
    Object.assign(mirror.style, {
      position: 'fixed',
      visibility: 'hidden',
      pointerEvents: 'none',
      whiteSpace: input.tagName === 'TEXTAREA' ? 'pre-wrap' : 'nowrap',
      overflow: 'hidden',
    });
    
    // Copy all relevant styles
    mirror.style.fontSize = computed.fontSize;
    mirror.style.fontFamily = computed.fontFamily;
    mirror.style.fontWeight = computed.fontWeight;
    mirror.style.fontStyle = computed.fontStyle;
    mirror.style.letterSpacing = computed.letterSpacing;
    mirror.style.padding = computed.padding;
    mirror.style.border = computed.border;
    mirror.style.boxSizing = computed.boxSizing;
    mirror.style.width = computed.width;
    mirror.style.height = computed.height;
    mirror.style.textAlign = computed.textAlign;
    mirror.style.lineHeight = computed.lineHeight;
    
    mirror.value = input.value;
    mirror.setSelectionRange(selectionStart, selectionStart);
    
    document.body.appendChild(mirror);
    
    try {
      if (input.tagName === 'TEXTAREA') {
        // For textarea, calculate line position
        const lines = textBeforeCursor.split('\n');
        const lineIndex = lines.length - 1;
        const lineText = lines[lineIndex] || '';
        
        // Measure current line
        const lineSpan = document.createElement('span');
        lineSpan.style.position = 'fixed';
        lineSpan.style.visibility = 'hidden';
        lineSpan.style.whiteSpace = 'pre';
        lineSpan.style.fontSize = computed.fontSize;
        lineSpan.style.fontFamily = computed.fontFamily;
        lineSpan.style.fontWeight = computed.fontWeight;
        lineSpan.style.fontStyle = computed.fontStyle;
        lineSpan.style.letterSpacing = computed.letterSpacing;
        lineSpan.textContent = lineText;
        document.body.appendChild(lineSpan);
        
        try {
          const lineRect = lineSpan.getBoundingClientRect();
          const paddingLeft = parseFloat(computed.paddingLeft) || 0;
          const paddingTop = parseFloat(computed.paddingTop) || 0;
          const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) || 16;
          
          return {
            left: inputRect.left + paddingLeft + lineRect.width,
            top: inputRect.top + paddingTop + (lineHeight * lineIndex)
          };
        } finally {
          document.body.removeChild(lineSpan);
        }
      } else {
        // Single line input
        const span = document.createElement('span');
        span.style.position = 'fixed';
        span.style.visibility = 'hidden';
        span.style.whiteSpace = 'pre';
        span.style.fontSize = computed.fontSize;
        span.style.fontFamily = computed.fontFamily;
        span.style.fontWeight = computed.fontWeight;
        span.style.fontStyle = computed.fontStyle;
        span.style.letterSpacing = computed.letterSpacing;
        span.textContent = textBeforeCursor;
        document.body.appendChild(span);
        
        try {
          const spanRect = span.getBoundingClientRect();
          const paddingLeft = parseFloat(computed.paddingLeft) || 0;
          const paddingTop = parseFloat(computed.paddingTop) || 0;
          const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) || 16;
          const inputHeight = inputRect.height;
          const verticalCenter = (inputHeight - lineHeight) / 2;
          
          return {
            left: inputRect.left + paddingLeft + spanRect.width,
            top: inputRect.top + paddingTop + verticalCenter
          };
        } finally {
          document.body.removeChild(span);
        }
      }
    } finally {
      document.body.removeChild(mirror);
    }
  }

  /**
   * Get cursor position rectangle using native browser APIs
   */
  private getNativeCursorRect(): DOMRect | null {
    // For contenteditable: use Range API - most reliable
    if (this.inputElement.contentEditable === 'true' || this.inputElement.isContentEditable) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        try {
          const range = selection.getRangeAt(0);
          if (this.inputElement.contains(range.commonAncestorContainer)) {
            const collapsedRange = range.cloneRange();
            collapsedRange.collapse(true);
            return collapsedRange.getBoundingClientRect();
          }
        } catch (e) {
          return null;
        }
      }
      return null;
    }
    
    // For input/textarea: measure using temporary elements
    const input = this.inputElement as HTMLInputElement | HTMLTextAreaElement;
    const selectionStart = input.selectionStart;
    if (selectionStart === null) return null;
    
    const computed = window.getComputedStyle(this.inputElement);
    const inputRect = input.getBoundingClientRect();
    const textBeforeCursor = input.value.substring(0, selectionStart);
    
    if (input.tagName === 'TEXTAREA') {
      // Handle multiline
      const lines = textBeforeCursor.split('\n');
      const lineIndex = lines.length - 1;
      const lineText = lines[lineIndex] || '';
      
      const lineSpan = document.createElement('span');
      lineSpan.style.position = 'fixed';
      lineSpan.style.visibility = 'hidden';
      lineSpan.style.whiteSpace = 'pre';
      lineSpan.style.fontSize = computed.fontSize;
      lineSpan.style.fontFamily = computed.fontFamily;
      lineSpan.style.fontWeight = computed.fontWeight;
      lineSpan.style.fontStyle = computed.fontStyle;
      lineSpan.style.letterSpacing = computed.letterSpacing;
      lineSpan.textContent = lineText;
      document.body.appendChild(lineSpan);
      
      try {
        const lineRect = lineSpan.getBoundingClientRect();
        const paddingLeft = parseFloat(computed.paddingLeft) || 0;
        const paddingTop = parseFloat(computed.paddingTop) || 0;
        const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) || 16;
        
        return new DOMRect(
          inputRect.left + paddingLeft + lineRect.width,
          inputRect.top + paddingTop + (lineHeight * lineIndex),
          0,
          lineHeight
        );
      } finally {
        document.body.removeChild(lineSpan);
      }
    } else {
      // Single line input
      const span = document.createElement('span');
      span.style.position = 'fixed';
      span.style.visibility = 'hidden';
      span.style.whiteSpace = 'pre';
      span.style.fontSize = computed.fontSize;
      span.style.fontFamily = computed.fontFamily;
      span.style.fontWeight = computed.fontWeight;
      span.style.fontStyle = computed.fontStyle;
      span.style.letterSpacing = computed.letterSpacing;
      span.textContent = textBeforeCursor;
      document.body.appendChild(span);
      
      try {
        const spanRect = span.getBoundingClientRect();
        const paddingLeft = parseFloat(computed.paddingLeft) || 0;
        const paddingTop = parseFloat(computed.paddingTop) || 0;
        const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) || 16;
        const inputHeight = inputRect.height;
        const verticalCenter = (inputHeight - lineHeight) / 2;
        
        return new DOMRect(
          inputRect.left + paddingLeft + spanRect.width,
          inputRect.top + paddingTop + verticalCenter,
          0,
          lineHeight
        );
      } finally {
        document.body.removeChild(span);
      }
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
    
    // Hide shadow overlay (but don't remove host - it's shared)
    if (this.shadowOverlay) {
      this.shadowOverlay.style.visibility = 'hidden';
      this.shadowOverlay.textContent = '';
    }
    
    // Remove old overlay if it exists
    if (this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    
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

