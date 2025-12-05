/**
 * Autocomplete trie implementation for interactive text completion.
 *
 * This module provides a trie-based autocomplete system that supports:
 * - Interactive text completion with prefix matching
 * - Control character handling (tab for completion, backspace for deletion)
 * - Real-time simulation of typing with autocomplete suggestions
 * - Case-insensitive matching
 * - Frequency-based word ranking
 *
 * The trie structure enables efficient prefix-based word lookup and completion,
 * with support for displaying completion suggestions in a user-friendly format.
 */

import { FINALE_PART, BACKSPACE, BACKSPACE2, TAB } from "./constants";

export interface CoreTrieConfig {
  case_insensitive?: boolean;
  cache_full_text?: boolean;
  handle_control_characters?: boolean;
  [key: string]: any;
}

export interface CoreTrieChildren {
  [key: string]: CoreTrie;
}

export class CoreTrie {
  children: CoreTrieChildren;
  completion: string;
  freq: number;
  index: number | null;
  counter: number;
  words: CoreTrie[];
  root: CoreTrie;
  parent: CoreTrie;
  prefix: string;
  config: CoreTrieConfig & { root: CoreTrie };
  full_text: string;
  esc: boolean;

  static default_settings: CoreTrieConfig = {
    case_insensitive: true, // Match characters case-insensitively
    cache_full_text: true, // Cache full text during navigation
    handle_control_characters: true, // Handle tab and backspace characters
  };

  static fromFile(src: string): CoreTrie {
    // In React Native, we'll need to handle file reading differently
    // For now, this is a placeholder - you'd use a file system library
    throw new Error("fromFile not implemented for React Native - use fromWords with string content");
  }

  static fromWords(
    ...lines: string[]
  ): CoreTrie {
    const inst = new CoreTrie();
    return inst.insert(...lines);
  }

  constructor(options: {
    completion?: string;
    children?: CoreTrieChildren;
    root?: CoreTrie;
    parent?: CoreTrie;
    prefix?: string;
    full_text?: string;
    esc?: boolean;
    [key: string]: any;
  } = {}) {
    const {
      completion = "",
      children,
      root,
      parent,
      prefix = "",
      full_text = "",
      esc = false,
      ...config
    } = options;

    if (children !== undefined && typeof children !== "object") {
      throw new TypeError("children must be an object");
    }

    this.children = children ?? {}; // Child nodes keyed by character
    this.completion = completion; // Completion suffix for this prefix
    this.freq = 1; // Frequency/weight of this completion
    this.index = null; // Unique index in wordlist (if this is a word node)

    const r = root ?? this; // Reference to root node
    this.root = r;
    this.parent = parent ?? r; // Parent node
    this.prefix = prefix; // Prefix string this node represents

    if (root !== undefined) {
      this.config = r.config;
      this.words = r.words;
      this.counter = r.counter;
    } else {
      // Merge default settings with provided config
      this.config = { root: r, ...CoreTrie.default_settings, ...config } as CoreTrieConfig & { root: CoreTrie };
      this.words = []; // List of all word nodes (only at root)
      this.counter = 0;
    }
    // Cache full text only if enabled in config
    this.full_text = full_text;
    this.esc = esc;
  }

  get cache_full_text(): boolean {
    return this.config.cache_full_text ?? true;
  }

  get case_insensitive(): boolean {
    return this.config.case_insensitive ?? true;
  }

  get handle_control_characters(): boolean {
    return this.config.handle_control_characters ?? true;
  }

  is_empty(): boolean {
    return !this.completion && Object.keys(this.children).length === 0;
  }

  child(
    text: string,
    completion: string = "",
    children?: CoreTrieChildren
  ): CoreTrie {
    return new CoreTrie({
      completion,
      children,
      parent: this,
      prefix: this.prefix + text,
      full_text: this.cache_full_text ? this.full_text + text : "",
      esc: this.esc,
      ...this.config,
    });
  }

  clone(full_text?: string, parent?: CoreTrie): CoreTrie {
    return new CoreTrie({
      completion: this.completion,
      children: this.children,
      parent: parent ?? this.parent,
      prefix: this.prefix,
      full_text: full_text ?? this.full_text,
      esc: this.esc,
      ...this.config,
    });
  }

  shift_tab(): CoreTrie {
    return this.walk_to("\t", { handle_control_characters: false });
  }

