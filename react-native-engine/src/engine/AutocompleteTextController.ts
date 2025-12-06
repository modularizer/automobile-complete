import { Trie } from "./Trie";
import { TAB, BACKSPACE } from "./constants";

// Type declarations for Chrome extension APIs
declare const chrome: {
  storage: {
    local: {
      get(keys: string[]): Promise<{ [key: string]: any }>;
      set(items: { [key: string]: any }): Promise<void>;
      remove(keys: string[]): Promise<void>;
    };
  };
} | undefined;

export interface CompletionOption {
  typedPrefix: string;
  remainingPrefix: string;
  completion: string;
  originalCompletion?: string; // Original completion with backspaces preserved (for full replacements)
}

export type TabBehavior =
  | "insert-tab" // Insert a normal tab character
  | "insert-spaces" // Insert spaces (configurable count)
  | "do-nothing" // Do nothing
  | "select-best" // Always select the best option
  | "select-if-single"; // Select best option only if there's exactly one option

export interface AutocompleteTextControllerOptions {
  maxCompletions?: number;
  tabBehavior?: TabBehavior;
  tabSpacesCount?: number; // Number of spaces to insert when tabBehavior is "insert-spaces"
  maxLines?: number | null; // Maximum number of lines. null or >1 allows multiline, 1 is single-line
}

// Global registry of all controller instances
const controllerRegistry = new Set<AutocompleteTextController>();

// Storage type for personal dictionary
export type PersonalDictionaryStorage = 'local' | 'shared' | 'both';

// Helper functions for Chrome extension storage
function isChromeExtension(): boolean {
  return typeof chrome !== 'undefined' && 
         chrome !== null && 
         typeof chrome.storage !== 'undefined' && 
         typeof chrome.storage.local !== 'undefined';
}

async function getChromeStorage(key: string): Promise<string | null> {
  if (!isChromeExtension() || !chrome) return null;
  try {
    const result = await chrome.storage.local.get([key]);
    return result[key] || null;
  } catch (e) {
    console.warn("[AutocompleteTextController] Failed to read from chrome.storage:", e);
    return null;
  }
}

async function setChromeStorage(key: string, value: string): Promise<void> {
  if (!isChromeExtension() || !chrome) return;
  try {
    await chrome.storage.local.set({ [key]: value });
  } catch (e) {
    console.warn("[AutocompleteTextController] Failed to write to chrome.storage:", e);
  }
}

async function removeChromeStorage(key: string): Promise<void> {
  if (!isChromeExtension() || !chrome) return;
  try {
    await chrome.storage.local.remove([key]);
  } catch (e) {
    console.warn("[AutocompleteTextController] Failed to remove from chrome.storage:", e);
  }
}

export class AutocompleteTextController {
  private _currentNode: Trie | null = null;
  private _focusedIndex: number | null = null;
  private _inputRef: { current: any } | null = null;
  private _maxCompletions: number | undefined = undefined;
  private _tabBehavior: TabBehavior = "select-if-single";
  private _tabSpacesCount: number = 2;
  private _maxLines: number | null = null;
  private _originalCompletionList: string = "";

  private listeners: Set<() => void> = new Set();

  constructor(completionList: string, options?: AutocompleteTextControllerOptions) {
    if (options) {
      this._maxCompletions = options.maxCompletions;
      this._tabBehavior = options.tabBehavior || "select-if-single";
      this._tabSpacesCount = options.tabSpacesCount || 2;
      this._maxLines = options.maxLines !== undefined ? options.maxLines : null;
    } else {
      this._tabBehavior = "select-if-single";
      this._tabSpacesCount = 2;
      this._maxLines = null;
    }

    // bind
      this.handleArrowDown = this.handleArrowDown.bind(this);
    this.handleArrowUp = this.handleArrowUp.bind(this);
    this.handleKeyPress = this.handleKeyPress.bind(this);
    this.handleTextChange = this.handleTextChange.bind(this);
    this.handleTabOrEnter = this.handleTabOrEnter.bind(this);
    this.walkTo = this.walkTo.bind(this);
    this.selectCompletion = this.selectCompletion.bind(this);
    this.setInputRef = this.setInputRef.bind(this);
    this.setMaxCompletions = this.setMaxCompletions.bind(this);
    this.setTabBehavior = this.setTabBehavior.bind(this);
    this.setTabSpacesCount = this.setTabSpacesCount.bind(this);
    this.setMaxLines = this.setMaxLines.bind(this);
    this.resetToRoot = this.resetToRoot.bind(this);
    this.subscribe = this.subscribe.bind(this);
    this.initializeTrie = this.initializeTrie.bind(this);
    this.acceptCurrentSuggestion = this.acceptCurrentSuggestion.bind(this);
    this.saveWord = this.saveWord.bind(this);
    this.saveDictionary = this.saveDictionary.bind(this);
    this.removeWord = this.removeWord.bind(this);
    this.resetCompletions = this.resetCompletions.bind(this);
    this.help = this.help.bind(this);
    
    //     console.log("[AutocompleteTextController] Constructor called, completionList length:", completionList.length);
    this._originalCompletionList = completionList;
    this.initializeTrie(completionList);
    
    // Register this controller instance
    controllerRegistry.add(this);
    console.log("[AutocompleteTextController] Registered controller. Total controllers:", controllerRegistry.size);
  }

