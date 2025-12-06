/**
 * Text manipulation strategies for different element types.
 * Provides a factory to get the appropriate manipulator for an element.
 */

import {TextManipulator} from "./TextManipulator";
import {InputTextManipulator} from "./InputTextManipulator";
import {ContentEditableTextManipulator} from "./ContentEditableTextManipulator";

const manipulators: TextManipulator[] = [
  new InputTextManipulator(),
  new ContentEditableTextManipulator(),
];

/**
 * Get the appropriate text manipulator for an element
 */
export function getTextManipulator(element: HTMLElement): TextManipulator {
  for (const manipulator of manipulators) {
    if (manipulator.canHandle(element)) {
      return manipulator;
    }
  }
  
  // Fallback to input manipulator
  return new InputTextManipulator();
}

export {TextManipulator} from "./TextManipulator";
export {InputTextManipulator} from "./InputTextManipulator";
export {ContentEditableTextManipulator} from "./ContentEditableTextManipulator";

