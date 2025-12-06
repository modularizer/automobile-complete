import { Trie } from "./Trie";
import { TAB, BACKSPACE } from "./constants";

export interface CompletionOption {
  typedPrefix: string;
  remainingPrefix: string;
  completion: string;
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
  }
  private resetToRoot(){
      // @ts-ignore
      this.setCurrentNode(this._currentNode.root ?? this._currentNode);
  }
  private walkTo(s: string){
      this.setCurrentNode(this._currentNode!.walk_to(s))
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
    // console.log("[AutocompleteTextController] initializeTrie called");
    try {
    const t = Trie.fromWords(completionList);
      // console.log("[AutocompleteTextController] Trie created, root children:", Object.keys(t.children));
      
      // Load personal dictionary from localStorage and append with highest priority
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          const personalDictionary = window.localStorage.getItem('personalDictionary');
          if (personalDictionary && personalDictionary.trim().length > 0) {
            console.log("[AutocompleteTextController] Loading personal dictionary from localStorage, length:", personalDictionary.length);
            // Use a very high frequency (1000000) to ensure personal dictionary entries have highest priority
            // This will override any conflicting entries from the main completion list
            const personalDictLines = personalDictionary.split('\n')
              .map(line => line.trim())
              .filter(line => line.length > 0 && line.includes('|'));
            
            console.log("[AutocompleteTextController] Parsed", personalDictLines.length, "personal dictionary entries");
            
            for (const line of personalDictLines) {
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
              
              const [pre, ...postParts] = processedLine.split('|');
              const post = postParts.join('|').trimEnd();
              
              if (pre && post) {
                // Insert with high frequency - this will override any existing entries
                t.insert_pair(pre, post, freq);
                console.log("[AutocompleteTextController] Inserted personal dict entry:", pre, "|", post);
              }
            }
            console.log("[AutocompleteTextController] Personal dictionary loaded:", personalDictLines.length, "entries");
          } else {
            console.log("[AutocompleteTextController] No personal dictionary found in localStorage");
          }
        } catch (e) {
          console.warn("[AutocompleteTextController] Failed to load personal dictionary from localStorage:", e);
        }
      }
      
      this.setCurrentNode(t);
      // console.log("[AutocompleteTextController] Page load - Current node:", this._currentNode);
    this.notifyListeners();
    } catch (error) {
      console.error("[AutocompleteTextController] Error initializing trie:", error);
      throw error;
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

    const currentText = this.text;
    console.log("[AutocompleteTextController] handleTextChange - newText:", newText, "currentText:", currentText, "currentNode prefix:", this._currentNode?.prefix, "completion:", this._currentNode?.completion);
    
    // If text matches, we already handled it via key event - skip
    if (newText === currentText) {
      return;
    }
    
    // Otherwise, handle it (simple append/delete or complex edit)
    if (newText.startsWith(currentText) && newText.length > currentText.length) {
      // Simple append
      const toAppend = newText.slice(currentText.length);
      console.log("[AutocompleteTextController] Simple append, walking to:", toAppend);
      this.walkTo(toAppend);
      this._focusedIndex = null;
      console.log("[AutocompleteTextController] After walk - prefix:", this._currentNode?.prefix, "completion:", this._currentNode?.completion);
      this.notifyListeners();
    } else if (currentText.startsWith(newText) && newText.length < currentText.length) {
      // Simple delete
      this.walkTo(BACKSPACE.repeat(currentText.length - newText.length));
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

    // Walk from current node to append the remaining prefix and completion
    const textToAppend = completion.remainingPrefix + completion.completion;
    this.walkTo(textToAppend);
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
   * Adds one or more words to the personal dictionary in localStorage and to the active Trie node.
   * @param words - A string or array of strings in the format "prefix|completion" or "prefix|completion #freq"
   */
  saveWord(words: string | string[]): void {
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

    // Get existing personal dictionary
    let existingDict = '';
    try {
      const stored = window.localStorage.getItem('personalDictionary');
      if (stored) {
        existingDict = stored;
      }
    } catch (e) {
      console.warn("[AutocompleteTextController] Failed to read personal dictionary from localStorage:", e);
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

    // Filter out existing entries that start with any of the new prefixes
    // or whose prefix starts with any new prefix (e.g., "app" removes "appl|y")
    let filteredDict = '';
    if (existingDict) {
      const existingLines = existingDict.split('\n');
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
      
      filteredDict = filteredLines.join('\n');
    }

    // Update localStorage (filtered existing + new words)
    let updatedDict = '';
    if (filteredDict && filteredDict.trim()) {
      updatedDict = `${filteredDict}\n${newWords.join('\n')}`;
    } else {
      updatedDict = newWords.join('\n');
    }
    
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
      
      // Save to localStorage
      window.localStorage.setItem('personalDictionary', updatedDict);
      
      // Verify it was saved correctly
      const verifySaved = window.localStorage.getItem('personalDictionary');
      if (verifySaved !== updatedDict) {
        console.warn("[AutocompleteTextController] localStorage save verification failed");
      }
      
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
      
      console.log("[AutocompleteTextController] Saved", newWords.length, "word(s) to personal dictionary. Updated", controllerRegistry.size, "controller instance(s). Total entries:", updatedDict.split('\n').filter(l => l.trim() && l.includes('|')).length);
    } catch (e) {
      console.error("[AutocompleteTextController] Failed to save personal dictionary to localStorage:", e);
    }
  }

  /**
   * Overwrites the personal dictionary in both localStorage and the active Trie.
   * This will reinitialize the trie with the original completion list plus the new dictionary.
   * @param dictionary - A completion list string in the format "prefix|completion" (one per line)
   */
  saveDictionary(dictionary: string): void {
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
      
      // Save to localStorage
      window.localStorage.setItem('personalDictionary', dictionary);
      
      // Update ALL controller instances
      controllerRegistry.forEach(controller => {
        // Get the actual input value for each controller
        let textToRestoreForController = '';
        if (controller._inputRef?.current) {
          textToRestoreForController = controller._inputRef.current.value || '';
        }
        if (!textToRestoreForController) {
          textToRestoreForController = controller.text;
        }
        
        // Reinitialize the trie with original completion list + new dictionary
        controller.initializeTrie(controller._originalCompletionList);
        
        // Restore text position after reinitialization
        if (textToRestoreForController) {
          controller.resetToRoot();
          controller.walkTo(textToRestoreForController);
        } else {
          controller.resetToRoot();
        }
        
        controller.notifyListeners();
      });
      
      console.log("[AutocompleteTextController] Saved new personal dictionary to localStorage. Updated", controllerRegistry.size, "controller instance(s)");
    } catch (e) {
      console.error("[AutocompleteTextController] Failed to save dictionary:", e);
    }
  }

  /**
   * Removes a word from the personal dictionary.
   * The word parameter should not include the pipe - it will match against both prefix and completion.
   * @param word - A word to remove (matches prefix or completion in entries like "prefix|completion")
   */
  removeWord(word: string): void {
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

    try {
      // Get existing personal dictionary
      const stored = window.localStorage.getItem('personalDictionary');
      if (!stored || stored.trim().length === 0) {
        console.log("[AutocompleteTextController] Personal dictionary is empty, nothing to remove");
        return;
      }

      // Filter out lines that contain the word (in prefix or completion)
      const lines = stored.split('\n');
      const filteredLines = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.includes('|')) {
          return true; // Keep invalid lines (they'll be filtered elsewhere)
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

      // Update localStorage
      const updatedDict = filteredLines.join('\n');
      window.localStorage.setItem('personalDictionary', updatedDict);
      
      // Get the actual input value before reinitializing
      let textToRestore = '';
      if (this._inputRef?.current) {
        textToRestore = this._inputRef.current.value || '';
      }
      // Fallback to controller text if no input ref
      if (!textToRestore) {
        textToRestore = this.text;
      }
      
      // Update ALL controller instances
      controllerRegistry.forEach(controller => {
        // Get the actual input value for each controller
        let textToRestoreForController = '';
        if (controller._inputRef?.current) {
          textToRestoreForController = controller._inputRef.current.value || '';
        }
        if (!textToRestoreForController) {
          textToRestoreForController = controller.text;
        }
        
        // Reinitialize the trie to reflect the removal
        controller.initializeTrie(controller._originalCompletionList);
        
        // Restore text position after reinitialization
        if (textToRestoreForController) {
          controller.resetToRoot();
          controller.walkTo(textToRestoreForController);
        } else {
          controller.resetToRoot();
        }
        
        controller.notifyListeners();
      });
      
      const removedCount = lines.length - filteredLines.length;
      console.log("[AutocompleteTextController] Removed", removedCount, "word(s) from personal dictionary. Updated", controllerRegistry.size, "controller instance(s)");
    } catch (e) {
      console.error("[AutocompleteTextController] Failed to remove word from personal dictionary:", e);
    }
  }

  /**
   * Clears the personal dictionary from both localStorage and the active Trie.
   * This will reinitialize the trie with only the original completion list.
   */
  resetCompletions(): void {
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
      
      // Clear localStorage
      window.localStorage.removeItem('personalDictionary');
      
      // Update ALL controller instances
      controllerRegistry.forEach(controller => {
        // Get the actual input value for each controller
        let textToRestoreForController = '';
        if (controller._inputRef?.current) {
          textToRestoreForController = controller._inputRef.current.value || '';
        }
        if (!textToRestoreForController) {
          textToRestoreForController = controller.text;
        }
        
        // Reinitialize the trie with only the original completion list
        controller.initializeTrie(controller._originalCompletionList);
        
        // Restore text position after reinitialization
        if (textToRestoreForController) {
          controller.resetToRoot();
          controller.walkTo(textToRestoreForController);
        } else {
          controller.resetToRoot();
        }
        
        controller.notifyListeners();
      });
      
      console.log("[AutocompleteTextController] Cleared personal dictionary. Updated", controllerRegistry.size, "controller instance(s)");
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
  • amc.saveWord('prefix|completion')           - Add word(s) to personal dictionary
  • amc.saveWord(['word1|comp1', 'word2|comp2']) - Add multiple words at once
  • amc.saveDictionary('prefix1|comp1\\nprefix2|comp2') - Overwrite entire dictionary
  • amc.removeWord('word')                     - Remove word(s) from personal dictionary
  • amc.resetCompletions()                     - Clear entire personal dictionary
  
  ⚠️  IMPORTANT: saveWord() automatically removes conflicting entries!
     - Saves "app|le" removes "app|lication" (same prefix)
     - Saves "app|le" removes "appl|y" (prefix starts with "app")
  
  Personal dictionary is stored in localStorage as 'personalDictionary'
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

