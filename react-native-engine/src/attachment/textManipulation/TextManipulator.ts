/**
 * Text manipulation strategies for different element types.
 * Base interface for text manipulation implementations.
 */

import {HTMLElement} from "../../../types/dom";
import {processBackspaces} from "./BackspaceProcessor";

export interface TextManipulator {
  /**
   * Get the current text from the element
   */
  getText(element: HTMLElement): string;

  /**
   * Set text in the element.
   * Processes backspaces internally before setting the text.
   * @param element - The element to set text in
   * @param text - Raw text that may contain backspace characters (\b)
   */
  setText(element: HTMLElement, text: string): void;

  /**
   * Set text in the element without processing backspaces.
   * Use this when you've already processed the text yourself.
   * @param element - The element to set text in
   * @param processedText - Text that has already been processed (no backspaces)
   */
  setTextDirect(element: HTMLElement, processedText: string): void;

  /**
   * Set cursor position to the end of the text
   */
  setCursorToEnd(element: HTMLElement): void;

  /**
   * Insert text at the current cursor position
   */
  insertTextAtCursor(element: HTMLElement, text: string): void;

  /**
   * Check if this manipulator can handle the given element type
   */
  canHandle(element: HTMLElement): boolean;
}

