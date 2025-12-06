/**
 * Parameter and configuration handling for autocomplete attachment.
 * Handles loading, coercing, fetching, and default values for controllers and options.
 */

import {AutocompleteTextController, AutocompleteTextControllerOptions} from "../engine/AutocompleteTextController";

/**
 * Options for attaching autocomplete to elements
 */
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
  
  /**
   * If true, directly set the element's text content instead of using execCommand.
   * execCommand is more natural but can have weird behavior in some cases.
   * Direct text setting is more reliable but may not trigger all the same events.
   * Default: false (uses execCommand)
   */
  useDirectTextSetting?: boolean;
}

export interface ResolvedConfig {
  controller: AutocompleteTextController;
  attachmentOptions: AttachAutocompleteOptions;
  controllerOptions: AutocompleteTextControllerOptions;
}

/**
 * Default selector for finding input elements
 */
export const DEFAULT_SELECTOR = 'input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], textarea, [contenteditable="true"]';

/**
 * Default attachment options
 */
export const DEFAULT_ATTACHMENT_OPTIONS: AttachAutocompleteOptions = {
  wrapperClass: 'autocomplete-wrapper',
  overlayClass: 'autocomplete-overlay',
  suggestionClass: 'autocomplete-suggestion',
};

/**
 * Controller option keys that should be separated from attachment options
 */
const CONTROLLER_OPTION_KEYS = ["maxCompletions", "tabBehavior", "tabSpacesCount", "maxLines"] as const;

/**
 * Split options into controller options and attachment options
 */
export function splitOptions(
  options?: AttachAutocompleteOptions & AutocompleteTextControllerOptions
): {
  controllerOptions: AutocompleteTextControllerOptions;
  attachmentOptions: AttachAutocompleteOptions;
} {
  const controllerOptions: AutocompleteTextControllerOptions = {};
  const attachmentOptions: AttachAutocompleteOptions = { ...DEFAULT_ATTACHMENT_OPTIONS };
  
  if (!options) {
    return { controllerOptions, attachmentOptions };
  }
  
  // Extract controller-specific options
  for (const key of CONTROLLER_OPTION_KEYS) {
    if (options[key] !== undefined) {
      (controllerOptions as any)[key] = options[key];
    }
  }
  
  // Remaining options go to attachment options
  for (const key in options) {
    if (!CONTROLLER_OPTION_KEYS.includes(key as any)) {
      (attachmentOptions as any)[key] = (options as any)[key];
    }
  }
  
  return { controllerOptions, attachmentOptions };
}

/**
 * Fetch completion list from a URL
 */
export async function fetchCompletionList(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch completion list from ${url}: ${response.statusText}`);
  }
  return response.text();
}

/**
 * Check if a string is a URL
 */
export function isUrl(str: string): boolean {
  return str.startsWith('http://') || str.startsWith('https://');
}

/**
 * Resolve and prepare controller from various input types
 * ALWAYS creates a new controller instance for each element.
 * Handles:
 * - AutocompleteTextController instances (clones to create new instance)
 * - String completion lists (creates new controller)
 * - URL strings (fetches and creates new controller)
 */
export function resolveController(
  controller: AutocompleteTextController | string | undefined,
  options?: AttachAutocompleteOptions & AutocompleteTextControllerOptions
): AutocompleteTextController {
  if (!controller) {
    throw new Error('Controller (completion list) is required');
  }
  
  const { controllerOptions } = splitOptions(options);
  
  // If it's already a controller instance, clone it to create a new instance
  // This ensures each element gets its own controller with the same settings
  if (controller instanceof AutocompleteTextController) {
    return controller.clone();
  }
  
  // If it's a string, it's either a URL or a completion list
  // Always create a new controller instance
  if (typeof controller === 'string') {
    return new AutocompleteTextController(controller, controllerOptions);
  }
  
  throw new Error('Invalid controller type');
}

/**
 * Handle URL-based controller fetching
 * Returns a cleanup function that can be called to cancel the fetch
 */
export function handleUrlController(
  url: string,
  inputElement: HTMLInputElement | HTMLTextAreaElement | HTMLElement | string | undefined,
  options: AttachAutocompleteOptions & AutocompleteTextControllerOptions | undefined,
  attachFunction: (
    inputElement: HTMLInputElement | HTMLTextAreaElement | HTMLElement | string | undefined,
    controller: AutocompleteTextController | string,
    options?: AttachAutocompleteOptions & AutocompleteTextControllerOptions
  ) => () => void
): () => void {
  const cleanupFunctions: (() => void)[] = [];
  let isCancelled = false;
  
  fetchCompletionList(url)
    .then(completionList => {
      if (!isCancelled) {
        const cleanup = attachFunction(inputElement, completionList, options);
        cleanupFunctions.push(cleanup);
      }
    })
    .catch(error => {
      console.error('[Automobile Complete] Failed to fetch completion list:', error);
    });
  
  return () => {
    isCancelled = true;
    cleanupFunctions.forEach(cleanup => cleanup());
  };
}

/**
 * Get default selector if inputElement is undefined
 */
export function getDefaultSelector(
  inputElement: HTMLInputElement | HTMLTextAreaElement | HTMLElement | string | undefined
): HTMLInputElement | HTMLTextAreaElement | HTMLElement | string {
  return inputElement === undefined ? DEFAULT_SELECTOR : inputElement;
}

/**
 * Expose controller to window.amc for debugging
 */
export function exposeControllerToWindow(controller: AutocompleteTextController): void {
  if (typeof window !== 'undefined') {
    (window as any).amc = controller;
    controller.help();
  }
}

