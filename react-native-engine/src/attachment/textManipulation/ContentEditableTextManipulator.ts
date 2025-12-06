/**
 * Text manipulation for contenteditable elements.
 * Handles finding the actual text container within contenteditable elements.
 */

import {TextManipulator} from "./TextManipulator";
import {findActualInputElement} from "../elementDetection";
import {processBackspaces} from "./BackspaceProcessor";

export class ContentEditableTextManipulator implements TextManipulator {
  canHandle(element: HTMLElement): boolean {
    return element.contentEditable === 'true' || element.isContentEditable;
  }

  getText(element: HTMLElement): string {
    const actualElement = findActualInputElement(element);
    return actualElement.innerText || actualElement.textContent || '';
  }

  setText(element: HTMLElement, text: string): void {
    // Process backspaces before setting text
    const processedText = processBackspaces(text);
    this.setTextDirect(element, processedText);
  }

  setTextDirect(element: HTMLElement, processedText: string): void {
    const actualElement = findActualInputElement(element);
    
    // Try to insert text at cursor position first (better for rich text editors)
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      try {
        const range = selection.getRangeAt(0);
        // Check if range is within our element
        if (element.contains(range.commonAncestorContainer)) {
          // Delete current content in range and insert new text
          range.deleteContents();
          const textNode = document.createTextNode(processedText);
          range.insertNode(textNode);
          // Move cursor to end of inserted text
          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }
      } catch (e) {
        // Fall through to textContent method if Selection API fails
      }
    }
    
    // Fallback: set textContent (may lose formatting but works reliably)
    actualElement.textContent = processedText;
  }

  setCursorToEnd(element: HTMLElement): void {
    const actualElement = findActualInputElement(element);
    const selection = window.getSelection();
    if (selection) {
      const range = document.createRange();
      range.selectNodeContents(actualElement);
      range.collapse(false); // false = collapse to end
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  insertTextAtCursor(element: HTMLElement, text: string): void {
    const BACKSPACE = "\b";
    
    // Count backspaces at the start of the text
    let backspaceCount = 0;
    while (backspaceCount < text.length && text[backspaceCount] === BACKSPACE) {
      backspaceCount++;
    }
    
    // Get the text after backspaces
    const textToInsert = text.slice(backspaceCount);
    
    const actualElement = findActualInputElement(element);
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      try {
        const range = selection.getRangeAt(0);
        if (element.contains(range.commonAncestorContainer)) {
          // Simulate backspaces: delete characters backwards from cursor
          if (backspaceCount > 0) {
            // Move range backwards and delete characters one by one
            for (let i = 0; i < backspaceCount; i++) {
              if (range.startOffset > 0) {
                // Delete one character backwards
                range.setStart(range.startContainer, range.startOffset - 1);
                range.deleteContents();
              } else {
                // Try to move to previous text node
                let node = range.startContainer;
                while (node && node.nodeType !== Node.TEXT_NODE) {
                  node = node.previousSibling;
                }
                if (node && node.nodeType === Node.TEXT_NODE) {
                  const textNode = node as Text;
                  const textLength = textNode.textContent?.length || 0;
                  if (textLength > 0) {
                    range.setStart(textNode, textLength - 1);
                    range.setEnd(range.startContainer, range.startOffset);
                    range.deleteContents();
                  } else {
                    break; // Can't delete more
                  }
                } else {
                  break; // Can't delete more
                }
              }
            }
          }
          
          // Insert the text at cursor position
          range.deleteContents();
          const textNode = document.createTextNode(textToInsert);
          range.insertNode(textNode);
          range.setStartAfter(textNode);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
          return;
        }
      } catch (e) {
        // Fall through to fallback
      }
    }
    
    // Fallback: simulate backspaces and append
    const currentText = actualElement.textContent || '';
    const textAfterBackspaces = currentText.slice(0, Math.max(0, currentText.length - backspaceCount)) + textToInsert;
    actualElement.textContent = textAfterBackspaces;
  }
}

