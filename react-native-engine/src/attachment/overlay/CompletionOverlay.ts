/**
 * Completion overlay component.
 * Manages the visual display of completion suggestions over input elements.
 * This is a base implementation - different overlay styles can be created by extending this.
 */

import {AutocompleteTextController} from "../../engine/AutocompleteTextController";

export interface OverlayUpdate {
  text: string;
  suggestion: string | null;
}

/**
 * Base class for completion overlay implementations.
 * Handles creating, updating, and managing the overlay DOM element.
 */
export class CompletionOverlay {
  protected inputElement: HTMLElement;
  protected controller: AutocompleteTextController;
  private shadowHost: HTMLElement | null = null;
  private shadowOverlay: HTMLElement | null = null;
  private shadowHighlight: HTMLElement | null = null;

  constructor(
    inputElement: HTMLElement,
    controller: AutocompleteTextController
  ) {
    this.inputElement = inputElement;
    this.controller = controller;

    // Create Shadow DOM overlay - isolated from page CSS
    this.createShadowOverlay();
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
      
      // Highlight element for showing characters that will be replaced
      const highlightOverlay = document.createElement('div');
      Object.assign(highlightOverlay.style, {
        position: 'fixed',
        left: '0px',
        top: '0px',
        backgroundColor: 'rgba(128, 128, 128, 0.3)',
        pointerEvents: 'none',
        visibility: 'hidden',
        zIndex: '2147483646', // Just below completion overlay
      });
      
      shadow.appendChild(caretOverlay);
      shadow.appendChild(highlightOverlay);
      
      this.shadowHost = host;
      this.shadowOverlay = caretOverlay;
      this.shadowHighlight = highlightOverlay;
    } else {
      // Reuse existing shadow host
      this.shadowHost = host;
      const shadow = host.shadowRoot;
      if (shadow) {
        const children = Array.from(shadow.children);
        this.shadowOverlay = children[0] as HTMLElement;
        // Highlight is second child, or create it if missing
        if (children.length > 1) {
          this.shadowHighlight = children[1] as HTMLElement;
        } else {
          // Create highlight if it doesn't exist
          const highlightOverlay = document.createElement('div');
          Object.assign(highlightOverlay.style, {
            position: 'fixed',
            left: '0px',
            top: '0px',
            backgroundColor: 'rgba(128, 128, 128, 0.3)',
            pointerEvents: 'none',
            visibility: 'hidden',
            zIndex: '2147483646',
          });
          shadow.appendChild(highlightOverlay);
          this.shadowHighlight = highlightOverlay;
        }
      }
    }
  }


  /**
   * Update the overlay content based on controller state
   */
  update(): void {
    const text = this.controller.text;
    const suggestion = this.controller.suggestion;

    // Update shadow DOM overlay
    this.updateOverlayCompletely(text, suggestion);
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
      if (this.shadowHighlight) {
        this.shadowHighlight.style.visibility = 'hidden';
      }
      return;
    }
    
    // Count backspaces at the start
    let backspaceCount = 0;
    while (backspaceCount < suggestion.length && suggestion[backspaceCount] === '\b') {
      backspaceCount++;
    }
    const cleanSuggestion = suggestion.substring(backspaceCount);
    
    // Get cursor position using unified caret tracker
    const cursorPos = this.getUnifiedCaretPosition();
    
    if (!cursorPos) {
      this.shadowOverlay.style.visibility = 'hidden';
      this.shadowOverlay.textContent = '';
      if (this.shadowHighlight) {
        this.shadowHighlight.style.visibility = 'hidden';
      }
      return;
    }
    
    // Match input font styles first (needed for baseline calculation)
    const inputStyles = window.getComputedStyle(this.inputElement);
    this.shadowOverlay.style.fontSize = inputStyles.fontSize;
    this.shadowOverlay.style.fontFamily = inputStyles.fontFamily;
    this.shadowOverlay.style.fontWeight = inputStyles.fontWeight;
    this.shadowOverlay.style.fontStyle = inputStyles.fontStyle;
    this.shadowOverlay.style.lineHeight = inputStyles.lineHeight;
    this.shadowOverlay.style.letterSpacing = inputStyles.letterSpacing;
    
    // Calculate baseline offset to align overlay text with input text
    const baselineOffset = this.calculateBaselineOffset(inputStyles);
    
    // Update shadow overlay position and content
    this.shadowOverlay.style.left = `${cursorPos.left}px`;
    this.shadowOverlay.style.top = `${cursorPos.top - baselineOffset}px`;
    this.shadowOverlay.textContent = cleanSuggestion;
    this.shadowOverlay.style.visibility = 'visible';
    
    // Add background to block content behind - adapt to dark/light mode
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    this.shadowOverlay.style.backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff';
    this.shadowOverlay.style.padding = '0 0px';
    this.shadowOverlay.style.margin = '0';
    
    // Add left border to simulate cursor so it doesn't disappear behind the background
    // Use green to match the caret color we set on the input
    this.shadowOverlay.style.borderLeft = '1px solid green';
    this.shadowOverlay.style.paddingLeft = '1px'; // Adjust padding to account for border
    
    // Show highlight for characters that will be replaced
    if (backspaceCount > 0 && this.shadowHighlight) {
      this.updateReplacementHighlight(cursorPos, backspaceCount, inputStyles);
    } else if (this.shadowHighlight) {
      this.shadowHighlight.style.visibility = 'hidden';
    }
  }

  /**
   * Calculate a small baseline offset adjustment (max ±5px) for aligning overlay text
   * Different element types return cursor positions at different vertical positions
   */
  private calculateBaselineOffset(inputStyles: CSSStyleDeclaration): number {
    const fontSize = parseFloat(inputStyles.fontSize) || 16;
    const lineHeight = parseFloat(inputStyles.lineHeight) || fontSize;

    // Determine element type to adjust offset accordingly
    const isContentEditable = this.inputElement.contentEditable === 'true' || this.inputElement.isContentEditable;
    const isTextarea = this.inputElement.tagName === 'TEXTAREA';
    const isInput = this.inputElement.tagName === 'INPUT';

    let offset = 0;

    if (isContentEditable) {
      // For contenteditable, cursorPos.top is already at the baseline
      // Small adjustment for visual alignment
      offset = 2;
    } else if (isTextarea) {
      // For textarea, cursorPos.top is at the top of the line
      // Need to move down slightly to align with baseline
      offset = 2 + fontSize * 0.15; // Small percentage of font size, max 5px
    } else if (isInput) {
      // For input, cursorPos.top is vertically centered
      // Calculate small adjustment to align with baseline
      offset = 2 + (lineHeight / 2) - (fontSize * 0.8);
    }

    // Clamp to ±5px maximum
    return Math.max(-3, Math.min(3, offset));
  }

  /**
   * Update the gray highlight showing which characters will be replaced
   * Uses same reliable method as completion - measure text width, use negative marginLeft
   */
  private updateReplacementHighlight(cursorPos: { left: number; top: number }, backspaceCount: number, inputStyles: CSSStyleDeclaration): void {
    if (!this.shadowHighlight) return;
    
    // Get cursor character position
    const cursorCharPos = this.getCursorPosition();
    if (cursorCharPos === null || cursorCharPos < backspaceCount) {
      this.shadowHighlight.style.visibility = 'hidden';
      return;
    }
    
    // Get the text that will be replaced (backspaceCount characters before cursor)
    const input = this.inputElement.tagName === 'INPUT' || this.inputElement.tagName === 'TEXTAREA'
      ? this.inputElement as HTMLInputElement | HTMLTextAreaElement
      : null;
    
    let textToReplace = '';
    if (input) {
      textToReplace = input.value.substring(cursorCharPos - backspaceCount, cursorCharPos);
    } else if (this.inputElement.contentEditable === 'true' || this.inputElement.isContentEditable) {
      const textContent = this.inputElement.textContent || '';
      textToReplace = textContent.substring(cursorCharPos - backspaceCount, cursorCharPos);
    }
    
    if (!textToReplace) {
      this.shadowHighlight.style.visibility = 'hidden';
      return;
    }
    
    // Measure the width of text to replace using same method as completion
    const span = document.createElement('span');
    span.style.position = 'fixed';
    span.style.visibility = 'hidden';
    span.style.whiteSpace = 'pre';
    span.style.fontSize = inputStyles.fontSize;
    span.style.fontFamily = inputStyles.fontFamily;
    span.style.fontWeight = inputStyles.fontWeight;
    span.style.fontStyle = inputStyles.fontStyle;
    span.style.letterSpacing = inputStyles.letterSpacing;
    span.textContent = textToReplace;
    document.body.appendChild(span);
    
    try {
      const width = span.getBoundingClientRect().width;
      const lineHeight = parseFloat(inputStyles.lineHeight) || parseFloat(inputStyles.fontSize) || 16;
      
      if (width <= 0 || width > 10000) {
        this.shadowHighlight.style.visibility = 'hidden';
        return;
      }
      
      // Position at cursor (same as completion), extend backwards with negative marginLeft
      this.shadowHighlight.style.left = `${cursorPos.left}px`;
      this.shadowHighlight.style.top = `${cursorPos.top}px`;
      this.shadowHighlight.style.width = `${width}px`;
      this.shadowHighlight.style.height = `${lineHeight}px`;
      this.shadowHighlight.style.marginLeft = `-${width}px`;
      this.shadowHighlight.style.visibility = 'visible';
    } finally {
      document.body.removeChild(span);
    }
  }

  /**
   * Get cursor position (character index)
   */
  private getCursorPosition(): number | null {
    if (this.inputElement.tagName === 'INPUT' || this.inputElement.tagName === 'TEXTAREA') {
      const input = this.inputElement as HTMLInputElement | HTMLTextAreaElement;
      return input.selectionStart ?? null;
    } else if (this.inputElement.contentEditable === 'true' || this.inputElement.isContentEditable) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        return null;
      }
      const range = selection.getRangeAt(0);
      if (!this.inputElement.contains(range.commonAncestorContainer)) {
        return null;
      }
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(this.inputElement);
      preCaretRange.setEnd(range.endContainer, range.endOffset);
      return preCaretRange.toString().length;
    }
    return null;
  }

  /**
   * Get position of a specific character index
   */
  private getCharacterPosition(charIndex: number): { left: number; top: number } | null {
    // For contenteditable: use Range API
    if (this.inputElement.contentEditable === 'true' || this.inputElement.isContentEditable) {
      try {
        // Create a range at the character position
        const textContent = this.inputElement.textContent || '';
        if (charIndex > textContent.length) return null;
        
        const newRange = document.createRange();
        newRange.selectNodeContents(this.inputElement);
        
        // Move to character position using TreeWalker
        let currentPos = 0;
        const walker = document.createTreeWalker(
          this.inputElement,
          NodeFilter.SHOW_TEXT,
          null
        );
        
        let node;
        while ((node = walker.nextNode()) && currentPos < charIndex) {
          const nodeLength = node.textContent?.length || 0;
          if (currentPos + nodeLength >= charIndex) {
            newRange.setStart(node, charIndex - currentPos);
            break;
          }
          currentPos += nodeLength;
        }
        
        newRange.collapse(true);
        const rect = newRange.getBoundingClientRect();
        return { left: rect.left, top: rect.top };
      } catch (e) {
        return null;
      }
    }
    
    // For input/textarea: use existing measurement method with the character index
    const input = this.inputElement as HTMLInputElement | HTMLTextAreaElement;
    // getInputCaretPosition expects selectionStart, so we can use charIndex directly
    return this.getInputCaretPosition(input, charIndex);
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
   * Cleanup and remove the overlay
   */
  destroy(): void {
    // Hide shadow overlay (but don't remove host - it's shared)
    if (this.shadowOverlay) {
      this.shadowOverlay.style.visibility = 'hidden';
      this.shadowOverlay.textContent = '';
    }
  }
}

