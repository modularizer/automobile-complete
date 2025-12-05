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

export class AutocompleteTextController {
  private _currentNode: Trie | null = null;
  private _focusedIndex: number | null = null;
  private _inputRef: { current: any } | null = null;
  private _maxCompletions: number | undefined = undefined;
  private _tabBehavior: TabBehavior = "select-if-single";
  private _tabSpacesCount: number = 2;
  private _maxLines: number | null = null;

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
    
    console.log("[AutocompleteTextController] Constructor called, completionList length:", completionList.length);
    this.initializeTrie(completionList);
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
    console.log("[AutocompleteTextController] initializeTrie called");
    try {
    const t = Trie.fromWords(completionList);
      console.log("[AutocompleteTextController] Trie created, root children:", Object.keys(t.children));
      this.setCurrentNode(t);
      console.log("[AutocompleteTextController] Page load - Current node:", this._currentNode);
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
    
    // console.log("[AutocompleteTextController] Keystroke - Current node:", this._currentNode);
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
    
    // If text matches, we already handled it via key event - skip
    if (newText === currentText) {
      return;
    }
    
    // Otherwise, handle it (simple append/delete or complex edit)
    if (newText.startsWith(currentText) && newText.length > currentText.length) {
      // Simple append
      this.walkTo(newText.slice(currentText.length));
      this._focusedIndex = null;
      this.notifyListeners();
    } else if (currentText.startsWith(newText) && newText.length < currentText.length) {
      // Simple delete
      this.walkTo(BACKSPACE.repeat(currentText.length - newText.length));
      this._focusedIndex = null;
      this.notifyListeners();
    } else {
      // Complex edit - reset to root
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
}