  private setCurrentNode(currentNode: Trie | null): void {
      this._currentNode = currentNode;
      // Set window.trie for debugging (web environments)
      if (typeof window !== 'undefined') {
          (window as any).trie = currentNode;
      }
      
      // Log current node prefix and completion whenever it changes
      if (currentNode) {
          const prefix = currentNode.prefix || '';
          const completion = currentNode.completion || '';
          console.info(`[AutocompleteTextController] currentNode.prefix: "${prefix}" | currentNode.completion: "${completion}"`);
      } else {
          console.info('[AutocompleteTextController] currentNode is null');
      }
  }
  private resetToRoot(){
      // @ts-ignore
      this.setCurrentNode(this._currentNode.root ?? this._currentNode);
  }
  private walkTo(s: string, options?: { handle_control_characters?: boolean }){
      this.setCurrentNode(this._currentNode!.walk_to(s, options))
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  initializeTrie(completionList: string) {
    console.log("[AutocompleteTextController] initializeTrie called with completion list length:", completionList.length);
    console.log("[AutocompleteTextController] First 200 chars of completion list:", completionList.substring(0, 200));
    try {
    const t = Trie.fromWords(completionList);
      console.log("[AutocompleteTextController] Trie created, root children count:", Object.keys(t.children || {}).length);
      console.log("[AutocompleteTextController] Sample root children:", Object.keys(t.children || {}).slice(0, 10));
      
      // Load personal dictionaries from both localStorage (per-domain) and chrome.storage (shared)
      // Merge them together, with chrome.storage entries taking precedence for conflicts
      const allDictLines: string[] = [];
      
      // Load from localStorage (per-domain)
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const localDict = window.localStorage.getItem('personalDictionary');
          if (localDict && localDict.trim().length > 0) {
            console.log("[AutocompleteTextController] Loading personal dictionary from localStorage, length:", localDict.length);
            const lines = localDict.split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0 && line.includes('|'));
            allDictLines.push(...lines);
            console.log("[AutocompleteTextController] Loaded", lines.length, "entries from localStorage");
          }
        } catch (e) {
          console.warn("[AutocompleteTextController] Failed to load personal dictionary from localStorage:", e);
        }
      }
      
      // Load from chrome.storage (shared across all pages) - use sync approach with fallback
      if (isChromeExtension()) {
        try {
          // Use a synchronous approach: try to get immediately, if not available, load async and update
          getChromeStorage('personalDictionary').then(sharedDict => {
            if (sharedDict && sharedDict.trim().length > 0) {
              console.log("[AutocompleteTextController] Loading personal dictionary from chrome.storage (async), length:", sharedDict.length);
              // Re-initialize with the shared dict loaded
              this.loadAndMergePersonalDictionary(t, sharedDict, allDictLines);
            }
          }).catch(e => {
            console.warn("[AutocompleteTextController] Failed to load personal dictionary from chrome.storage:", e);
          });
        } catch (e) {
          console.warn("[AutocompleteTextController] Failed to access chrome.storage:", e);
        }
      }
      
      // Insert entries from localStorage (chrome.storage will be loaded async and merged later)
      this.insertPersonalDictionaryEntries(t, allDictLines);
      
      if (allDictLines.length > 0) {
        console.log("[AutocompleteTextController] Personal dictionary loaded:", allDictLines.length, "entries from localStorage");
      }
      
