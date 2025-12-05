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

import { CoreTrie, CoreTrieConfig } from "./CoreTrie";
import { BACKSPACE, TAB } from "./constants";

export interface TrieConfig extends CoreTrieConfig {
  use_terminal_colors?: boolean;
  repr_terminal_colors?: boolean;
}

export class Trie extends CoreTrie {
  static default_settings: TrieConfig = {
    use_terminal_colors: true, // Enable ANSI color codes in output
    repr_terminal_colors: false, // Use colors in __repr__ (default: False)
    ...CoreTrie.default_settings,
  };

  constructor(options: {
    completion?: string;
    children?: { [key: string]: Trie };
    root?: Trie;
    parent?: Trie;
    prefix?: string;
    full_text?: string;
    esc?: boolean;
    [key: string]: any;
  } = {}) {
    const { ...config } = options;
    super({ ...options, ...Trie.default_settings, ...config });
  }

  get use_terminal_colors(): boolean {
    return this.config.use_terminal_colors ?? true;
  }

  get repr_terminal_colors(): boolean {
    return this.config.repr_terminal_colors ?? false;
  }

  as_string(full_text?: string, use_terminal_colors?: boolean): string {
    const ft: string = full_text ?? this.full_text;
    const u: boolean = use_terminal_colors ?? this.use_terminal_colors;
    const start2: string = u ? "\x1b[37m" : ""; // Color for completion text (white)
    const start: string = u ? "\x1b[90m" : ""; // Color for before-state text (dark gray)
    const c: string = this.completion.replace(/ /g, "█"); // Replace spaces with block character
    const end: string = u ? "\x1b[0m" : ""; // Reset color code

    // Clean full text: remove tabs and backspace sequences
    let cleaned_full_text = ft.replace(/\t/g, "");
    cleaned_full_text = cleaned_full_text.replace(new RegExp(`.?${BACKSPACE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"), ""); // Remove backspace sequences

    // Text before the current prefix (dimmed)
    const before_state: string =
      this.prefix && cleaned_full_text
        ? cleaned_full_text.slice(0, -this.prefix.length)
        : cleaned_full_text;
    const b: string = `${start}${before_state}${end}`;

    // Current prefix (may be highlighted if partially accepted)
    const p: string =
      cleaned_full_text && this.prefix
        ? cleaned_full_text.slice(-this.prefix.length)
        : this.prefix;
    const s: string = `${b}${p}│${start2}${c}${end}`; // Format: before|prefix│completion
    return s;
  }

  show(
    disappearing: boolean = false,
    full_text?: string,
    use_terminal_colors?: boolean
  ): string {
    const s: string = this.as_string(full_text, use_terminal_colors);
    // In React Native, we can't directly print - this would be handled by the UI
    // For now, just return the string
    return s;
  }

  sim(
    text: string,
    options?: {
      letter_by_letter?: boolean;
      disappearing?: boolean;
      letter_delay?: number;
      word_delay?: number;
      use_terminal_colors?: boolean;
    }
  ): Trie {
    const {
      letter_by_letter = true,
      disappearing = true,
      letter_delay = 0.15,
      word_delay = 0.1,
      use_terminal_colors,
    } = options ?? {};

    let t: Trie = this;
    if (letter_by_letter) {
      // Process text character by character with delays
      for (const ch of text) {
        t = t.walk_to(ch); // Navigate to next character
        t.show(disappearing, undefined, use_terminal_colors);
        // In React Native, delays would be handled by setTimeout or animation
        // This is a simplified version
        if (disappearing && letter_delay && (" \n".includes(ch))) {
          // Additional delay after spaces/newlines would go here
        }
      }
    } else {
      // Process entire text at once
      t = t.walk_to(text);
      t.show(disappearing, undefined, use_terminal_colors);
    }
    return t;
  }

  // TypeScript doesn't have __bool__ but we can use a method
  is_non_empty(): boolean {
    return !this.is_empty();
  }

  // Override walk_to to return Trie
  walk_to(
    v: string,
    options?: { handle_control_characters?: boolean }
  ): Trie {
    return super.walk_to(v, options) as Trie;
  }

  // Override child to return Trie
  child(
    text: string,
    completion: string = "",
    children?: { [key: string]: Trie }
  ): Trie {
    return super.child(text, completion, children) as Trie;
  }

  // Override clone to return Trie
  clone(full_text?: string, parent?: Trie): Trie {
    return super.clone(full_text, parent) as Trie;
  }

  // Override accept to return Trie
  accept(): Trie {
    return super.accept() as Trie;
  }

  // Enable dictionary-style access to navigate the trie
  get(key: string): Trie {
    return this.walk_to(key);
  }

  // Enable attribute-style access (TypeScript doesn't support __getattr__ like Python)
  // This would need to be handled differently in TypeScript

  static demo(options?: {
    letter_by_letter?: boolean;
    disappearing?: boolean;
    letter_delay?: number;
    word_delay?: number;
    use_terminal_colors?: boolean;
  }): Trie {
    const t: Trie = Trie.fromWords(`
        anim|als
        enor|mous
        for e|xample:
        gir|affes
        giraffes a|re super tall
        hip|po
        hippo|potamuses
        hippos a|re fat
        hippopotamuses a|re fat
            `);
    // Simulate typing with tab completions and backspace corrections
    t.sim(
      `Animals can be enormo${TAB}. For example: gira${TAB}${BACKSPACE}${BACKSPACE}es are super super tall and hippos are fat`,
      options
    );
    return t.root as Trie;
  }

  static fromWords(...lines: string[]): Trie {
    const inst = new Trie();
    inst.insert(...lines);
    return inst;
  }
}