  walk_to(
    v: string,
    options?: { handle_control_characters?: boolean }
  ): CoreTrie {
    const handle_control_characters =
      options?.handle_control_characters ?? this.handle_control_characters;
    const ci = this.case_insensitive; // Case-insensitive flag
    let node: CoreTrie = this; // Current node (starts at self)
    let s: string = this.full_text; // Accumulated full text

    // convert \x7f to \b
    v = v.replace(BACKSPACE2, BACKSPACE);

    if (v.length > 0) {
      const o0 = v.charCodeAt(0);
      if (o0 !== TAB.charCodeAt(0) && o0 !== "\n".charCodeAt(0) && o0 !== BACKSPACE.charCodeAt(0) && 1 < o0 && o0 < 32) {
        // ignore all control characters like Ctrl+C, etc
        return this;
      }
    }

    for (let i = 0; i < v.length; i++) {
      const ch = v[i];
      const o = ch.charCodeAt(0);
      if (o === 0) {
        node.esc = !node.esc;
      }
      if (o !== TAB.charCodeAt(0) && o !== "\n".charCodeAt(0) && o !== BACKSPACE.charCodeAt(0) && o < 32) {
        // ignore all control characters like Ctrl+C, etc
        continue;
      }
      // Handle backspace character: delete last character and move to parent
      if (ch === BACKSPACE && !(ch in node.children)) {
        s = s.slice(0, -1); // Remove last character from full text
        const m = s.match(FINALE_PART);
        const prefix = m ? m[0] : "";
        const esc = node.esc;
        node = node.root.clone(s).walk_to(prefix);
        node.esc = esc;
      }
      // Handle tab character: accept completion and navigate to it
      else if (handle_control_characters && !node.esc && ch === TAB && node.completion) {
        const c: string = node.completion; // Get completion suffix
        s += c; // Add completion to full text
        // Recursively walk through the completion string
        node = node.walk_to(c, { handle_control_characters });
      }
      // Handle normal characters
      else {
        const k = ci ? ch.toLowerCase() : ch;
        s += ch; // Add character to full text
        if (node.completion && node.completion[0] === k) {
          const x = node.children[k];
          const nn = node.child(ch, node.completion.slice(1), x?.children);
          node = nn; // Move to child node
        } else {
          // Look up child node (case-insensitive if enabled)
          let nn = node.children[k];
          if (nn === undefined) {
            // Create new child node if it doesn't exist
            nn = node.child(ch);
          }
          node = nn; // Move to child node
        }
      }

      if ((ch === "\n" || ch === TAB) && node.esc) {
        node.esc = false;
      }

      // Reset to root if we hit an empty node and a reset character
      // (Reset characters are non-alphabetic, non-control characters like space, punctuation)
      if (node.is_empty() && this.is_reset_char(ch)) {
        node = node.root.clone(s, node);
      }
      // Update node's full text
    }
    node.full_text = s;
    return node;
  }

