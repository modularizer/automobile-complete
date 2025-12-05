import { Trie } from "./Trie";
import { TAB } from "./constants";

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
}

export class AutocompleteTextController {
  private _text: string = "";
  private _suggestion: string = "";
  private _trieRoot: Trie | null = null;
  private _currentNode: Trie | null = null;
  private _focusedIndex: number | null = null;
  private _inputRef: { current: any } | null = null;
  private _maxCompletions: number | undefined = undefined;
  private _tabBehavior: TabBehavior = "select-if-single";
  private _tabSpacesCount: number = 2;

  private listeners: Set<() => void> = new Set();

  constructor(completionList: string, options?: AutocompleteTextControllerOptions) {
    if (options) {
      this._maxCompletions = options.maxCompletions;
      this._tabBehavior = options.tabBehavior || "select-if-single";
      this._tabSpacesCount = options.tabSpacesCount || 2;
    } else {
      this._tabBehavior = "select-if-single";
      this._tabSpacesCount = 2;
    }
    
    console.log("[AutocompleteTextController] Constructor called, completionList length:", completionList.length);
    this.initializeTrie(completionList);
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
      this._trieRoot = t;
      this._currentNode = t;
      this._text = "";
      console.log("[AutocompleteTextController] Page load - Current node:", {
        prefix: this._currentNode.prefix,
        completion: this._currentNode.completion,
        full_text: this._currentNode.full_text,
        freq: this._currentNode.freq,
        children: Object.keys(this._currentNode.children),
        childrenCount: Object.keys(this._currentNode.children).length,
        wordsCount: this._currentNode.words?.length || 0,
        node: this._currentNode,
      });
      this.updateSuggestion();
      this.notifyListeners();
    } catch (error) {
      console.error("[AutocompleteTextController] Error initializing trie:", error);
      throw error;
    }
  }

  private updateSuggestion() {
    if (!this._trieRoot) return;

    // Walk through the trie with current text from root
    const node = this._trieRoot.walk_to(this._text);
    this._currentNode = node;
    this._suggestion = node.completion || "";
    // Reset focused index when text changes
    this._focusedIndex = null;
    
    console.log("[AutocompleteTextController] Keystroke - Current node:", {
      text: this._text,
      prefix: node.prefix,
      completion: node.completion,
      full_text: node.full_text,
      freq: node.freq,
      children: Object.keys(node.children),
      childrenCount: Object.keys(node.children).length,
      suggestion: this._suggestion,
      availableCompletions: this.availableCompletions.length,
      node: node,
    });
  }

  get text(): string {
    return this._text;
  }

  get suggestion(): string {
    return this._suggestion;
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
    if (this._suggestion) {
      const matchingIndex = completions.findIndex(
        (opt) => opt.completion === this._suggestion
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

  setInputRef(ref: { current: any }) {
    this._inputRef = ref;
  }

  handleTextChange(newText: string) {
    console.log("[AutocompleteTextController] handleTextChange called with:", newText);
    this._text = newText;
    this.updateSuggestion();
    this.notifyListeners();
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

    const node = this._currentNode.selectCompletion(completion);
    this._text = node.full_text;
    this._currentNode = node;
    this._suggestion = node.completion || "";
    this._focusedIndex = null;
    this.notifyListeners();

    // Refocus the input
    if (this._inputRef?.current) {
      this._inputRef.current.focus();
    }
  }

  acceptCurrentSuggestion() {
    if (!this._suggestion || !this._currentNode) return;

    const node = this._currentNode.walk_to(TAB);
    this._text = node.full_text;
    this._currentNode = node;
    this._suggestion = node.completion || "";
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
    if (!this._suggestion) {
      switch (this._tabBehavior) {
        case "insert-tab":
          this._text += TAB;
          this.updateSuggestion();
          this.notifyListeners();
          return;

        case "insert-spaces":
          this._text += " ".repeat(this._tabSpacesCount);
          this.updateSuggestion();
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
    if (this._suggestion) {
      this.acceptCurrentSuggestion();
      return;
    }

    // If we have completions and behavior allows, select the best one
    if (completions.length > 0 && (this._tabBehavior === "select-best" || this._tabBehavior === "select-if-single")) {
      this.selectCompletion(completions[0]);
    }
  }

  handleKeyPress(e: any) {
    const key = e.nativeEvent.key;

    // Handle arrow keys for navigation
    if (key === "ArrowDown") {
      e.preventDefault();
      this.handleArrowDown();
      return;
    }

    if (key === "ArrowUp") {
      e.preventDefault();
      this.handleArrowUp();
      return;
    }

    // Handle Tab key to accept completion or focused option
    if (key === "Tab") {
      e.preventDefault();
      this.handleTabOrEnter();
    }
  }
}

