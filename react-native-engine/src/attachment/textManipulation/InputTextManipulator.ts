/**
 * Text manipulation for standard input and textarea elements.
 */

import {TextManipulator} from "./TextManipulator";
import {processBackspaces} from "./BackspaceProcessor";

export class InputTextManipulator implements TextManipulator {
  canHandle(element: HTMLElement): boolean {
    return element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';
  }

  getText(element: HTMLElement): string {
    return (element as HTMLInputElement | HTMLTextAreaElement).value || '';
  }

  setText(element: HTMLElement, text: string): void {
    // Process backspaces before setting text
    const processedText = processBackspaces(text);
    this.setTextDirect(element, processedText);
  }

  setTextDirect(element: HTMLElement, processedText: string): void {
    (element as HTMLInputElement | HTMLTextAreaElement).value = processedText;
  }

  setCursorToEnd(element: HTMLElement): void {
    const input = element as HTMLInputElement | HTMLTextAreaElement;
    const length = input.value.length;
    input.setSelectionRange(length, length);
  }

  insertTextAtCursor(element: HTMLElement, text: string): void {
    const input = element as HTMLInputElement | HTMLTextAreaElement;
    const BACKSPACE = "\b";
    
    // Count backspaces at the start of the text
    let backspaceCount = 0;
    while (backspaceCount < text.length && text[backspaceCount] === BACKSPACE) {
      backspaceCount++;
    }
    
    // Get the text after backspaces
    const textToInsert = text.slice(backspaceCount);
    
    // Simulate backspaces: delete characters backwards from cursor
    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    
    // Delete backspaceCount characters backwards
    if (backspaceCount > 0) {
      const deleteStart = Math.max(0, start - backspaceCount);
      const currentValue = input.value;
      input.value = currentValue.slice(0, deleteStart) + currentValue.slice(end);
      input.setSelectionRange(deleteStart, deleteStart);
    }
    
    // Insert the text at cursor position
    const insertStart = input.selectionStart || 0;
    const insertEnd = input.selectionEnd || 0;
    const currentValue = input.value;
    input.value = currentValue.slice(0, insertStart) + textToInsert + currentValue.slice(insertEnd);
    
    // Set cursor after inserted text
    const newCursorPos = insertStart + textToInsert.length;
    input.setSelectionRange(newCursorPos, newCursorPos);
  }
}

