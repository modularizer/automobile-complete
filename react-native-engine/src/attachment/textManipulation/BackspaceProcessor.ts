/**
 * Utility for processing backspace characters in text.
 * Removes backspace chars and the preceding characters.
 */

const BACKSPACE = "\b";

/**
 * Process backspaces in text (remove backspace chars and preceding chars)
 */
export function processBackspaces(text: string): string {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    if (text[i] === BACKSPACE) {
      // Remove last character if there is one
      if (result.length > 0) {
        result = result.slice(0, -1);
      }
    } else {
      result += text[i];
    }
  }
  return result;
}