  is_alpha(ch: string): boolean {
    return /^[a-zA-Z']$/.test(ch);
  }

  is_control_character(ch: string): boolean {
    if (!this.handle_control_characters) {
      return false;
    }
    return ch === TAB || ch === BACKSPACE || ch === BACKSPACE2;
  }

  is_reset_char(ch: string): boolean {
    return !this.is_alpha(ch) && !this.is_control_character(ch);
  }

  insert(...texts: string[]): CoreTrie {
    const ci = this.case_insensitive;
    for (const text of texts) {
      const lines = text.split("\n");
      for (let line of lines) {
        line = line.trim();
        if (!line) {
          continue;
        }

        // Split frequency: "... #123"
        let freq = 1;
        if (line.includes(" #")) {
          const parts = line.split(" #");
          line = parts.slice(0, -1).join(" #");
          const freq_str = parts[parts.length - 1];
          freq = parseInt(freq_str, 10) || 1;
        }

        // Split prefix|completion
        if (!line.includes("|")) {
          continue;
        }
        const [pre, ...postParts] = line.split("|");
        const post = postParts.join("|").trimEnd(); // Trim trailing spaces from completion
        this.insert_pair(pre, post, freq);
      }
    }
    return this;
  }

  insert_pair(pre: string, post: string, freq: number = 1): void {
    let node: CoreTrie = this;
    const root = this.root;
    const ci = this.case_insensitive;

    for (const ch of pre) {
      // Use lowercase key for case-insensitive matching (same as walk_to)
      const k = ci ? ch.toLowerCase() : ch;
      if (k in node.children) {
        const child = node.children[k];
        node = child;
      } else {
        // very lightweight child creation
        const child = new CoreTrie({
          completion: "",
          children: {},
          root: root,
          parent: node,
          prefix: node.prefix + ch,
        });
        node.children[k] = child;
        node = child;
      }
    }
    node.completion = post;
    node.freq = freq;
    this.counter += 1;
    node.index = this.counter;
    this.words.push(node);
  }

  accept(): CoreTrie {
    return this.walk_to(this.completion);
  }

  disable(pre: string, post: string): void {
    // Navigate to the prefix node using walk_to
    let node = this.walk_to(pre);
    if (node === null || node === undefined) {
      return;
    }

    // Disable completion at the prefix node if it exists
    if (node.completion) {
      node.completion = "";
    }

    // Walk through the completion path and disable completions at each node
    for (const ch of post) {
      node = node.walk_to(ch);
      if (node === null || node === undefined) {
        break;
      }
      if (node.completion) {
        node.completion = "";
      }
    }
  }

  /**
   * Get all word completions available from this node.
   * Collects all words in the subtree starting from this node.
   * 
   * @param maxCompletions - Maximum number of completions to return. If provided, returns the most frequent ones.
   * @returns Array of objects with prefix and completion (postfix) strings, sorted by frequency (descending)
   */
  list_options(maxCompletions?: number): Array<{ prefix: string; completion: string; freq: number; index: number | null }> {
    const options: Array<{ prefix: string; completion: string; freq: number; index: number | null }> = [];
    
    // If this node has a completion, add it
    if (this.completion) {
      options.push({
        prefix: this.prefix,
        completion: this.completion,
        freq: this.freq,
        index: this.index,
      });
    }
    
    // Recursively collect from all children
    for (const child of Object.values(this.children)) {
      options.push(...child.list_options());
    }
    
    // Sort by frequency (descending), then by index (ascending) as tiebreaker
    options.sort((a, b) => {
      if (b.freq !== a.freq) {
        return b.freq - a.freq;
      }
      // If frequencies are equal, sort by index (lower index first)
      const aIndex = a.index ?? Infinity;
      const bIndex = b.index ?? Infinity;
      return aIndex - bIndex;
    });
    
    // Limit to maxCompletions if provided
    if (maxCompletions !== undefined && maxCompletions > 0) {
      return options.slice(0, maxCompletions);
    }
    
    return options;
  }

  /**
   * Get completion options formatted for display with highlighting information.
   * Splits each option into typedPrefix (matching current node prefix), remainingPrefix, and completion.
   * 
   * @param maxCompletions - Maximum number of completions to return. If provided, returns the most frequent ones.
   * @returns Array of objects with typedPrefix, remainingPrefix, and completion strings
   */
  completionOptions(maxCompletions?: number): Array<{ typedPrefix: string; remainingPrefix: string; completion: string }> {
    const currentNodePrefix = this.prefix.toLowerCase();
    const options = this.list_options(maxCompletions);
    
    return options.map((opt) => {
      // Extract just the fields we need (ignore index for display)
      const fullPrefix = opt.prefix;
      const prefixLower = fullPrefix.toLowerCase();
      
      // Find how much of the prefix matches the current node's prefix
      let matchedLength = 0;
      for (let i = 0; i < Math.min(currentNodePrefix.length, prefixLower.length); i++) {
        if (currentNodePrefix[i] === prefixLower[i]) {
          matchedLength++;
        } else {
          break;
        }
      }
      
      return {
        typedPrefix: fullPrefix.substring(0, matchedLength), // Part matching current node prefix (black with highlight)
        remainingPrefix: fullPrefix.substring(matchedLength), // Rest of prefix (black, no highlight)
        completion: opt.completion, // Completion (grey)
      };
    });
  }

  /**
   * Select a completion option and navigate to the resulting node.
   * 
   * @param completion - Completion option with typedPrefix, remainingPrefix, and completion
   * @returns The node reached after selecting the completion
   */
  selectCompletion(completion: { typedPrefix: string; remainingPrefix: string; completion: string }): CoreTrie {
    const fullWord = completion.typedPrefix + completion.remainingPrefix + completion.completion;
    return this.root.walk_to(fullWord);
  }
}