      this.setCurrentNode(t);
      // console.log("[AutocompleteTextController] Page load - Current node:", this._currentNode);
    this.notifyListeners();
    } catch (error) {
      console.error("[AutocompleteTextController] Error initializing trie:", error);
      throw error;
    }
  }

  private loadAndMergePersonalDictionary(t: Trie, sharedDict: string, existingLines: string[]) {
    const sharedLines = sharedDict.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0 && line.includes('|'));
    
    // Merge: shared (chrome.storage) entries override local (localStorage) entries
    const dictMap = new Map<string, string>();
    
    // First add existing (localStorage) entries
    for (const line of existingLines) {
      const lineWithoutFreq = line.split(' #')[0];
      const [pre] = lineWithoutFreq.split('|');
      if (pre) {
        dictMap.set(pre.trim().toLowerCase(), line);
      }
    }
    
    // Then add shared entries (they override local ones)
    for (const line of sharedLines) {
      const lineWithoutFreq = line.split(' #')[0];
      const [pre] = lineWithoutFreq.split('|');
      if (pre) {
        dictMap.set(pre.trim().toLowerCase(), line);
      }
    }
    
    // Insert merged entries into the existing trie
    const mergedLines = Array.from(dictMap.values());
    console.log("[AutocompleteTextController] Merged", mergedLines.length, "unique personal dictionary entries (local + shared)");
    
    this.insertPersonalDictionaryEntries(t, mergedLines);
    
    // Update current node if we're at root
    if (this._currentNode?.root === t || this._currentNode === t) {
      this.setCurrentNode(t);
      this.notifyListeners();
    }
  }

  private reinitializeAllControllers(textToRestore: string) {
    // Update ALL controller instances, not just this one
    console.log("[AutocompleteTextController] Updating", controllerRegistry.size, "controller instance(s)");
    let updateCount = 0;
    controllerRegistry.forEach(controller => {
      updateCount++;
      console.log("[AutocompleteTextController] Updating controller", updateCount, "of", controllerRegistry.size);
      
      // Get the actual input value for each controller
      let textToRestoreForController = '';
      if (controller._inputRef?.current) {
        textToRestoreForController = controller._inputRef.current.value || '';
      }
      if (!textToRestoreForController) {
        textToRestoreForController = controller.text;
      }
      
      // Reinitialize the trie with the updated personal dictionary
      controller.initializeTrie(controller._originalCompletionList);
      
      // Restore text position after reinitialization
      if (textToRestoreForController) {
        controller.resetToRoot();
        controller.walkTo(textToRestoreForController);
      } else {
        controller.resetToRoot();
      }
      
      controller.notifyListeners();
      console.log("[AutocompleteTextController] Controller", updateCount, "updated. Text restored:", textToRestoreForController);
    });
  }

  private insertPersonalDictionaryEntries(t: Trie, lines: string[]) {
    for (const line of lines) {
      // Parse the line (format: prefix|completion or prefix|completion #freq)
      let freq = 1000000; // Very high frequency for personal dictionary
      let processedLine = line;
      
      // If line has frequency, use it but ensure it's high
      if (line.includes(' #')) {
        const parts = line.split(' #');
        processedLine = parts.slice(0, -1).join(' #');
        const existingFreq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(existingFreq) && existingFreq > freq) {
          freq = existingFreq;
        }
      }
      
      // Check for full replacement separator ||
      if (processedLine.includes('||')) {
        const [pre, ...postParts] = processedLine.split('||');
        let post = postParts.join('||').trimEnd();
        // Convert to backspaces + completion
        const backspaces = BACKSPACE.repeat(pre.length);
        post = backspaces + post;
        if (pre && post) {
          t.insert_pair(pre, post, freq);
          console.log("[AutocompleteTextController] Inserted personal dict entry (full replacement):", pre, "||", postParts.join('||'));
        }
      } else if (processedLine.includes('|')) {
        const [pre, ...postParts] = processedLine.split('|');
        const post = postParts.join('|').trimEnd();
        if (pre && post) {
          // Insert with high frequency - this will override any existing entries
          t.insert_pair(pre, post, freq);
          console.log("[AutocompleteTextController] Inserted personal dict entry:", pre, "|", post);
        }
      }
    }
  }

  private updateSuggestion(newText: string) {
    if (!this._currentNode) return;

    // FIXME: this is probably slow and unnecessary to walk from root
    this.resetToRoot();
    this.walkTo(newText);
    this._focusedIndex = null;
    
    // // console.log("[AutocompleteTextController] Keystroke - Current node:", this._currentNode);
  }

  get text(): string {
    return this._currentNode?.full_text || "";
  }

  get suggestion(): string {
    return this._currentNode?.completion || "";
  }

  get currentNode(): Trie | null {
    return this._currentNode;
  }

  get focusedIndex(): number | null {
    return this._focusedIndex;
  }

  get availableCompletions(): CompletionOption[] {
    return this._currentNode ? this._currentNode.completionOptions(this._maxCompletions) : [];
  }

  /**
   * Get the original completion list used to create this controller
   */
  get originalCompletionList(): string {
    return this._originalCompletionList;
  }

  /**
   * Get the current options for this controller
   */
  getOptions(): AutocompleteTextControllerOptions {
    return {
      maxCompletions: this._maxCompletions,
      tabBehavior: this._tabBehavior,
      tabSpacesCount: this._tabSpacesCount,
      maxLines: this._maxLines,
    };
  }

  /**
   * Create a new controller instance with the same completion list and options
   * Each element should have its own controller instance to avoid shared state
   */
  clone(): AutocompleteTextController {
    return new AutocompleteTextController(this._originalCompletionList, this.getOptions());
  }

  get tabSelectableIndex(): number | null {
    const completions = this.availableCompletions;
    
    // If there's a focused option, that's what Tab would select
    if (this._focusedIndex !== null && completions[this._focusedIndex]) {
      return this._focusedIndex;
    }

    // If there's a suggestion, find the option that matches it
    const suggestion = this.suggestion;
    if (suggestion) {
      const matchingIndex = completions.findIndex(
        (opt) => opt.completion === suggestion
      );
      if (matchingIndex !== -1) {
        return matchingIndex;
      }
    }

    // Otherwise, check if tabBehavior would select the best option
    if (this._tabBehavior === "select-best") {
      return completions.length > 0 ? 0 : null;
    }

    if (this._tabBehavior === "select-if-single" && completions.length === 1) {
      return 0;
    }

    return null;
  }

  setMaxCompletions(maxCompletions: number | undefined) {
    this._maxCompletions = maxCompletions;
    this.notifyListeners();
  }

  setTabBehavior(behavior: TabBehavior) {
    this._tabBehavior = behavior;
  }

  setTabSpacesCount(count: number) {
    this._tabSpacesCount = count;
  }

  get maxLines(): number | null {
    return this._maxLines;
  }

  setMaxLines(maxLines: number | null) {
    this._maxLines = maxLines;
    this.notifyListeners();
  }

  setInputRef(ref: { current: any }) {
    this._inputRef = ref;
  }

  handleTextChange(newText: string) {
      // console.log("handling text", newText, this._currentNode);
    if (!this._currentNode) {
      this.updateSuggestion(newText);
      this.notifyListeners();
      return;
    }

    // Compare with prefix only, not full_text (which includes completion)
    // The element text only contains what the user typed (prefix), not the suggestion
    const currentPrefix = this._currentNode.prefix || "";
    console.log("[AutocompleteTextController] handleTextChange - newText:", newText, "currentPrefix:", currentPrefix, "currentNode prefix:", this._currentNode?.prefix, "completion:", this._currentNode?.completion);
    
    // If text matches prefix, we're already in sync - skip
    if (newText === currentPrefix) {
      return;
    }
    
    // Otherwise, handle it (simple append/delete or complex edit)
    if (newText.startsWith(currentPrefix) && newText.length > currentPrefix.length) {
      // Simple append
      const toAppend = newText.slice(currentPrefix.length);
      console.log("[AutocompleteTextController] Simple append, walking to:", toAppend);
      this.walkTo(toAppend);
      this._focusedIndex = null;
      console.log("[AutocompleteTextController] After walk - prefix:", this._currentNode?.prefix, "completion:", this._currentNode?.completion);
      this.notifyListeners();
    } else if (currentPrefix.startsWith(newText) && newText.length < currentPrefix.length) {
      // Simple delete
      this.walkTo(BACKSPACE.repeat(currentPrefix.length - newText.length));
      this._focusedIndex = null;
      this.notifyListeners();
    } else {
      // Complex edit - reset to root
      console.log("[AutocompleteTextController] Complex edit, resetting to root and walking to:", newText);
      this.updateSuggestion(newText);
      this.notifyListeners();
    }
  }

  handleArrowDown() {
    const completions = this.availableCompletions;
    if (completions.length > 0) {
      this._focusedIndex =
        this._focusedIndex === null
          ? 0
          : Math.min(this._focusedIndex + 1, completions.length - 1);
      this.notifyListeners();
    }
  }

  handleArrowUp() {
    const completions = this.availableCompletions;
    if (completions.length > 0) {
      this._focusedIndex =
        this._focusedIndex === null
          ? completions.length - 1
          : Math.max(this._focusedIndex - 1, 0);
      this.notifyListeners();
    }
  }

  selectCompletion(completion: CompletionOption) {
    if (!this._currentNode) return;

    // Use originalCompletion if available (preserves backspaces for full replacements),
    // otherwise use the display completion
    const completionToUse = completion.originalCompletion ?? completion.completion;
    
    // Walk from current node to append the remaining prefix and completion
    // Pass handle_control_characters: true to ensure backspaces are processed
    const textToAppend = completion.remainingPrefix + completionToUse;
    this.walkTo(textToAppend, { handle_control_characters: true });
    this._focusedIndex = null;
    this.notifyListeners();

    // Refocus the input
    if (this._inputRef?.current) {
      this._inputRef.current.focus();
    }
  }

  acceptCurrentSuggestion() {
    if (!this.suggestion) return;

    // Walk from current node with TAB - Trie handles everything
    this.walkTo(TAB);
    this._focusedIndex = null;
    this.notifyListeners();

    // Refocus the input
    if (this._inputRef?.current) {
      this._inputRef.current.focus();
    }
  }

  handleTabOrEnter() {
    const completions = this.availableCompletions;
    
    // If there's a focused option, always select it
    if (
      this._focusedIndex !== null &&
      completions[this._focusedIndex]
    ) {
      this.selectCompletion(completions[this._focusedIndex]);
      return;
    }

    // Handle different tab behaviors when no suggestion is available
    if (!this.suggestion) {
      switch (this._tabBehavior) {
        case "insert-tab":
          this.walkTo(TAB);
          this.notifyListeners();
          return;

        case "insert-spaces":
          this.walkTo(" ".repeat(this._tabSpacesCount));
          this.notifyListeners();
          return;

        case "do-nothing":
          return;

        case "select-best":
          // Fall through to select best option
          break;

        case "select-if-single":
          // Only proceed if there's exactly one option
          if (completions.length !== 1) {
            return;
          }
          // Fall through to select the single option
          break;
      }
    }

    // If we have a suggestion, accept it
    if (this.suggestion) {
      this.acceptCurrentSuggestion();
      return;
    }

    // If we have completions and behavior allows, select the best one
    if (completions.length > 0 && (this._tabBehavior === "select-best" || this._tabBehavior === "select-if-single")) {
      this.selectCompletion(completions[0]);
    }
  }

  handleKeyPress(e: any) {
    const key = e.nativeEvent?.key || e.key;

    // Handle arrow keys for navigation
    if (key === "ArrowDown") {
      e.preventDefault?.();
      this.handleArrowDown();
      return;
    }

    if (key === "ArrowUp") {
      e.preventDefault?.();
      this.handleArrowUp();
      return;
    }

    // Handle Tab key to accept completion or focused option
    if (key === "Tab") {
      e.preventDefault?.();
      this.handleTabOrEnter();
      return;
    }

    // Handle Enter key - only prevent default if single-line mode
    if (key === "Enter") {
      const isMultiline = this._maxLines === null || this._maxLines > 1;
      if (!isMultiline) {
        e.preventDefault?.();
        this.handleTabOrEnter();
      }
      // If multiline, allow Enter to create newline (don't prevent default)
      return;
    }

  }

  /**
   * Adds one or more words to the personal dictionary and to the active Trie node.
   * @param words - A string or array of strings in the format "prefix|completion" or "prefix|completion #freq"
   * @param storage - Where to save: 'local' (per-domain localStorage), 'shared' (chrome.storage), or 'both' (default)
   */
  saveWord(words: string | string[], storage: PersonalDictionaryStorage = 'both'): void {
    if (!this._currentNode) {
      console.warn("[AutocompleteTextController] Cannot save word: Trie not initialized");
      return;
    }

    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn("[AutocompleteTextController] Cannot save word: localStorage not available");
      return;
    }

    const wordArray = Array.isArray(words) ? words : [words];
    const personalDictFreq = 1000000; // High frequency for personal dictionary entries

    // Get existing personal dictionaries from both storages
    let existingLocalDict = '';
    let existingSharedDict = '';
    
    if (storage === 'local' || storage === 'both') {
      try {
        const stored = window.localStorage.getItem('personalDictionary');
        if (stored) {
          existingLocalDict = stored;
        }
      } catch (e) {
        console.warn("[AutocompleteTextController] Failed to read personal dictionary from localStorage:", e);
      }
    }
    
    if (storage === 'shared' || storage === 'both') {
      if (isChromeExtension()) {
        // We'll handle async chrome.storage in the save logic
      } else {
        console.warn("[AutocompleteTextController] Chrome extension not detected, cannot save to shared storage");
        if (storage === 'shared') {
          return; // Can't save to shared if not in extension
        }
      }
    }

    // Extract prefixes from new words to remove conflicting entries
    const newPrefixes = new Set<string>();
    const newWords: string[] = [];
    
    // First pass: parse new words and collect prefixes
    for (const word of wordArray) {
      const trimmed = word.trim();
      if (!trimmed || !trimmed.includes('|')) {
        console.warn("[AutocompleteTextController] Invalid word format (must contain '|'):", word);
        continue;
      }

      // Remove frequency suffix if present to get the actual prefix
      const lineWithoutFreq = trimmed.split(' #')[0];
      const [pre] = lineWithoutFreq.split('|');
      if (pre) {
        newPrefixes.add(pre.trim().toLowerCase());
      }
      
      // Ensure the word has high frequency if not specified
      let processedWord = trimmed;
      if (!trimmed.includes(' #')) {
        processedWord = `${trimmed} #${personalDictFreq}`;
      } else {
        // If frequency is specified, ensure it's high enough
        const parts = trimmed.split(' #');
        const existingFreq = parseInt(parts[parts.length - 1], 10);
        if (isNaN(existingFreq) || existingFreq < personalDictFreq) {
          processedWord = `${parts.slice(0, -1).join(' #')} #${personalDictFreq}`;
        }
      }
      
      newWords.push(processedWord);
    }

    // Helper function to filter conflicting entries
    const filterConflicts = (dict: string): string => {
      if (!dict) return '';
      const existingLines = dict.split('\n');
      const filteredLines = existingLines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.includes('|')) {
          return true; // Keep invalid lines
        }
        
        // Remove frequency suffix if present
        const lineWithoutFreq = trimmed.split(' #')[0];
        const [pre] = lineWithoutFreq.split('|');
        const prefixLower = pre ? pre.trim().toLowerCase() : '';
        
        // Remove if:
        // 1. This entry's prefix exactly matches any new prefix, OR
        // 2. This entry's prefix starts with any new prefix (e.g., "appl" starts with "app")
        for (const newPrefix of newPrefixes) {
          if (prefixLower === newPrefix || prefixLower.startsWith(newPrefix)) {
            return false; // Remove this entry
          }
        }
        
        return true; // Keep this entry
      });
      
      return filteredLines.join('\n');
    };
    
    const filteredLocalDict = filterConflicts(existingLocalDict);
    const filteredSharedDict = storage === 'shared' || storage === 'both' ? '' : existingSharedDict; // Will be loaded async if needed

    // Prepare updated dictionaries
    const updateDict = (filtered: string): string => {
      if (filtered && filtered.trim()) {
        return `${filtered}\n${newWords.join('\n')}`;
      } else {
        return newWords.join('\n');
      }
    };
    
    try {
      // Get the actual input value before reinitializing (controller might be out of sync)
      let textToRestore = '';
      if (this._inputRef?.current) {
        textToRestore = this._inputRef.current.value || '';
      }
      // Fallback to controller text if no input ref
      if (!textToRestore) {
        textToRestore = this.text;
      }
      
      // Save to localStorage if needed
      if (storage === 'local' || storage === 'both') {
        const updatedLocalDict = updateDict(filteredLocalDict);
        window.localStorage.setItem('personalDictionary', updatedLocalDict);
        console.log("[AutocompleteTextController] Saved to localStorage");
      }
      
      // Save to chrome.storage if needed (async)
      if ((storage === 'shared' || storage === 'both') && isChromeExtension()) {
        getChromeStorage('personalDictionary').then(existingShared => {
          const filteredShared = filterConflicts(existingShared || '');
          const updatedSharedDict = updateDict(filteredShared);
          return setChromeStorage('personalDictionary', updatedSharedDict);
        }).then(() => {
          console.log("[AutocompleteTextController] Saved to chrome.storage");
          // Reinitialize all controllers after async save completes
          this.reinitializeAllControllers(textToRestore);
        }).catch(e => {
          console.error("[AutocompleteTextController] Failed to save to chrome.storage:", e);
          // Still reinitialize with local changes even if shared save failed
          this.reinitializeAllControllers(textToRestore);
        });
      } else {
        // Reinitialize immediately if not using shared storage
        this.reinitializeAllControllers(textToRestore);
      }
      
      console.log("[AutocompleteTextController] Saved", newWords.length, "word(s) to", storage, "storage");
    } catch (e) {
      console.error("[AutocompleteTextController] Failed to save personal dictionary to localStorage:", e);
    }
  }

  /**
   * Overwrites the personal dictionary and reinitializes the trie.
   * @param dictionary - A completion list string in the format "prefix|completion" (one per line)
   * @param storage - Where to save: 'local' (per-domain localStorage), 'shared' (chrome.storage), or 'both' (default)
   */
  saveDictionary(dictionary: string, storage: PersonalDictionaryStorage = 'both'): void {
    if (!this._currentNode) {
      console.warn("[AutocompleteTextController] Cannot save dictionary: Trie not initialized");
      return;
    }

    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn("[AutocompleteTextController] Cannot save dictionary: localStorage not available");
      return;
    }

    try {
      // Get the actual input value before reinitializing
      let textToRestore = '';
      if (this._inputRef?.current) {
        textToRestore = this._inputRef.current.value || '';
      }
      // Fallback to controller text if no input ref
      if (!textToRestore) {
        textToRestore = this.text;
      }
      
      // Save to localStorage if needed
      if (storage === 'local' || storage === 'both') {
        window.localStorage.setItem('personalDictionary', dictionary);
        console.log("[AutocompleteTextController] Saved to localStorage");
      }
      
      // Save to chrome.storage if needed (async)
      if ((storage === 'shared' || storage === 'both') && isChromeExtension()) {
        setChromeStorage('personalDictionary', dictionary).then(() => {
          console.log("[AutocompleteTextController] Saved to chrome.storage");
          this.reinitializeAllControllers(textToRestore);
        }).catch(e => {
          console.error("[AutocompleteTextController] Failed to save to chrome.storage:", e);
          this.reinitializeAllControllers(textToRestore);
        });
      } else {
        this.reinitializeAllControllers(textToRestore);
      }
      
      console.log("[AutocompleteTextController] Saved new personal dictionary to", storage, "storage");
    } catch (e) {
      console.error("[AutocompleteTextController] Failed to save dictionary:", e);
    }
  }

  /**
   * Removes a word from the personal dictionary.
   * The word parameter should not include the pipe - it will match against both prefix and completion.
   * @param word - A word to remove (matches prefix or completion in entries like "prefix|completion")
   * @param storage - Where to remove from: 'local' (per-domain localStorage), 'shared' (chrome.storage), or 'both' (default)
   */
  removeWord(word: string, storage: PersonalDictionaryStorage = 'both'): void {
    if (!this._currentNode) {
      console.warn("[AutocompleteTextController] Cannot remove word: Trie not initialized");
      return;
    }

    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn("[AutocompleteTextController] Cannot remove word: localStorage not available");
      return;
    }

    const trimmedWord = word.trim();
    if (!trimmedWord) {
      console.warn("[AutocompleteTextController] Cannot remove word: empty word provided");
      return;
    }

    // Helper function to filter out matching words
    const filterWord = (dict: string): { filtered: string; removedCount: number } => {
      if (!dict || dict.trim().length === 0) {
        return { filtered: '', removedCount: 0 };
      }
      
      const lines = dict.split('\n');
      const filteredLines = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.includes('|')) {
          return true; // Keep invalid lines
        }
        
        // Remove frequency suffix if present
        const lineWithoutFreq = trimmed.split(' #')[0];
        const [pre, ...postParts] = lineWithoutFreq.split('|');
        const post = postParts.join('|').trim();
        
        // Check if word matches prefix or completion (case-insensitive)
        const preLower = pre.toLowerCase();
        const postLower = post.toLowerCase();
        const wordLower = trimmedWord.toLowerCase();
        
        return preLower !== wordLower && postLower !== wordLower && 
               !preLower.includes(wordLower) && !postLower.includes(wordLower);
      });
      
      return { filtered: filteredLines.join('\n'), removedCount: lines.length - filteredLines.length };
    };
    
    try {
      // Get the actual input value before reinitializing
      let textToRestore = '';
      if (this._inputRef?.current) {
        textToRestore = this._inputRef.current.value || '';
      }
      if (!textToRestore) {
        textToRestore = this.text;
      }
      
      let totalRemoved = 0;
      
      // Remove from localStorage if needed
      if (storage === 'local' || storage === 'both') {
        const stored = window.localStorage.getItem('personalDictionary') || '';
        const { filtered, removedCount } = filterWord(stored);
        window.localStorage.setItem('personalDictionary', filtered);
        totalRemoved += removedCount;
        console.log("[AutocompleteTextController] Removed", removedCount, "word(s) from localStorage");
      }
      
      // Remove from chrome.storage if needed (async)
      if ((storage === 'shared' || storage === 'both') && isChromeExtension()) {
        getChromeStorage('personalDictionary').then(stored => {
          const { filtered, removedCount } = filterWord(stored || '');
          totalRemoved += removedCount;
          return setChromeStorage('personalDictionary', filtered);
        }).then(() => {
          console.log("[AutocompleteTextController] Removed word(s) from chrome.storage");
          this.reinitializeAllControllers(textToRestore);
        }).catch(e => {
          console.error("[AutocompleteTextController] Failed to remove from chrome.storage:", e);
          this.reinitializeAllControllers(textToRestore);
        });
      } else {
        this.reinitializeAllControllers(textToRestore);
      }
      
      console.log("[AutocompleteTextController] Removed word(s) from", storage, "storage");
    } catch (e) {
      console.error("[AutocompleteTextController] Failed to remove word from personal dictionary:", e);
    }
  }

  /**
   * Clears the personal dictionary and reinitializes the trie with only the original completion list.
   * @param storage - Where to clear from: 'local' (per-domain localStorage), 'shared' (chrome.storage), or 'both' (default)
   */
  resetCompletions(storage: PersonalDictionaryStorage = 'both'): void {
    if (!this._currentNode) {
      console.warn("[AutocompleteTextController] Cannot reset completions: Trie not initialized");
      return;
    }

    if (typeof window === 'undefined' || !window.localStorage) {
      console.warn("[AutocompleteTextController] Cannot reset completions: localStorage not available");
      return;
    }

    try {
      // Get the actual input value before reinitializing
      let textToRestore = '';
      if (this._inputRef?.current) {
        textToRestore = this._inputRef.current.value || '';
      }
      // Fallback to controller text if no input ref
      if (!textToRestore) {
        textToRestore = this.text;
      }
      
      // Clear localStorage if needed
      if (storage === 'local' || storage === 'both') {
        window.localStorage.removeItem('personalDictionary');
        console.log("[AutocompleteTextController] Cleared localStorage");
      }
      
      // Clear chrome.storage if needed (async)
      if ((storage === 'shared' || storage === 'both') && isChromeExtension()) {
        removeChromeStorage('personalDictionary').then(() => {
          console.log("[AutocompleteTextController] Cleared chrome.storage");
          this.reinitializeAllControllers(textToRestore);
        }).catch(e => {
          console.error("[AutocompleteTextController] Failed to clear chrome.storage:", e);
          this.reinitializeAllControllers(textToRestore);
        });
      } else {
        this.reinitializeAllControllers(textToRestore);
      }
      
      console.log("[AutocompleteTextController] Cleared personal dictionary from", storage, "storage");
    } catch (e) {
      console.error("[AutocompleteTextController] Failed to reset completions:", e);
    }
  }

  /**
   * Logs helpful instructions for using the autocomplete controller.
   */
  help(): void {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║          AutocompleteTextController - Usage Guide              ║
╚════════════════════════════════════════════════════════════════╝

📖 PROPERTIES:
  • amc.text                    - Current text in the controller
  • amc.suggestion              - Current suggestion text
  • amc.currentNode            - Current Trie node
  • amc.focusedIndex           - Currently focused completion index
  • amc.availableCompletions   - Array of all available completions
  • amc.tabSelectableIndex     - Index that Tab would select
  • amc.maxLines               - Maximum lines allowed (null = unlimited)

💾 PERSONAL DICTIONARY:
  • amc.saveWord('prefix|completion')           - Add word(s) to personal dictionary (default: saves to both)
  • amc.saveWord('prefix|completion', 'local')  - Save only to per-domain localStorage
  • amc.saveWord('prefix|completion', 'shared') - Save only to shared chrome.storage (extension only)
  • amc.saveWord('prefix|completion', 'both')  - Save to both storages (default)
  • amc.saveDictionary(dict, storage?)         - Overwrite entire dictionary (storage: 'local'|'shared'|'both')
  • amc.removeWord('word', storage?)          - Remove word(s) (storage: 'local'|'shared'|'both')
  • amc.resetCompletions(storage?)            - Clear dictionary (storage: 'local'|'shared'|'both')
  
  ⚠️  IMPORTANT: saveWord() automatically removes conflicting entries!
     - Saves "app|le" removes "app|lication" (same prefix)
     - Saves "app|le" removes "appl|y" (prefix starts with "app")
  
  Storage Types:
  • 'local' - Per-domain localStorage (each website has its own)
  • 'shared' - chrome.storage (shared across all pages in Chrome extension)
  • 'both' - Both storages (default)
  
  On page load, both storages are loaded and merged (shared entries override local)
  Entries have highest priority (frequency 1000000)
  Changes are applied immediately to all live instances

🎯 COMPLETION METHODS:
  • amc.selectCompletion(completionOption)      - Select a specific completion
  • amc.acceptCurrentSuggestion()               - Accept the current suggestion
  • amc.handleTabOrEnter()                      - Handle Tab/Enter key
  • amc.handleArrowDown()                       - Navigate down in completions
  • amc.handleArrowUp()                         - Navigate up in completions

⚙️ CONFIGURATION:
  • amc.setMaxCompletions(number)               - Set max completions to show
  • amc.setTabBehavior('select-if-single')      - Set Tab behavior
  • amc.setTabSpacesCount(2)                    - Set spaces for Tab (if enabled)
  • amc.setMaxLines(1)                          - Set max lines (1 = single-line)

📝 COMPLETION FORMAT:
  Format: "prefix|completion" or "prefix|completion #frequency"
  Example: "hello|world" or "test|ing #100"
  
  Personal dictionary entries can override main dictionary entries.
  Higher frequency = higher priority in suggestions.

🔍 DEBUGGING:
  • window.trie                                 - Access the root Trie node
  • localStorage.getItem('personalDictionary') - View personal dictionary
  • amc.currentNode                            - Inspect current Trie node

💡 TIP: Type in an input field and press Tab to accept suggestions!
`);
  }
}

