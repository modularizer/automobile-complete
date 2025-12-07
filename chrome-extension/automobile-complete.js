"use strict";
var AutomobileComplete = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => {
    __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
    return value;
  };

  // src/engine/browser.ts
  var browser_exports = {};
  __export(browser_exports, {
    AutocompleteTextController: () => AutocompleteTextController,
    attachAutocomplete: () => attachAutocomplete
  });

  // src/engine/constants.ts
  var TAB = "	";
  var BACKSPACE = "\b";
  var BACKSPACE2 = "\x7F";
  var FINALE_PART = /[A-Za-z0-9']+$/;

  // src/engine/CoreTrie.ts
  var _CoreTrie = class _CoreTrie {
    constructor(options = {}) {
      __publicField(this, "children");
      __publicField(this, "completion");
      __publicField(this, "freq");
      __publicField(this, "index");
      __publicField(this, "counter");
      __publicField(this, "words");
      __publicField(this, "root");
      __publicField(this, "parent");
      __publicField(this, "prefix");
      __publicField(this, "config");
      __publicField(this, "full_text");
      __publicField(this, "esc");
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
      if (children !== void 0 && typeof children !== "object") {
        throw new TypeError("children must be an object");
      }
      this.children = children ?? {};
      this.completion = completion;
      this.freq = 1;
      this.index = null;
      const r = root ?? this;
      this.root = r;
      this.parent = parent ?? r;
      this.prefix = prefix;
      if (root !== void 0) {
        this.config = r.config;
        this.words = r.words;
        this.counter = r.counter;
      } else {
        this.config = { root: r, ..._CoreTrie.default_settings, ...config };
        this.words = [];
        this.counter = 0;
      }
      this.full_text = full_text;
      this.esc = esc;
    }
    static fromFile(src) {
      throw new Error("fromFile not implemented for React Native - use fromWords with string content");
    }
    static fromWords(...lines) {
      const inst = new _CoreTrie();
      return inst.insert(...lines);
    }
    get cache_full_text() {
      return this.config.cache_full_text ?? true;
    }
    get case_insensitive() {
      return this.config.case_insensitive ?? true;
    }
    get handle_control_characters() {
      return this.config.handle_control_characters ?? true;
    }
    is_empty() {
      return !this.completion && Object.keys(this.children).length === 0;
    }
    child(text, completion = "", children) {
      return new _CoreTrie({
        completion,
        children,
        parent: this,
        prefix: this.prefix + text,
        full_text: this.cache_full_text ? this.full_text + text : "",
        esc: this.esc,
        ...this.config
      });
    }
    clone(full_text, parent) {
      return new _CoreTrie({
        completion: this.completion,
        children: this.children,
        parent: parent ?? this.parent,
        prefix: this.prefix,
        full_text: full_text ?? this.full_text,
        esc: this.esc,
        ...this.config
      });
    }
    shift_tab() {
      return this.walk_to("	", { handle_control_characters: false });
    }
    walk_to(v, options) {
      const handle_control_characters = options?.handle_control_characters ?? this.handle_control_characters;
      const ci = this.case_insensitive;
      let node = this;
      let s = this.full_text;
      v = v.replace(BACKSPACE2, BACKSPACE);
      if (v.length > 0) {
        const o0 = v.charCodeAt(0);
        if (o0 !== TAB.charCodeAt(0) && o0 !== "\n".charCodeAt(0) && o0 !== BACKSPACE.charCodeAt(0) && 1 < o0 && o0 < 32) {
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
          continue;
        }
        if (ch === BACKSPACE && !(ch in node.children)) {
          if (s.length > 0) {
            s = s.slice(0, -1);
            const m = s.match(FINALE_PART);
            const prefix = m ? m[0] : "";
            const esc = node.esc;
            node = node.root.clone("");
            node = node.walk_to(prefix);
            node.esc = esc;
            s = node.full_text;
          }
        } else if (handle_control_characters && !node.esc && ch === TAB && node.completion) {
          const c = node.completion;
          s += c;
          node = node.walk_to(c, { handle_control_characters });
        } else {
          const k = ci ? ch.toLowerCase() : ch;
          s += ch;
          if (node.completion && node.completion[0] === k) {
            const x = node.children[k];
            const nn = node.child(ch, node.completion.slice(1), x?.children);
            node = nn;
          } else {
            let nn = node.children[k];
            if (nn === void 0) {
              nn = node.child(ch);
            }
            node = nn;
          }
        }
        if ((ch === "\n" || ch === TAB) && node.esc) {
          node.esc = false;
        }
        if (node.is_empty() && this.is_reset_char(ch)) {
          node = node.root.clone(s, node);
        }
      }
      node.full_text = s;
      return node;
    }
    is_alpha(ch) {
      return /^[a-zA-Z']$/.test(ch);
    }
    is_control_character(ch) {
      if (!this.handle_control_characters) {
        return false;
      }
      return ch === TAB || ch === BACKSPACE || ch === BACKSPACE2;
    }
    is_reset_char(ch) {
      return !this.is_alpha(ch) && !this.is_control_character(ch);
    }
    insert(...texts) {
      const ci = this.case_insensitive;
      for (const text of texts) {
        const lines = text.split("\n");
        for (let line of lines) {
          line = line.trim();
          if (!line) {
            continue;
          }
          let freq = 1;
          if (line.includes(" #")) {
            const parts = line.split(" #");
            line = parts.slice(0, -1).join(" #");
            const freq_str = parts[parts.length - 1];
            freq = parseInt(freq_str, 10) || 1;
          }
          if (line.includes("||")) {
            const splitIndex = line.indexOf("||");
            const pre = line.substring(0, splitIndex);
            const post = line.substring(splitIndex + 2);
            const backspaces = BACKSPACE.repeat(pre.length);
            this.insert_pair(pre, backspaces + post, freq);
          } else if (line.includes("|")) {
            const splitIndex = line.indexOf("|");
            const pre = line.substring(0, splitIndex);
            const post = line.substring(splitIndex + 1);
            this.insert_pair(pre, post, freq);
          }
        }
      }
      return this;
    }
    insert_pair(pre, post, freq = 1) {
      let node = this;
      const root = this.root;
      const T = _CoreTrie;
      for (const ch of pre) {
        if (ch in node.children) {
          const child = node.children[ch];
          node = child;
        } else {
          const child = new T({
            completion: "",
            children: {},
            root,
            parent: node,
            prefix: node.prefix + ch
          });
          node.children[ch] = child;
          node = child;
        }
      }
      node.completion = post;
      node.freq = freq;
      this.counter += 1;
      node.index = this.counter;
      this.words.push(node);
    }
    accept() {
      return this.walk_to(this.completion);
    }
    disable(pre, post) {
      let node = this.walk_to(pre);
      if (node === null || node === void 0) {
        return;
      }
      if (node.completion) {
        node.completion = "";
      }
      for (const ch of post) {
        node = node.walk_to(ch);
        if (node === null || node === void 0) {
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
    list_options(maxCompletions) {
      const options = [];
      if (this.completion) {
        options.push({
          prefix: this.prefix,
          completion: this.completion,
          freq: this.freq,
          index: this.index
        });
      }
      for (const child of Object.values(this.children)) {
        options.push(...child.list_options());
      }
      options.sort((a, b) => {
        if (b.freq !== a.freq) {
          return b.freq - a.freq;
        }
        const aIndex = a.index ?? Infinity;
        const bIndex = b.index ?? Infinity;
        return aIndex - bIndex;
      });
      if (maxCompletions !== void 0 && maxCompletions > 0) {
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
    completionOptions(maxCompletions) {
      const currentNodePrefix = this.prefix.toLowerCase();
      const options = this.list_options(maxCompletions);
      return options.map((opt) => {
        const fullPrefix = opt.prefix;
        const prefixLower = fullPrefix.toLowerCase();
        let completion = opt.completion;
        let backspaceCount = 0;
        const originalCompletion = completion;
        if (completion.startsWith(BACKSPACE)) {
          while (completion[backspaceCount] === BACKSPACE) {
            backspaceCount++;
          }
          completion = completion.substring(backspaceCount);
          return {
            typedPrefix: fullPrefix,
            // The entire prefix that will be replaced
            remainingPrefix: "",
            // No remaining prefix for full replacements
            completion,
            // The replacement text (backspaces removed for display)
            originalCompletion
            // Original with backspaces for actual insertion
          };
        }
        let matchedLength = 0;
        for (let i = 0; i < Math.min(currentNodePrefix.length, prefixLower.length); i++) {
          if (currentNodePrefix[i] === prefixLower[i]) {
            matchedLength++;
          } else {
            break;
          }
        }
        return {
          typedPrefix: fullPrefix.substring(0, matchedLength),
          // Part matching current node prefix (black with highlight)
          remainingPrefix: fullPrefix.substring(matchedLength),
          // Rest of prefix (black, no highlight)
          completion,
          // Completion (grey)
          originalCompletion
          // Same as completion for normal completions
        };
      });
    }
    /**
     * Select a completion option and navigate to the resulting node.
     * 
     * @param completion - Completion option with typedPrefix, remainingPrefix, and completion
     * @returns The node reached after selecting the completion
     */
    selectCompletion(completion) {
      const fullWord = completion.typedPrefix + completion.remainingPrefix + completion.completion;
      return this.root.walk_to(fullWord);
    }
  };
  __publicField(_CoreTrie, "default_settings", {
    case_insensitive: true,
    // Match characters case-insensitively
    cache_full_text: true,
    // Cache full text during navigation
    handle_control_characters: true
    // Handle tab and backspace characters
  });
  var CoreTrie = _CoreTrie;

  // src/engine/Trie.ts
  var _Trie = class _Trie extends CoreTrie {
    constructor(options = {}) {
      const { ...config } = options;
      super({ ...options, ..._Trie.default_settings, ...config });
    }
    get use_terminal_colors() {
      return this.config.use_terminal_colors ?? true;
    }
    get repr_terminal_colors() {
      return this.config.repr_terminal_colors ?? false;
    }
    as_string(full_text, use_terminal_colors) {
      const ft = full_text ?? this.full_text;
      const u = use_terminal_colors ?? this.use_terminal_colors;
      const start2 = u ? "\x1B[37m" : "";
      const start = u ? "\x1B[90m" : "";
      const c = this.completion.replace(/ /g, "\u2588");
      const end = u ? "\x1B[0m" : "";
      let cleaned_full_text = ft.replace(/\t/g, "");
      cleaned_full_text = cleaned_full_text.replace(new RegExp(`.?${BACKSPACE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "g"), "");
      const before_state = this.prefix && cleaned_full_text ? cleaned_full_text.slice(0, -this.prefix.length) : cleaned_full_text;
      const b = `${start}${before_state}${end}`;
      const p = cleaned_full_text && this.prefix ? cleaned_full_text.slice(-this.prefix.length) : this.prefix;
      const s = `${b}${p}\u2502${start2}${c}${end}`;
      return s;
    }
    show(disappearing = false, full_text, use_terminal_colors) {
      const s = this.as_string(full_text, use_terminal_colors);
      return s;
    }
    sim(text, options) {
      const {
        letter_by_letter = true,
        disappearing = true,
        letter_delay = 0.15,
        word_delay = 0.1,
        use_terminal_colors
      } = options ?? {};
      let t = this;
      if (letter_by_letter) {
        for (const ch of text) {
          t = t.walk_to(ch);
          t.show(disappearing, void 0, use_terminal_colors);
          if (disappearing && letter_delay && " \n".includes(ch)) {
          }
        }
      } else {
        t = t.walk_to(text);
        t.show(disappearing, void 0, use_terminal_colors);
      }
      return t;
    }
    // TypeScript doesn't have __bool__ but we can use a method
    is_non_empty() {
      return !this.is_empty();
    }
    // Override walk_to to return Trie
    walk_to(v, options) {
      return super.walk_to(v, options);
    }
    // Override child to return Trie
    child(text, completion = "", children) {
      return super.child(text, completion, children);
    }
    // Override clone to return Trie
    clone(full_text, parent) {
      return super.clone(full_text, parent);
    }
    // Override accept to return Trie
    accept() {
      return super.accept();
    }
    // Enable dictionary-style access to navigate the trie
    get(key) {
      return this.walk_to(key);
    }
    // Enable attribute-style access (TypeScript doesn't support __getattr__ like Python)
    // This would need to be handled differently in TypeScript
    static demo(options) {
      const t = _Trie.fromWords(`
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
      t.sim(
        `Animals can be enormo${TAB}. For example: gira${TAB}${BACKSPACE}${BACKSPACE}es are super super tall and hippos are fat`,
        options
      );
      return t.root;
    }
    static fromWords(...lines) {
      const inst = new _Trie();
      inst.insert(...lines);
      return inst;
    }
  };
  __publicField(_Trie, "default_settings", {
    use_terminal_colors: true,
    // Enable ANSI color codes in output
    repr_terminal_colors: false,
    // Use colors in __repr__ (default: False)
    ...CoreTrie.default_settings
  });
  var Trie = _Trie;

  // src/engine/AutocompleteTextController.ts
  var controllerRegistry = /* @__PURE__ */ new Set();
  function isChromeExtension() {
    return typeof chrome !== "undefined" && chrome !== null && typeof chrome.storage !== "undefined" && typeof chrome.storage.local !== "undefined";
  }
  async function getChromeStorage(key) {
    if (!isChromeExtension() || !chrome)
      return null;
    try {
      const result = await chrome.storage.local.get([key]);
      return result[key] || null;
    } catch (e) {
      console.warn("[AutocompleteTextController] Failed to read from chrome.storage:", e);
      return null;
    }
  }
  async function setChromeStorage(key, value) {
    if (!isChromeExtension() || !chrome)
      return;
    try {
      await chrome.storage.local.set({ [key]: value });
    } catch (e) {
      console.warn("[AutocompleteTextController] Failed to write to chrome.storage:", e);
    }
  }
  async function removeChromeStorage(key) {
    if (!isChromeExtension() || !chrome)
      return;
    try {
      await chrome.storage.local.remove([key]);
    } catch (e) {
      console.warn("[AutocompleteTextController] Failed to remove from chrome.storage:", e);
    }
  }
  var AutocompleteTextController = class _AutocompleteTextController {
    constructor(completionList, options) {
      __publicField(this, "_currentNode", null);
      __publicField(this, "_focusedIndex", null);
      __publicField(this, "_inputRef", null);
      __publicField(this, "_maxCompletions");
      __publicField(this, "_tabBehavior", "select-if-single");
      __publicField(this, "_tabSpacesCount", 2);
      __publicField(this, "_maxLines", null);
      __publicField(this, "_originalCompletionList", "");
      __publicField(this, "listeners", /* @__PURE__ */ new Set());
      if (options) {
        this._maxCompletions = options.maxCompletions;
        this._tabBehavior = options.tabBehavior || "select-if-single";
        this._tabSpacesCount = options.tabSpacesCount || 2;
        this._maxLines = options.maxLines !== void 0 ? options.maxLines : null;
      } else {
        this._tabBehavior = "select-if-single";
        this._tabSpacesCount = 2;
        this._maxLines = null;
      }
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
      this._originalCompletionList = completionList;
      this.initializeTrie(completionList);
      controllerRegistry.add(this);
      console.log("[AutocompleteTextController] Registered controller. Total controllers:", controllerRegistry.size);
    }
    setCurrentNode(currentNode) {
      this._currentNode = currentNode;
      if (typeof window !== "undefined") {
        window.trie = currentNode;
      }
      if (currentNode) {
        const prefix = currentNode.prefix || "";
        const completion = currentNode.completion || "";
        console.info(`[AutocompleteTextController] currentNode.prefix: "${prefix}" | currentNode.completion: "${completion}"`);
      } else {
        console.info("[AutocompleteTextController] currentNode is null");
      }
    }
    resetToRoot() {
      this.setCurrentNode(this._currentNode.root ?? this._currentNode);
    }
    walkTo(s, options) {
      this.setCurrentNode(this._currentNode.walk_to(s, options));
    }
    notifyListeners() {
      this.listeners.forEach((listener) => listener());
    }
    subscribe(listener) {
      this.listeners.add(listener);
      return () => {
        this.listeners.delete(listener);
      };
    }
    initializeTrie(completionList) {
      console.log("[AutocompleteTextController] initializeTrie called with completion list length:", completionList.length);
      console.log("[AutocompleteTextController] First 200 chars of completion list:", completionList.substring(0, 200));
      try {
        const t = Trie.fromWords(completionList);
        console.log("[AutocompleteTextController] Trie created, root children count:", Object.keys(t.children || {}).length);
        console.log("[AutocompleteTextController] Sample root children:", Object.keys(t.children || {}).slice(0, 10));
        const allDictLines = [];
        if (typeof window !== "undefined" && window.localStorage) {
          try {
            const localDict = window.localStorage.getItem("personalDictionary");
            if (localDict && localDict.trim().length > 0) {
              console.log("[AutocompleteTextController] Loading personal dictionary from localStorage, length:", localDict.length);
              const lines = localDict.split("\n").map((line) => line.trim()).filter((line) => line.length > 0 && line.includes("|"));
              allDictLines.push(...lines);
              console.log("[AutocompleteTextController] Loaded", lines.length, "entries from localStorage");
            }
          } catch (e) {
            console.warn("[AutocompleteTextController] Failed to load personal dictionary from localStorage:", e);
          }
        }
        if (isChromeExtension()) {
          try {
            getChromeStorage("personalDictionary").then((sharedDict) => {
              if (sharedDict && sharedDict.trim().length > 0) {
                console.log("[AutocompleteTextController] Loading personal dictionary from chrome.storage (async), length:", sharedDict.length);
                this.loadAndMergePersonalDictionary(t, sharedDict, allDictLines);
              }
            }).catch((e) => {
              console.warn("[AutocompleteTextController] Failed to load personal dictionary from chrome.storage:", e);
            });
          } catch (e) {
            console.warn("[AutocompleteTextController] Failed to access chrome.storage:", e);
          }
        }
        this.insertPersonalDictionaryEntries(t, allDictLines);
        if (allDictLines.length > 0) {
          console.log("[AutocompleteTextController] Personal dictionary loaded:", allDictLines.length, "entries from localStorage");
        }
        this.setCurrentNode(t);
        this.notifyListeners();
      } catch (error) {
        console.error("[AutocompleteTextController] Error initializing trie:", error);
        throw error;
      }
    }
    loadAndMergePersonalDictionary(t, sharedDict, existingLines) {
      const sharedLines = sharedDict.split("\n").map((line) => line.trim()).filter((line) => line.length > 0 && line.includes("|"));
      const dictMap = /* @__PURE__ */ new Map();
      for (const line of existingLines) {
        const lineWithoutFreq = line.split(" #")[0];
        const [pre] = lineWithoutFreq.split("|");
        if (pre) {
          dictMap.set(pre.trim().toLowerCase(), line);
        }
      }
      for (const line of sharedLines) {
        const lineWithoutFreq = line.split(" #")[0];
        const [pre] = lineWithoutFreq.split("|");
        if (pre) {
          dictMap.set(pre.trim().toLowerCase(), line);
        }
      }
      const mergedLines = Array.from(dictMap.values());
      console.log("[AutocompleteTextController] Merged", mergedLines.length, "unique personal dictionary entries (local + shared)");
      this.insertPersonalDictionaryEntries(t, mergedLines);
      if (this._currentNode?.root === t || this._currentNode === t) {
        this.setCurrentNode(t);
        this.notifyListeners();
      }
    }
    reinitializeAllControllers(textToRestore) {
      console.log("[AutocompleteTextController] Updating", controllerRegistry.size, "controller instance(s)");
      let updateCount = 0;
      controllerRegistry.forEach((controller) => {
        updateCount++;
        console.log("[AutocompleteTextController] Updating controller", updateCount, "of", controllerRegistry.size);
        let textToRestoreForController = "";
        if (controller._inputRef?.current) {
          textToRestoreForController = controller._inputRef.current.value || "";
        }
        if (!textToRestoreForController) {
          textToRestoreForController = controller.text;
        }
        controller.initializeTrie(controller._originalCompletionList);
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
    insertPersonalDictionaryEntries(t, lines) {
      for (const line of lines) {
        let freq = 1e6;
        let processedLine = line;
        if (line.includes(" #")) {
          const parts = line.split(" #");
          processedLine = parts.slice(0, -1).join(" #");
          const existingFreq = parseInt(parts[parts.length - 1], 10);
          if (!isNaN(existingFreq) && existingFreq > freq) {
            freq = existingFreq;
          }
        }
        if (processedLine.includes("||")) {
          const [pre, ...postParts] = processedLine.split("||");
          let post = postParts.join("||").trimEnd();
          const backspaces = BACKSPACE.repeat(pre.length);
          post = backspaces + post;
          if (pre && post) {
            t.insert_pair(pre, post, freq);
            console.log("[AutocompleteTextController] Inserted personal dict entry (full replacement):", pre, "||", postParts.join("||"));
          }
        } else if (processedLine.includes("|")) {
          const [pre, ...postParts] = processedLine.split("|");
          const post = postParts.join("|").trimEnd();
          if (pre && post) {
            t.insert_pair(pre, post, freq);
            console.log("[AutocompleteTextController] Inserted personal dict entry:", pre, "|", post);
          }
        }
      }
    }
    updateSuggestion(newText) {
      if (!this._currentNode)
        return;
      this.resetToRoot();
      this.walkTo(newText);
      this._focusedIndex = null;
    }
    get text() {
      return this._currentNode?.full_text || "";
    }
    get suggestion() {
      return this._currentNode?.completion || "";
    }
    get currentNode() {
      return this._currentNode;
    }
    get focusedIndex() {
      return this._focusedIndex;
    }
    get availableCompletions() {
      return this._currentNode ? this._currentNode.completionOptions(this._maxCompletions) : [];
    }
    /**
     * Get the original completion list used to create this controller
     */
    get originalCompletionList() {
      return this._originalCompletionList;
    }
    /**
     * Get the current options for this controller
     */
    getOptions() {
      return {
        maxCompletions: this._maxCompletions,
        tabBehavior: this._tabBehavior,
        tabSpacesCount: this._tabSpacesCount,
        maxLines: this._maxLines
      };
    }
    /**
     * Create a new controller instance with the same completion list and options
     * Each element should have its own controller instance to avoid shared state
     */
    clone() {
      return new _AutocompleteTextController(this._originalCompletionList, this.getOptions());
    }
    get tabSelectableIndex() {
      const completions = this.availableCompletions;
      if (this._focusedIndex !== null && completions[this._focusedIndex]) {
        return this._focusedIndex;
      }
      const suggestion = this.suggestion;
      if (suggestion) {
        const matchingIndex = completions.findIndex(
          (opt) => opt.completion === suggestion
        );
        if (matchingIndex !== -1) {
          return matchingIndex;
        }
      }
      if (this._tabBehavior === "select-best") {
        return completions.length > 0 ? 0 : null;
      }
      if (this._tabBehavior === "select-if-single" && completions.length === 1) {
        return 0;
      }
      return null;
    }
    setMaxCompletions(maxCompletions) {
      this._maxCompletions = maxCompletions;
      this.notifyListeners();
    }
    setTabBehavior(behavior) {
      this._tabBehavior = behavior;
    }
    setTabSpacesCount(count) {
      this._tabSpacesCount = count;
    }
    get maxLines() {
      return this._maxLines;
    }
    setMaxLines(maxLines) {
      this._maxLines = maxLines;
      this.notifyListeners();
    }
    setInputRef(ref) {
      this._inputRef = ref;
    }
    handleTextChange(newText) {
      if (!this._currentNode) {
        this.updateSuggestion(newText);
        this.notifyListeners();
        return;
      }
      const currentPrefix = this._currentNode.prefix || "";
      console.log("[AutocompleteTextController] handleTextChange - newText:", newText, "currentPrefix:", currentPrefix, "currentNode prefix:", this._currentNode?.prefix, "completion:", this._currentNode?.completion);
      if (newText === currentPrefix) {
        return;
      }
      if (newText.startsWith(currentPrefix) && newText.length > currentPrefix.length) {
        const toAppend = newText.slice(currentPrefix.length);
        console.log("[AutocompleteTextController] Simple append, walking to:", toAppend);
        this.walkTo(toAppend);
        this._focusedIndex = null;
        console.log("[AutocompleteTextController] After walk - prefix:", this._currentNode?.prefix, "completion:", this._currentNode?.completion);
        this.notifyListeners();
      } else if (currentPrefix.startsWith(newText) && newText.length < currentPrefix.length) {
        this.walkTo(BACKSPACE.repeat(currentPrefix.length - newText.length));
        this._focusedIndex = null;
        this.notifyListeners();
      } else {
        console.log("[AutocompleteTextController] Complex edit, resetting to root and walking to:", newText);
        this.updateSuggestion(newText);
        this.notifyListeners();
      }
    }
    handleArrowDown() {
      const completions = this.availableCompletions;
      if (completions.length > 0) {
        this._focusedIndex = this._focusedIndex === null ? 0 : Math.min(this._focusedIndex + 1, completions.length - 1);
        this.notifyListeners();
      }
    }
    handleArrowUp() {
      const completions = this.availableCompletions;
      if (completions.length > 0) {
        this._focusedIndex = this._focusedIndex === null ? completions.length - 1 : Math.max(this._focusedIndex - 1, 0);
        this.notifyListeners();
      }
    }
    selectCompletion(completion) {
      if (!this._currentNode)
        return;
      const completionToUse = completion.originalCompletion ?? completion.completion;
      const textToAppend = completion.remainingPrefix + completionToUse;
      this.walkTo(textToAppend, { handle_control_characters: true });
      this._focusedIndex = null;
      this.notifyListeners();
      if (this._inputRef?.current) {
        this._inputRef.current.focus();
      }
    }
    acceptCurrentSuggestion() {
      if (!this.suggestion)
        return;
      this.walkTo(TAB);
      this._focusedIndex = null;
      this.notifyListeners();
      if (this._inputRef?.current) {
        this._inputRef.current.focus();
      }
    }
    handleTabOrEnter() {
      const completions = this.availableCompletions;
      if (this._focusedIndex !== null && completions[this._focusedIndex]) {
        this.selectCompletion(completions[this._focusedIndex]);
        return;
      }
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
            break;
          case "select-if-single":
            if (completions.length !== 1) {
              return;
            }
            break;
        }
      }
      if (this.suggestion) {
        this.acceptCurrentSuggestion();
        return;
      }
      if (completions.length > 0 && (this._tabBehavior === "select-best" || this._tabBehavior === "select-if-single")) {
        this.selectCompletion(completions[0]);
      }
    }
    handleKeyPress(e) {
      const key = e.nativeEvent?.key || e.key;
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
      if (key === "Tab") {
        e.preventDefault?.();
        this.handleTabOrEnter();
        return;
      }
      if (key === "Enter") {
        const isMultiline = this._maxLines === null || this._maxLines > 1;
        if (!isMultiline) {
          e.preventDefault?.();
          this.handleTabOrEnter();
        }
        return;
      }
    }
    /**
     * Adds one or more words to the personal dictionary and to the active Trie node.
     * @param words - A string or array of strings in the format "prefix|completion" or "prefix|completion #freq"
     * @param storage - Where to save: 'local' (per-domain localStorage), 'shared' (chrome.storage), or 'both' (default)
     */
    saveWord(words, storage = "both") {
      if (!this._currentNode) {
        console.warn("[AutocompleteTextController] Cannot save word: Trie not initialized");
        return;
      }
      if (typeof window === "undefined" || !window.localStorage) {
        console.warn("[AutocompleteTextController] Cannot save word: localStorage not available");
        return;
      }
      const wordArray = Array.isArray(words) ? words : [words];
      const personalDictFreq = 1e6;
      let existingLocalDict = "";
      let existingSharedDict = "";
      if (storage === "local" || storage === "both") {
        try {
          const stored = window.localStorage.getItem("personalDictionary");
          if (stored) {
            existingLocalDict = stored;
          }
        } catch (e) {
          console.warn("[AutocompleteTextController] Failed to read personal dictionary from localStorage:", e);
        }
      }
      if (storage === "shared" || storage === "both") {
        if (isChromeExtension()) {
        } else {
          console.warn("[AutocompleteTextController] Chrome extension not detected, cannot save to shared storage");
          if (storage === "shared") {
            return;
          }
        }
      }
      const newPrefixes = /* @__PURE__ */ new Set();
      const newWords = [];
      for (const word of wordArray) {
        const trimmed = word.trim();
        if (!trimmed || !trimmed.includes("|")) {
          console.warn("[AutocompleteTextController] Invalid word format (must contain '|'):", word);
          continue;
        }
        const lineWithoutFreq = trimmed.split(" #")[0];
        const [pre] = lineWithoutFreq.split("|");
        if (pre) {
          newPrefixes.add(pre.trim().toLowerCase());
        }
        let processedWord = trimmed;
        if (!trimmed.includes(" #")) {
          processedWord = `${trimmed} #${personalDictFreq}`;
        } else {
          const parts = trimmed.split(" #");
          const existingFreq = parseInt(parts[parts.length - 1], 10);
          if (isNaN(existingFreq) || existingFreq < personalDictFreq) {
            processedWord = `${parts.slice(0, -1).join(" #")} #${personalDictFreq}`;
          }
        }
        newWords.push(processedWord);
      }
      const filterConflicts = (dict) => {
        if (!dict)
          return "";
        const existingLines = dict.split("\n");
        const filteredLines = existingLines.filter((line) => {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.includes("|")) {
            return true;
          }
          const lineWithoutFreq = trimmed.split(" #")[0];
          const [pre] = lineWithoutFreq.split("|");
          const prefixLower = pre ? pre.trim().toLowerCase() : "";
          for (const newPrefix of newPrefixes) {
            if (prefixLower === newPrefix || prefixLower.startsWith(newPrefix)) {
              return false;
            }
          }
          return true;
        });
        return filteredLines.join("\n");
      };
      const filteredLocalDict = filterConflicts(existingLocalDict);
      const filteredSharedDict = storage === "shared" || storage === "both" ? "" : existingSharedDict;
      const updateDict = (filtered) => {
        if (filtered && filtered.trim()) {
          return `${filtered}
${newWords.join("\n")}`;
        } else {
          return newWords.join("\n");
        }
      };
      try {
        let textToRestore = "";
        if (this._inputRef?.current) {
          textToRestore = this._inputRef.current.value || "";
        }
        if (!textToRestore) {
          textToRestore = this.text;
        }
        if (storage === "local" || storage === "both") {
          const updatedLocalDict = updateDict(filteredLocalDict);
          window.localStorage.setItem("personalDictionary", updatedLocalDict);
          console.log("[AutocompleteTextController] Saved to localStorage");
        }
        if ((storage === "shared" || storage === "both") && isChromeExtension()) {
          getChromeStorage("personalDictionary").then((existingShared) => {
            const filteredShared = filterConflicts(existingShared || "");
            const updatedSharedDict = updateDict(filteredShared);
            return setChromeStorage("personalDictionary", updatedSharedDict);
          }).then(() => {
            console.log("[AutocompleteTextController] Saved to chrome.storage");
            this.reinitializeAllControllers(textToRestore);
          }).catch((e) => {
            console.error("[AutocompleteTextController] Failed to save to chrome.storage:", e);
            this.reinitializeAllControllers(textToRestore);
          });
        } else {
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
    saveDictionary(dictionary, storage = "both") {
      if (!this._currentNode) {
        console.warn("[AutocompleteTextController] Cannot save dictionary: Trie not initialized");
        return;
      }
      if (typeof window === "undefined" || !window.localStorage) {
        console.warn("[AutocompleteTextController] Cannot save dictionary: localStorage not available");
        return;
      }
      try {
        let textToRestore = "";
        if (this._inputRef?.current) {
          textToRestore = this._inputRef.current.value || "";
        }
        if (!textToRestore) {
          textToRestore = this.text;
        }
        if (storage === "local" || storage === "both") {
          window.localStorage.setItem("personalDictionary", dictionary);
          console.log("[AutocompleteTextController] Saved to localStorage");
        }
        if ((storage === "shared" || storage === "both") && isChromeExtension()) {
          setChromeStorage("personalDictionary", dictionary).then(() => {
            console.log("[AutocompleteTextController] Saved to chrome.storage");
            this.reinitializeAllControllers(textToRestore);
          }).catch((e) => {
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
    removeWord(word, storage = "both") {
      if (!this._currentNode) {
        console.warn("[AutocompleteTextController] Cannot remove word: Trie not initialized");
        return;
      }
      if (typeof window === "undefined" || !window.localStorage) {
        console.warn("[AutocompleteTextController] Cannot remove word: localStorage not available");
        return;
      }
      const trimmedWord = word.trim();
      if (!trimmedWord) {
        console.warn("[AutocompleteTextController] Cannot remove word: empty word provided");
        return;
      }
      const filterWord = (dict) => {
        if (!dict || dict.trim().length === 0) {
          return { filtered: "", removedCount: 0 };
        }
        const lines = dict.split("\n");
        const filteredLines = lines.filter((line) => {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.includes("|")) {
            return true;
          }
          const lineWithoutFreq = trimmed.split(" #")[0];
          const [pre, ...postParts] = lineWithoutFreq.split("|");
          const post = postParts.join("|").trim();
          const preLower = pre.toLowerCase();
          const postLower = post.toLowerCase();
          const wordLower = trimmedWord.toLowerCase();
          return preLower !== wordLower && postLower !== wordLower && !preLower.includes(wordLower) && !postLower.includes(wordLower);
        });
        return { filtered: filteredLines.join("\n"), removedCount: lines.length - filteredLines.length };
      };
      try {
        let textToRestore = "";
        if (this._inputRef?.current) {
          textToRestore = this._inputRef.current.value || "";
        }
        if (!textToRestore) {
          textToRestore = this.text;
        }
        let totalRemoved = 0;
        if (storage === "local" || storage === "both") {
          const stored = window.localStorage.getItem("personalDictionary") || "";
          const { filtered, removedCount } = filterWord(stored);
          window.localStorage.setItem("personalDictionary", filtered);
          totalRemoved += removedCount;
          console.log("[AutocompleteTextController] Removed", removedCount, "word(s) from localStorage");
        }
        if ((storage === "shared" || storage === "both") && isChromeExtension()) {
          getChromeStorage("personalDictionary").then((stored) => {
            const { filtered, removedCount } = filterWord(stored || "");
            totalRemoved += removedCount;
            return setChromeStorage("personalDictionary", filtered);
          }).then(() => {
            console.log("[AutocompleteTextController] Removed word(s) from chrome.storage");
            this.reinitializeAllControllers(textToRestore);
          }).catch((e) => {
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
    resetCompletions(storage = "both") {
      if (!this._currentNode) {
        console.warn("[AutocompleteTextController] Cannot reset completions: Trie not initialized");
        return;
      }
      if (typeof window === "undefined" || !window.localStorage) {
        console.warn("[AutocompleteTextController] Cannot reset completions: localStorage not available");
        return;
      }
      try {
        let textToRestore = "";
        if (this._inputRef?.current) {
          textToRestore = this._inputRef.current.value || "";
        }
        if (!textToRestore) {
          textToRestore = this.text;
        }
        if (storage === "local" || storage === "both") {
          window.localStorage.removeItem("personalDictionary");
          console.log("[AutocompleteTextController] Cleared localStorage");
        }
        if ((storage === "shared" || storage === "both") && isChromeExtension()) {
          removeChromeStorage("personalDictionary").then(() => {
            console.log("[AutocompleteTextController] Cleared chrome.storage");
            this.reinitializeAllControllers(textToRestore);
          }).catch((e) => {
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
    help() {
      console.log(`
\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557
\u2551          AutocompleteTextController - Usage Guide              \u2551
\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D

\u{1F4D6} PROPERTIES:
  \u2022 amc.text                    - Current text in the controller
  \u2022 amc.suggestion              - Current suggestion text
  \u2022 amc.currentNode            - Current Trie node
  \u2022 amc.focusedIndex           - Currently focused completion index
  \u2022 amc.availableCompletions   - Array of all available completions
  \u2022 amc.tabSelectableIndex     - Index that Tab would select
  \u2022 amc.maxLines               - Maximum lines allowed (null = unlimited)

\u{1F4BE} PERSONAL DICTIONARY:
  \u2022 amc.saveWord('prefix|completion')           - Add word(s) to personal dictionary (default: saves to both)
  \u2022 amc.saveWord('prefix|completion', 'local')  - Save only to per-domain localStorage
  \u2022 amc.saveWord('prefix|completion', 'shared') - Save only to shared chrome.storage (extension only)
  \u2022 amc.saveWord('prefix|completion', 'both')  - Save to both storages (default)
  \u2022 amc.saveDictionary(dict, storage?)         - Overwrite entire dictionary (storage: 'local'|'shared'|'both')
  \u2022 amc.removeWord('word', storage?)          - Remove word(s) (storage: 'local'|'shared'|'both')
  \u2022 amc.resetCompletions(storage?)            - Clear dictionary (storage: 'local'|'shared'|'both')
  
  \u26A0\uFE0F  IMPORTANT: saveWord() automatically removes conflicting entries!
     - Saves "app|le" removes "app|lication" (same prefix)
     - Saves "app|le" removes "appl|y" (prefix starts with "app")
  
  Storage Types:
  \u2022 'local' - Per-domain localStorage (each website has its own)
  \u2022 'shared' - chrome.storage (shared across all pages in Chrome extension)
  \u2022 'both' - Both storages (default)
  
  On page load, both storages are loaded and merged (shared entries override local)
  Entries have highest priority (frequency 1000000)
  Changes are applied immediately to all live instances

\u{1F3AF} COMPLETION METHODS:
  \u2022 amc.selectCompletion(completionOption)      - Select a specific completion
  \u2022 amc.acceptCurrentSuggestion()               - Accept the current suggestion
  \u2022 amc.handleTabOrEnter()                      - Handle Tab/Enter key
  \u2022 amc.handleArrowDown()                       - Navigate down in completions
  \u2022 amc.handleArrowUp()                         - Navigate up in completions

\u2699\uFE0F CONFIGURATION:
  \u2022 amc.setMaxCompletions(number)               - Set max completions to show
  \u2022 amc.setTabBehavior('select-if-single')      - Set Tab behavior
  \u2022 amc.setTabSpacesCount(2)                    - Set spaces for Tab (if enabled)
  \u2022 amc.setMaxLines(1)                          - Set max lines (1 = single-line)

\u{1F4DD} COMPLETION FORMAT:
  Format: "prefix|completion" or "prefix|completion #frequency"
  Example: "hello|world" or "test|ing #100"
  
  Personal dictionary entries can override main dictionary entries.
  Higher frequency = higher priority in suggestions.

\u{1F50D} DEBUGGING:
  \u2022 window.trie                                 - Access the root Trie node
  \u2022 localStorage.getItem('personalDictionary') - View personal dictionary
  \u2022 amc.currentNode                            - Inspect current Trie node

\u{1F4A1} TIP: Type in an input field and press Tab to accept suggestions!
`);
    }
  };

  // src/attachment/elementDetection.ts
  var globalInputTracker = {
    activeElement: null,
    elementTextMap: /* @__PURE__ */ new WeakMap(),
    isTracking: false
  };
  var autoAttachmentRegistry = [];
  var attachingElements = /* @__PURE__ */ new WeakSet();
  var processingSelectors = /* @__PURE__ */ new Set();
  var globalAttachedElements = /* @__PURE__ */ new WeakMap();
  var PLACEHOLDER_CLEANUP = () => {
    console.warn("[Automobile Complete] Placeholder cleanup called - this should not happen!");
  };
  function getElementInfo(element) {
    const tag = element.tagName.toLowerCase();
    const id = element.id ? `#${element.id}` : "";
    const classes = element.className ? `.${element.className.split(" ").join(".")}` : "";
    const type = element.type ? `[type="${element.type}"]` : "";
    const name = element.name ? `[name="${element.name}"]` : "";
    const contenteditable = element.contentEditable === "true" ? '[contenteditable="true"]' : "";
    return `${tag}${id}${classes}${type}${name}${contenteditable}`;
  }
  function getElementTextForTracking(element) {
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      return element.value || "";
    } else if (element.contentEditable === "true" || element.isContentEditable) {
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const commonAncestor = range.commonAncestorContainer;
        let node = commonAncestor;
        while (node && node !== element) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node;
            if (el.tagName === "P" || el.tagName === "DIV" || el.tagName === "SPAN") {
              return el.innerText || el.textContent || "";
            }
          }
          node = node.parentNode;
        }
      }
      return element.innerText || element.textContent || "";
    }
    return "";
  }
  function findActiveInputElement() {
    if (globalInputTracker.activeElement) {
      if (document.contains(globalInputTracker.activeElement)) {
        return globalInputTracker.activeElement;
      }
    }
    const activeEl = document.activeElement;
    if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.contentEditable === "true" || activeEl.isContentEditable)) {
      return activeEl;
    }
    return null;
  }
  function isContentEditable(element) {
    return element.contentEditable === "true" || element.getAttribute("contenteditable") === "true";
  }
  function findActualInputElement(element) {
    if (!isContentEditable(element)) {
      return element;
    }
    const activeInput = findActiveInputElement();
    if (activeInput && element.contains(activeInput)) {
      return activeInput;
    }
    if (document.activeElement === element) {
      return element;
    }
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const commonAncestor = range.commonAncestorContainer;
      if (element.contains(commonAncestor)) {
        let node = commonAncestor;
        while (node && node !== element) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node;
            if (el.tagName === "P" || el.tagName === "DIV" || el.tagName === "SPAN") {
              return el;
            }
          }
          node = node.parentNode;
        }
      }
    }
    const activeElement = document.activeElement;
    if (activeElement && element.contains(activeElement) && activeElement !== element) {
      if (activeElement instanceof HTMLElement) {
        if (activeElement.tagName === "P" || activeElement.tagName === "DIV" || activeElement.tagName === "SPAN") {
          return activeElement;
        }
      }
    }
    const firstP = element.querySelector("p");
    if (firstP) {
      return firstP;
    }
    return element;
  }
  function isElementHidden(element) {
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") {
      return true;
    }
    if (element.style.display === "none" || element.style.visibility === "hidden") {
      return true;
    }
    if (element.hasAttribute("data-fallback") || element.classList.contains("fallback")) {
      return true;
    }
    if (element.tagName === "TEXTAREA" && (element.classList.contains("fallback") || element.classList.contains("wcDTda_fallbackTextarea"))) {
      return true;
    }
    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      if (element.offsetParent === null) {
        if (style.display === "none") {
          return true;
        }
      }
    }
    return false;
  }
  function isElementAttached(el) {
    return el.hasAttribute("data-automobile-complete-attached") || el.parentElement?.classList.contains("autocomplete-wrapper") || false;
  }
  function startGlobalInputTracking() {
    if (globalInputTracker.isTracking) {
      return;
    }
    if (typeof document === "undefined") {
      return;
    }
    globalInputTracker.isTracking = true;
    globalInputTracker.elementTextMap = /* @__PURE__ */ new WeakMap();
    const trackElementText = () => {
      const allInputs = document.querySelectorAll(
        'input, textarea, [contenteditable="true"]'
      );
      allInputs.forEach((el) => {
        const text = getElementTextForTracking(el);
        globalInputTracker.elementTextMap.set(el, text);
      });
    };
    if (document.readyState === "complete" || document.readyState === "interactive") {
      trackElementText();
    } else {
      document.addEventListener("DOMContentLoaded", trackElementText);
    }
    const tryAutoAttach = (element) => {
      if (globalAttachedElements.has(element)) {
        const existingCleanup = globalAttachedElements.get(element);
        if (existingCleanup && existingCleanup !== PLACEHOLDER_CLEANUP) {
          return;
        }
      }
      const hasAttr = element.hasAttribute("data-automobile-complete-attached");
      const hasWrapper = element.parentElement?.classList.contains("autocomplete-wrapper");
      if (hasAttr || hasWrapper) {
        return;
      }
      const isInput = element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.contentEditable === "true" || element.isContentEditable;
      if (!isInput) {
        return;
      }
      if (isElementHidden(element)) {
        return;
      }
      if (element.tagName === "TEXTAREA" || element.tagName === "INPUT") {
        if (element.classList.contains("fallback") || element.classList.contains("wcDTda_fallbackTextarea") || element.hasAttribute("data-fallback")) {
          return;
        }
      }
      if (isElementAttached(element)) {
        return;
      }
      for (const registry of autoAttachmentRegistry) {
        if (registry.attachedElements.has(element)) {
          continue;
        }
        if (isElementAttached(element)) {
          return;
        }
        try {
          if (element.hasAttribute("data-automobile-complete-attached")) {
            return;
          }
          if (element.parentElement?.classList.contains("autocomplete-wrapper")) {
            return;
          }
          if (globalAttachedElements.has(element)) {
            const existingCleanup = globalAttachedElements.get(element);
            if (existingCleanup && existingCleanup !== PLACEHOLDER_CLEANUP) {
              return;
            }
            console.log("[Automobile Complete] Element has placeholder in registry, allowing attachment attempt:", getElementInfo(element));
          }
          if (element.hasAttribute("data-automobile-complete-attached") || element.parentElement?.classList.contains("autocomplete-wrapper")) {
            return;
          }
          if (globalAttachedElements.has(element)) {
            const existingCleanup = globalAttachedElements.get(element);
            if (existingCleanup && existingCleanup !== PLACEHOLDER_CLEANUP) {
              return;
            }
          }
          const elementInfo = getElementInfo(element);
          console.log("[Automobile Complete] Auto-attaching to input element detected by global tracker:", elementInfo, element);
          registry.attachFunction(element);
          registry.attachedElements.add(element);
          break;
        } catch (e) {
          console.warn("[Automobile Complete] Failed to auto-attach to element:", e);
        }
      }
    };
    document.addEventListener("focusin", (e) => {
      const target = e.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.contentEditable === "true" || target.isContentEditable)) {
        globalInputTracker.activeElement = target;
        const text = getElementTextForTracking(target);
        globalInputTracker.elementTextMap.set(target, text);
        tryAutoAttach(target);
      }
    }, true);
    document.addEventListener("keydown", (e) => {
      if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete" || e.key === "Enter" || e.key === "Tab" || e.key.startsWith("Arrow")) {
        const target = e.target;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.contentEditable === "true" || target.isContentEditable)) {
          globalInputTracker.activeElement = target;
          const text = getElementTextForTracking(target);
          globalInputTracker.elementTextMap.set(target, text);
          tryAutoAttach(target);
        } else {
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA" || activeEl.contentEditable === "true" || activeEl.isContentEditable)) {
            globalInputTracker.activeElement = activeEl;
            const text = getElementTextForTracking(activeEl);
            globalInputTracker.elementTextMap.set(activeEl, text);
            tryAutoAttach(activeEl);
          }
        }
      }
    }, true);
    document.addEventListener("input", (e) => {
      const target = e.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.contentEditable === "true" || target.isContentEditable)) {
        globalInputTracker.activeElement = target;
        const text = getElementTextForTracking(target);
        globalInputTracker.elementTextMap.set(target, text);
        tryAutoAttach(target);
      }
    }, true);
    console.log("[Automobile Complete] Global input tracking started");
  }

  // src/attachment/config.ts
  var DEFAULT_SELECTOR = 'input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], textarea, [contenteditable="true"]';
  var DEFAULT_ATTACHMENT_OPTIONS = {
    wrapperClass: "autocomplete-wrapper",
    overlayClass: "autocomplete-overlay",
    suggestionClass: "autocomplete-suggestion"
  };
  var CONTROLLER_OPTION_KEYS = ["maxCompletions", "tabBehavior", "tabSpacesCount", "maxLines"];
  function splitOptions(options) {
    const controllerOptions = {};
    const attachmentOptions = { ...DEFAULT_ATTACHMENT_OPTIONS };
    if (!options) {
      return { controllerOptions, attachmentOptions };
    }
    for (const key of CONTROLLER_OPTION_KEYS) {
      if (options[key] !== void 0) {
        controllerOptions[key] = options[key];
      }
    }
    for (const key in options) {
      if (!CONTROLLER_OPTION_KEYS.includes(key)) {
        attachmentOptions[key] = options[key];
      }
    }
    return { controllerOptions, attachmentOptions };
  }
  async function fetchCompletionList(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch completion list from ${url}: ${response.statusText}`);
    }
    return response.text();
  }
  function resolveController(controller, options) {
    if (!controller) {
      throw new Error("Controller (completion list) is required");
    }
    const { controllerOptions } = splitOptions(options);
    if (controller instanceof AutocompleteTextController) {
      return controller.clone();
    }
    if (typeof controller === "string") {
      return new AutocompleteTextController(controller, controllerOptions);
    }
    throw new Error("Invalid controller type");
  }
  function handleUrlController(url, inputElement, options, attachFunction) {
    const cleanupFunctions = [];
    let isCancelled = false;
    fetchCompletionList(url).then((completionList) => {
      if (!isCancelled) {
        const cleanup = attachFunction(inputElement, completionList, options);
        cleanupFunctions.push(cleanup);
      }
    }).catch((error) => {
      console.error("[Automobile Complete] Failed to fetch completion list:", error);
    });
    return () => {
      isCancelled = true;
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }
  function exposeControllerToWindow(controller) {
    if (typeof window !== "undefined") {
      window.amc = controller;
      controller.help();
    }
  }

  // src/attachment/selectorAttachment.ts
  function attachAutocompleteBySelector(selector, controller, options) {
    if (processingSelectors.has(selector)) {
      console.warn("[Automobile Complete] Selector already being processed, skipping:", selector);
      return () => {
      };
    }
    processingSelectors.add(selector);
    if (typeof document !== "undefined") {
      startGlobalInputTracking();
    }
    const cleanupFunctions = [];
    const attachedElements = /* @__PURE__ */ new WeakSet();
    const completionListString = typeof controller === "string" ? controller : controller instanceof AutocompleteTextController ? controller.originalCompletionList : null;
    if (!completionListString) {
      throw new Error("Selector-based attachment requires a completion list string or controller instance. Each element must get its own controller.");
    }
    const controllerOptions = controller instanceof AutocompleteTextController ? controller.getOptions() : void 0;
    const attachToElement = (el, skipSelectorCheck = false) => {
      if (attachedElements.has(el)) {
        return;
      }
      if (el.hasAttribute("data-automobile-complete-attached")) {
        return;
      }
      if (el.parentElement?.classList.contains("autocomplete-wrapper")) {
        return;
      }
      if (globalAttachedElements.has(el)) {
        const existingCleanup = globalAttachedElements.get(el);
        if (existingCleanup && existingCleanup !== PLACEHOLDER_CLEANUP) {
          return;
        }
      }
      const attachedInputDescendant = el.querySelector('input[data-automobile-complete-attached], textarea[data-automobile-complete-attached], [contenteditable="true"][data-automobile-complete-attached]');
      if (attachedInputDescendant) {
        return;
      }
      let ancestor = el.parentElement;
      let attachedAncestor = null;
      while (ancestor) {
        if (ancestor.hasAttribute("data-automobile-complete-attached") || ancestor.classList.contains("autocomplete-wrapper") || globalAttachedElements.has(ancestor)) {
          attachedAncestor = ancestor;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (attachedAncestor) {
        const ancestorCleanup = globalAttachedElements.get(attachedAncestor);
        if (ancestorCleanup) {
          ancestorCleanup();
        }
        globalAttachedElements.delete(attachedAncestor);
        attachingElements.delete(attachedAncestor);
        attachedAncestor.removeAttribute("data-automobile-complete-attached");
      }
      if (globalAttachedElements.has(el)) {
        const existingCleanup = globalAttachedElements.get(el);
        if (existingCleanup && existingCleanup !== PLACEHOLDER_CLEANUP) {
          return;
        }
      }
      if (el.hasAttribute("data-automobile-complete-attached") || el.parentElement?.classList.contains("autocomplete-wrapper")) {
        return;
      }
      if (attachedElements.has(el)) {
        return;
      }
      if (!skipSelectorCheck) {
        try {
          if (!el.matches || !el.matches(selector)) {
            return;
          }
        } catch (e) {
          return;
        }
      } else {
        const isInput = el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.contentEditable === "true" || el.isContentEditable;
        if (!isInput) {
          return;
        }
      }
      if (isElementHidden(el)) {
        return;
      }
      if (el.hasAttribute("data-automobile-complete-attached")) {
        return;
      }
      if (el.parentElement?.classList.contains("autocomplete-wrapper")) {
        return;
      }
      if (globalAttachedElements.has(el)) {
        const existingCleanup = globalAttachedElements.get(el);
        if (existingCleanup && existingCleanup !== PLACEHOLDER_CLEANUP) {
          return;
        }
      }
      if (attachingElements.has(el)) {
        return;
      }
      attachedElements.add(el);
      const elementInfo = getElementInfo(el);
      console.log(`%c[Automobile Complete] Attaching to element:`, "color: #4CAF50; font-weight: bold;", elementInfo, el);
      console.info(`[Automobile Complete] Attaching to element:`, elementInfo, el);
      try {
        const elementOptions = controllerOptions ? { ...options, ...controllerOptions } : options;
        const cleanup = attachAutocomplete(el, completionListString, elementOptions);
        if (!el.hasAttribute("data-automobile-complete-attached") && !el.parentElement?.classList.contains("autocomplete-wrapper")) {
          console.warn("[Automobile Complete] Attachment was blocked, removing from attachedElements:", getElementInfo(el));
          attachedElements.delete(el);
        } else {
          cleanupFunctions.push(cleanup);
        }
      } catch (error) {
        console.error("[Automobile Complete] Attachment failed, removing from attachedElements:", error, getElementInfo(el));
        attachedElements.delete(el);
        throw error;
      }
    };
    const registryEntry = {
      completionList: completionListString,
      // Must be a string (completion list or URL)
      options,
      attachedElements,
      attachFunction: (el) => attachToElement(el, true)
      // Skip selector check for auto-attachment
    };
    autoAttachmentRegistry.push(registryEntry);
    const attachToElements = () => {
      const elements = document.querySelectorAll(selector);
      console.log(`%c[Automobile Complete] Found ${elements.length} element(s) matching selector: "${selector}"`, "color: #2196F3; font-weight: bold;");
      console.info(`[Automobile Complete] Found ${elements.length} element(s) matching selector: "${selector}"`);
      const actualInputs = [];
      elements.forEach((el) => {
        if (isElementHidden(el)) {
          console.log(`%c[Automobile Complete] Skipping hidden element in selector:`, "color: #FF9800; font-weight: bold;", getElementInfo(el));
          console.info(`[Automobile Complete] Skipping hidden element in selector:`, getElementInfo(el));
          return;
        }
        if (el.hasAttribute("data-automobile-complete-attached") || el.parentElement?.classList.contains("autocomplete-wrapper") || el.querySelector("[data-automobile-complete-attached]")) {
          console.log(`%c[Automobile Complete] Skipping element (already attached or has attached parent/child):`, "color: #FF9800; font-weight: bold;", getElementInfo(el));
          console.info(`[Automobile Complete] Skipping element (already attached or has attached parent/child):`, getElementInfo(el));
          return;
        }
        if (isContentEditable(el)) {
          actualInputs.push(el);
        } else {
          actualInputs.push(el);
        }
      });
      console.log(`%c[Automobile Complete] Attaching to ${actualInputs.length} actual input element(s)`, "color: #4CAF50; font-weight: bold;");
      actualInputs.forEach((el) => {
        attachToElement(el);
      });
    };
    if (document.readyState === "complete" || document.readyState === "interactive") {
      attachToElements();
    } else {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", attachToElements);
      } else {
        window.addEventListener("load", attachToElements);
      }
    }
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        Array.from(mutation.addedNodes).forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            if (element.matches && (element.matches("input") || element.matches("textarea") || element.matches('[contenteditable="true"]'))) {
              attachToElement(element);
            }
            const inputs = element.querySelectorAll('input, textarea, [contenteditable="true"]');
            Array.from(inputs).forEach((input) => {
              let parent = input.parentElement;
              let skip = false;
              while (parent && parent !== element) {
                if (parent.hasAttribute("data-automobile-complete-attached") || parent.classList.contains("autocomplete-wrapper")) {
                  skip = true;
                  break;
                }
                parent = parent.parentElement;
              }
              if (!skip) {
                attachToElement(input);
              }
            });
          }
        });
      }
    });
    observer.observe(document.body || document.documentElement, {
      childList: true,
      subtree: true
    });
    console.log(`%c[Automobile Complete] MutationObserver set up to watch for new input elements matching: "${selector}"`, "color: #9C27B0; font-weight: bold;");
    console.info(`[Automobile Complete] MutationObserver set up to watch for new input elements matching: "${selector}"`);
    return () => {
      observer.disconnect();
      cleanupFunctions.forEach((cleanup) => cleanup());
      const index = autoAttachmentRegistry.indexOf(registryEntry);
      if (index >= 0) {
        autoAttachmentRegistry.splice(index, 1);
      }
      processingSelectors.delete(selector);
      console.log("[Automobile Complete] MutationObserver disconnected and cleanup functions called");
    };
  }

  // src/attachment/overlay/CompletionOverlay.ts
  var CompletionOverlay = class {
    constructor(inputElement, controller) {
      __publicField(this, "inputElement");
      __publicField(this, "controller");
      __publicField(this, "shadowHost", null);
      __publicField(this, "shadowOverlay", null);
      __publicField(this, "shadowHighlight", null);
      this.inputElement = inputElement;
      this.controller = controller;
      this.createShadowOverlay();
    }
    /**
     * Create isolated Shadow DOM overlay that can't be affected by page CSS
     */
    createShadowOverlay() {
      let host = document.getElementById("__automobile-caret-overlay-host");
      if (!host) {
        host = document.createElement("div");
        host.id = "__automobile-caret-overlay-host";
        Object.assign(host.style, {
          position: "fixed",
          inset: "0",
          pointerEvents: "none",
          zIndex: "2147483647"
        });
        document.documentElement.appendChild(host);
        const shadow = host.attachShadow({ mode: "open" });
        const caretOverlay = document.createElement("div");
        Object.assign(caretOverlay.style, {
          position: "fixed",
          left: "0px",
          top: "0px",
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
          color: "#999",
          pointerEvents: "none",
          whiteSpace: "pre",
          visibility: "hidden"
        });
        caretOverlay.textContent = "";
        const highlightOverlay = document.createElement("div");
        Object.assign(highlightOverlay.style, {
          position: "fixed",
          left: "0px",
          top: "0px",
          backgroundColor: "rgba(128, 128, 128, 0.3)",
          pointerEvents: "none",
          visibility: "hidden",
          zIndex: "2147483646"
          // Just below completion overlay
        });
        shadow.appendChild(caretOverlay);
        shadow.appendChild(highlightOverlay);
        this.shadowHost = host;
        this.shadowOverlay = caretOverlay;
        this.shadowHighlight = highlightOverlay;
      } else {
        this.shadowHost = host;
        const shadow = host.shadowRoot;
        if (shadow) {
          const children = Array.from(shadow.children);
          this.shadowOverlay = children[0];
          if (children.length > 1) {
            this.shadowHighlight = children[1];
          } else {
            const highlightOverlay = document.createElement("div");
            Object.assign(highlightOverlay.style, {
              position: "fixed",
              left: "0px",
              top: "0px",
              backgroundColor: "rgba(128, 128, 128, 0.3)",
              pointerEvents: "none",
              visibility: "hidden",
              zIndex: "2147483646"
            });
            shadow.appendChild(highlightOverlay);
            this.shadowHighlight = highlightOverlay;
          }
        }
      }
    }
    /**
     * Update the overlay content based on controller state
     */
    update() {
      const text = this.controller.text;
      const suggestion = this.controller.suggestion;
      this.updateOverlayCompletely(text, suggestion);
    }
    /**
     * BACK TO BASICS: Use the original simple approach that actually worked
     */
    updateOverlayCompletely(text, suggestion) {
      if (!this.shadowOverlay) {
        return;
      }
      if (!suggestion) {
        this.shadowOverlay.style.visibility = "hidden";
        this.shadowOverlay.textContent = "";
        if (this.shadowHighlight) {
          this.shadowHighlight.style.visibility = "hidden";
        }
        return;
      }
      let backspaceCount = 0;
      while (backspaceCount < suggestion.length && suggestion[backspaceCount] === "\b") {
        backspaceCount++;
      }
      const cleanSuggestion = suggestion.substring(backspaceCount);
      const cursorPos = this.getUnifiedCaretPosition();
      if (!cursorPos) {
        this.shadowOverlay.style.visibility = "hidden";
        this.shadowOverlay.textContent = "";
        if (this.shadowHighlight) {
          this.shadowHighlight.style.visibility = "hidden";
        }
        return;
      }
      const inputStyles = window.getComputedStyle(this.inputElement);
      this.shadowOverlay.style.fontSize = inputStyles.fontSize;
      this.shadowOverlay.style.fontFamily = inputStyles.fontFamily;
      this.shadowOverlay.style.fontWeight = inputStyles.fontWeight;
      this.shadowOverlay.style.fontStyle = inputStyles.fontStyle;
      this.shadowOverlay.style.lineHeight = inputStyles.lineHeight;
      this.shadowOverlay.style.letterSpacing = inputStyles.letterSpacing;
      const baselineOffset = this.calculateBaselineOffset(inputStyles);
      this.shadowOverlay.style.left = `${cursorPos.left}px`;
      this.shadowOverlay.style.top = `${cursorPos.top - baselineOffset}px`;
      this.shadowOverlay.textContent = cleanSuggestion;
      this.shadowOverlay.style.visibility = "visible";
      const isDarkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      this.shadowOverlay.style.backgroundColor = isDarkMode ? "#1a1a1a" : "#ffffff";
      this.shadowOverlay.style.padding = "0 0px";
      this.shadowOverlay.style.margin = "0";
      this.shadowOverlay.style.borderLeft = "1px solid green";
      this.shadowOverlay.style.paddingLeft = "1px";
      if (backspaceCount > 0 && this.shadowHighlight) {
        this.updateReplacementHighlight(cursorPos, backspaceCount, inputStyles);
      } else if (this.shadowHighlight) {
        this.shadowHighlight.style.visibility = "hidden";
      }
    }
    /**
     * Calculate a small baseline offset adjustment (max ±5px) for aligning overlay text
     * Different element types return cursor positions at different vertical positions
     */
    calculateBaselineOffset(inputStyles) {
      const fontSize = parseFloat(inputStyles.fontSize) || 16;
      const lineHeight = parseFloat(inputStyles.lineHeight) || fontSize;
      const isContentEditable3 = this.inputElement.contentEditable === "true" || this.inputElement.isContentEditable;
      const isTextarea = this.inputElement.tagName === "TEXTAREA";
      const isInput = this.inputElement.tagName === "INPUT";
      let offset = 0;
      if (isContentEditable3) {
        offset = 2;
      } else if (isTextarea) {
        offset = 2 + fontSize * 0.15;
      } else if (isInput) {
        offset = 2 + lineHeight / 2 - fontSize * 0.8;
      }
      return Math.max(-3, Math.min(3, offset));
    }
    /**
     * Update the gray highlight showing which characters will be replaced
     * Uses same reliable method as completion - measure text width, use negative marginLeft
     */
    updateReplacementHighlight(cursorPos, backspaceCount, inputStyles) {
      if (!this.shadowHighlight)
        return;
      const cursorCharPos = this.getCursorPosition();
      if (cursorCharPos === null || cursorCharPos < backspaceCount) {
        this.shadowHighlight.style.visibility = "hidden";
        return;
      }
      const input = this.inputElement.tagName === "INPUT" || this.inputElement.tagName === "TEXTAREA" ? this.inputElement : null;
      let textToReplace = "";
      if (input) {
        textToReplace = input.value.substring(cursorCharPos - backspaceCount, cursorCharPos);
      } else if (this.inputElement.contentEditable === "true" || this.inputElement.isContentEditable) {
        const textContent = this.inputElement.textContent || "";
        textToReplace = textContent.substring(cursorCharPos - backspaceCount, cursorCharPos);
      }
      if (!textToReplace) {
        this.shadowHighlight.style.visibility = "hidden";
        return;
      }
      const span = document.createElement("span");
      span.style.position = "fixed";
      span.style.visibility = "hidden";
      span.style.whiteSpace = "pre";
      span.style.fontSize = inputStyles.fontSize;
      span.style.fontFamily = inputStyles.fontFamily;
      span.style.fontWeight = inputStyles.fontWeight;
      span.style.fontStyle = inputStyles.fontStyle;
      span.style.letterSpacing = inputStyles.letterSpacing;
      span.textContent = textToReplace;
      document.body.appendChild(span);
      try {
        const width = span.getBoundingClientRect().width;
        const lineHeight = parseFloat(inputStyles.lineHeight) || parseFloat(inputStyles.fontSize) || 16;
        if (width <= 0 || width > 1e4) {
          this.shadowHighlight.style.visibility = "hidden";
          return;
        }
        this.shadowHighlight.style.left = `${cursorPos.left}px`;
        this.shadowHighlight.style.top = `${cursorPos.top}px`;
        this.shadowHighlight.style.width = `${width}px`;
        this.shadowHighlight.style.height = `${lineHeight}px`;
        this.shadowHighlight.style.marginLeft = `-${width}px`;
        this.shadowHighlight.style.visibility = "visible";
      } finally {
        document.body.removeChild(span);
      }
    }
    /**
     * Get cursor position (character index)
     */
    getCursorPosition() {
      if (this.inputElement.tagName === "INPUT" || this.inputElement.tagName === "TEXTAREA") {
        const input = this.inputElement;
        return input.selectionStart ?? null;
      } else if (this.inputElement.contentEditable === "true" || this.inputElement.isContentEditable) {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
          return null;
        }
        const range = selection.getRangeAt(0);
        if (!this.inputElement.contains(range.commonAncestorContainer)) {
          return null;
        }
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(this.inputElement);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        return preCaretRange.toString().length;
      }
      return null;
    }
    /**
     * Get position of a specific character index
     */
    getCharacterPosition(charIndex) {
      if (this.inputElement.contentEditable === "true" || this.inputElement.isContentEditable) {
        try {
          const textContent = this.inputElement.textContent || "";
          if (charIndex > textContent.length)
            return null;
          const newRange = document.createRange();
          newRange.selectNodeContents(this.inputElement);
          let currentPos = 0;
          const walker = document.createTreeWalker(
            this.inputElement,
            NodeFilter.SHOW_TEXT,
            null
          );
          let node;
          while ((node = walker.nextNode()) && currentPos < charIndex) {
            const nodeLength = node.textContent?.length || 0;
            if (currentPos + nodeLength >= charIndex) {
              newRange.setStart(node, charIndex - currentPos);
              break;
            }
            currentPos += nodeLength;
          }
          newRange.collapse(true);
          const rect = newRange.getBoundingClientRect();
          return { left: rect.left, top: rect.top };
        } catch (e) {
          return null;
        }
      }
      const input = this.inputElement;
      return this.getInputCaretPosition(input, charIndex);
    }
    /**
     * Unified caret tracker - works for both input/textarea and contenteditable
     */
    getUnifiedCaretPosition() {
      if (this.inputElement.contentEditable === "true" || this.inputElement.isContentEditable) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          try {
            const range = selection.getRangeAt(0);
            if (this.inputElement.contains(range.commonAncestorContainer)) {
              const collapsedRange = range.cloneRange();
              collapsedRange.collapse(true);
              const rect = collapsedRange.getBoundingClientRect();
              return { left: rect.left, top: rect.top };
            }
          } catch (e) {
            return null;
          }
        }
        return null;
      }
      const input = this.inputElement;
      const selectionStart = input.selectionStart;
      if (selectionStart === null)
        return null;
      return this.getInputCaretPosition(input, selectionStart);
    }
    /**
     * Get caret position for input/textarea by mirroring in hidden clone
     */
    getInputCaretPosition(input, selectionStart) {
      const computed = window.getComputedStyle(input);
      const inputRect = input.getBoundingClientRect();
      const textBeforeCursor = input.value.substring(0, selectionStart);
      const mirror = document.createElement(input.tagName.toLowerCase());
      Object.assign(mirror.style, {
        position: "fixed",
        visibility: "hidden",
        pointerEvents: "none",
        whiteSpace: input.tagName === "TEXTAREA" ? "pre-wrap" : "nowrap",
        overflow: "hidden"
      });
      mirror.style.fontSize = computed.fontSize;
      mirror.style.fontFamily = computed.fontFamily;
      mirror.style.fontWeight = computed.fontWeight;
      mirror.style.fontStyle = computed.fontStyle;
      mirror.style.letterSpacing = computed.letterSpacing;
      mirror.style.padding = computed.padding;
      mirror.style.border = computed.border;
      mirror.style.boxSizing = computed.boxSizing;
      mirror.style.width = computed.width;
      mirror.style.height = computed.height;
      mirror.style.textAlign = computed.textAlign;
      mirror.style.lineHeight = computed.lineHeight;
      mirror.value = input.value;
      mirror.setSelectionRange(selectionStart, selectionStart);
      document.body.appendChild(mirror);
      try {
        if (input.tagName === "TEXTAREA") {
          const lines = textBeforeCursor.split("\n");
          const lineIndex = lines.length - 1;
          const lineText = lines[lineIndex] || "";
          const lineSpan = document.createElement("span");
          lineSpan.style.position = "fixed";
          lineSpan.style.visibility = "hidden";
          lineSpan.style.whiteSpace = "pre";
          lineSpan.style.fontSize = computed.fontSize;
          lineSpan.style.fontFamily = computed.fontFamily;
          lineSpan.style.fontWeight = computed.fontWeight;
          lineSpan.style.fontStyle = computed.fontStyle;
          lineSpan.style.letterSpacing = computed.letterSpacing;
          lineSpan.textContent = lineText;
          document.body.appendChild(lineSpan);
          try {
            const lineRect = lineSpan.getBoundingClientRect();
            const paddingLeft = parseFloat(computed.paddingLeft) || 0;
            const paddingTop = parseFloat(computed.paddingTop) || 0;
            const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) || 16;
            return {
              left: inputRect.left + paddingLeft + lineRect.width,
              top: inputRect.top + paddingTop + lineHeight * lineIndex
            };
          } finally {
            document.body.removeChild(lineSpan);
          }
        } else {
          const span = document.createElement("span");
          span.style.position = "fixed";
          span.style.visibility = "hidden";
          span.style.whiteSpace = "pre";
          span.style.fontSize = computed.fontSize;
          span.style.fontFamily = computed.fontFamily;
          span.style.fontWeight = computed.fontWeight;
          span.style.fontStyle = computed.fontStyle;
          span.style.letterSpacing = computed.letterSpacing;
          span.textContent = textBeforeCursor;
          document.body.appendChild(span);
          try {
            const spanRect = span.getBoundingClientRect();
            const paddingLeft = parseFloat(computed.paddingLeft) || 0;
            const paddingTop = parseFloat(computed.paddingTop) || 0;
            const lineHeight = parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) || 16;
            const inputHeight = inputRect.height;
            const verticalCenter = (inputHeight - lineHeight) / 2;
            return {
              left: inputRect.left + paddingLeft + spanRect.width,
              top: inputRect.top + paddingTop + verticalCenter
            };
          } finally {
            document.body.removeChild(span);
          }
        }
      } finally {
        document.body.removeChild(mirror);
      }
    }
    /**
     * Cleanup and remove the overlay
     */
    destroy() {
      if (this.shadowOverlay) {
        this.shadowOverlay.style.visibility = "hidden";
        this.shadowOverlay.textContent = "";
      }
    }
  };

  // src/attachment/textManipulation/BackspaceProcessor.ts
  var BACKSPACE3 = "\b";
  function processBackspaces(text) {
    let result = "";
    for (let i = 0; i < text.length; i++) {
      if (text[i] === BACKSPACE3) {
        if (result.length > 0) {
          result = result.slice(0, -1);
        }
      } else {
        result += text[i];
      }
    }
    return result;
  }

  // src/attachment/textManipulation/InputTextManipulator.ts
  var InputTextManipulator = class {
    canHandle(element) {
      return element.tagName === "INPUT" || element.tagName === "TEXTAREA";
    }
    getText(element) {
      return element.value || "";
    }
    setText(element, text) {
      const processedText = processBackspaces(text);
      this.setTextDirect(element, processedText);
    }
    setTextDirect(element, processedText) {
      element.value = processedText;
    }
    setCursorToEnd(element) {
      const input = element;
      const length = input.value.length;
      input.setSelectionRange(length, length);
    }
    insertTextAtCursor(element, text) {
      const input = element;
      const BACKSPACE4 = "\b";
      let backspaceCount = 0;
      while (backspaceCount < text.length && text[backspaceCount] === BACKSPACE4) {
        backspaceCount++;
      }
      const textToInsert = text.slice(backspaceCount);
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      if (backspaceCount > 0) {
        const deleteStart = Math.max(0, start - backspaceCount);
        const currentValue2 = input.value;
        input.value = currentValue2.slice(0, deleteStart) + currentValue2.slice(end);
        input.setSelectionRange(deleteStart, deleteStart);
      }
      const insertStart = input.selectionStart || 0;
      const insertEnd = input.selectionEnd || 0;
      const currentValue = input.value;
      input.value = currentValue.slice(0, insertStart) + textToInsert + currentValue.slice(insertEnd);
      const newCursorPos = insertStart + textToInsert.length;
      input.setSelectionRange(newCursorPos, newCursorPos);
    }
  };

  // src/attachment/textManipulation/ContentEditableTextManipulator.ts
  var ContentEditableTextManipulator = class {
    canHandle(element) {
      return element.contentEditable === "true" || element.isContentEditable;
    }
    getText(element) {
      const actualElement = findActualInputElement(element);
      return actualElement.innerText || actualElement.textContent || "";
    }
    setText(element, text) {
      const processedText = processBackspaces(text);
      this.setTextDirect(element, processedText);
    }
    setTextDirect(element, processedText) {
      const actualElement = findActualInputElement(element);
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        try {
          const range = selection.getRangeAt(0);
          if (element.contains(range.commonAncestorContainer)) {
            range.deleteContents();
            const textNode = document.createTextNode(processedText);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            return;
          }
        } catch (e) {
        }
      }
      actualElement.textContent = processedText;
    }
    setCursorToEnd(element) {
      const actualElement = findActualInputElement(element);
      const selection = window.getSelection();
      if (selection) {
        const range = document.createRange();
        range.selectNodeContents(actualElement);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
    insertTextAtCursor(element, text) {
      const BACKSPACE4 = "\b";
      let backspaceCount = 0;
      while (backspaceCount < text.length && text[backspaceCount] === BACKSPACE4) {
        backspaceCount++;
      }
      const textToInsert = text.slice(backspaceCount);
      const actualElement = findActualInputElement(element);
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        try {
          const range = selection.getRangeAt(0);
          if (element.contains(range.commonAncestorContainer)) {
            if (backspaceCount > 0) {
              for (let i = 0; i < backspaceCount; i++) {
                if (range.startOffset > 0) {
                  range.setStart(range.startContainer, range.startOffset - 1);
                  range.deleteContents();
                } else {
                  let node = range.startContainer;
                  while (node && node.nodeType !== Node.TEXT_NODE) {
                    node = node.previousSibling;
                  }
                  if (node && node.nodeType === Node.TEXT_NODE) {
                    const textNode2 = node;
                    const textLength = textNode2.textContent?.length || 0;
                    if (textLength > 0) {
                      range.setStart(textNode2, textLength - 1);
                      range.setEnd(range.startContainer, range.startOffset);
                      range.deleteContents();
                    } else {
                      break;
                    }
                  } else {
                    break;
                  }
                }
              }
            }
            range.deleteContents();
            const textNode = document.createTextNode(textToInsert);
            range.insertNode(textNode);
            range.setStartAfter(textNode);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            return;
          }
        } catch (e) {
        }
      }
      const currentText = actualElement.textContent || "";
      const textAfterBackspaces = currentText.slice(0, Math.max(0, currentText.length - backspaceCount)) + textToInsert;
      actualElement.textContent = textAfterBackspaces;
    }
  };

  // src/attachment/textManipulation/index.ts
  var manipulators = [
    new InputTextManipulator(),
    new ContentEditableTextManipulator()
  ];
  function getTextManipulator(element) {
    for (const manipulator of manipulators) {
      if (manipulator.canHandle(element)) {
        return manipulator;
      }
    }
    return new InputTextManipulator();
  }

  // src/attachment/attachAutocomplete.ts
  function attachAutocomplete(inputElement, controller, options) {
    if (typeof inputElement === "string") {
      const selector = inputElement;
      if (typeof controller === "string" && (controller.startsWith("http://") || controller.startsWith("https://"))) {
        return handleUrlController(controller, selector, options, (el2, ctrl, opts) => {
          if (typeof el2 === "string") {
            return attachAutocompleteBySelector(el2, ctrl, opts);
          }
          return attachAutocomplete(el2, ctrl, opts);
        });
      }
      const resolvedController2 = resolveController(controller, options);
      const { attachmentOptions: attachmentOptions2 } = splitOptions(options);
      exposeControllerToWindow(resolvedController2);
      return attachAutocompleteBySelector(selector, resolvedController2, attachmentOptions2);
    }
    if (inputElement === void 0) {
      const selector = DEFAULT_SELECTOR;
      if (typeof controller === "string" && (controller.startsWith("http://") || controller.startsWith("https://"))) {
        return handleUrlController(controller, selector, options, (el2, ctrl, opts) => {
          if (typeof el2 === "string") {
            return attachAutocompleteBySelector(el2, ctrl, opts);
          }
          return attachAutocomplete(el2, ctrl, opts);
        });
      }
      const resolvedController2 = resolveController(controller, options);
      const { attachmentOptions: attachmentOptions2 } = splitOptions(options);
      exposeControllerToWindow(resolvedController2);
      return attachAutocompleteBySelector(selector, resolvedController2, attachmentOptions2);
    }
    const el = inputElement;
    const textManipulator = getTextManipulator(el);
    if (typeof controller === "string" && (controller.startsWith("http://") || controller.startsWith("https://"))) {
      return handleUrlController(controller, el, options, attachAutocomplete);
    }
    const resolvedController = resolveController(controller, options);
    const { attachmentOptions } = splitOptions(options);
    exposeControllerToWindow(resolvedController);
    controller = resolvedController;
    options = attachmentOptions;
    const existingCleanup = globalAttachedElements.get(el);
    if (existingCleanup && existingCleanup !== PLACEHOLDER_CLEANUP) {
      return existingCleanup;
    }
    if (existingCleanup === PLACEHOLDER_CLEANUP) {
      globalAttachedElements.delete(el);
      attachingElements.delete(el);
      el.removeAttribute("data-automobile-complete-attached");
    }
    if (attachingElements.has(el)) {
      return () => {
      };
    }
    const attachedInputDescendant = el.querySelector('input[data-automobile-complete-attached], textarea[data-automobile-complete-attached], [contenteditable="true"][data-automobile-complete-attached]');
    if (attachedInputDescendant) {
      return () => {
      };
    }
    let ancestor = el.parentElement;
    while (ancestor) {
      const ancestorCleanup = globalAttachedElements.get(ancestor);
      if (ancestorCleanup && ancestorCleanup !== PLACEHOLDER_CLEANUP) {
        ancestorCleanup();
        globalAttachedElements.delete(ancestor);
        attachingElements.delete(ancestor);
        ancestor.removeAttribute("data-automobile-complete-attached");
        break;
      }
      ancestor = ancestor.parentElement;
    }
    attachingElements.add(el);
    el.setAttribute("data-automobile-complete-attached", "true");
    globalAttachedElements.set(el, PLACEHOLDER_CLEANUP);
    console.info("[Automobile Complete] Attaching autocomplete to element:", el);
    try {
      const overlay = new CompletionOverlay(el, controller);
      const ref = { current: el };
      controller.setInputRef(ref);
      const originalCaretColor = el.style.caretColor;
      el.style.caretColor = "green";
      const updateOverlayFromElement = () => {
        const currentText = textManipulator.getText(el);
        controller.handleTextChange(currentText);
        overlay.update();
      };
      const handleKeyDown = (e) => {
        const key = e.key;
        if (key === "Tab" && controller.suggestion) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          const completion = controller.suggestion;
          controller.handleKeyPress(e);
          textManipulator.insertTextAtCursor(el, completion);
          overlay.update();
          return;
        }
        requestAnimationFrame(updateOverlayFromElement);
      };
      const handleInput = () => {
        updateOverlayFromElement();
      };
      el.addEventListener("keydown", handleKeyDown, true);
      el.addEventListener("input", handleInput, false);
      setTimeout(() => {
        const currentText = textManipulator.getText(el);
        controller.handleTextChange(currentText);
        overlay.update();
      }, 0);
      const cleanup = () => {
        el.removeEventListener("keydown", handleKeyDown, true);
        el.removeEventListener("input", handleInput, false);
        el.removeAttribute("data-automobile-complete-attached");
        if (originalCaretColor) {
          el.style.caretColor = originalCaretColor;
        } else {
          el.style.removeProperty("caret-color");
        }
        attachingElements.delete(el);
        globalAttachedElements.delete(el);
        overlay.destroy();
      };
      globalAttachedElements.set(el, cleanup);
      return cleanup;
    } catch (error) {
      console.error("[Automobile Complete] Error during attachment, cleaning up placeholder:", error, getElementInfo(el), el);
      globalAttachedElements.delete(el);
      attachingElements.delete(el);
      el.removeAttribute("data-automobile-complete-attached");
      throw error;
    }
  }

  // src/engine/browser.ts
  if (typeof window !== "undefined") {
    window.AutomobileComplete = {
      AutocompleteTextController,
      attachAutocomplete
    };
  }
  if (typeof window !== "undefined") {
    const currentScript = document.currentScript;
    const getScriptAttr = (name) => {
      if (!currentScript)
        return null;
      const camelCase = name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      if (currentScript.dataset[camelCase]) {
        return currentScript.dataset[camelCase] || null;
      }
      return currentScript.getAttribute(`data-${name}`) || null;
    };
    const urlParams = new URLSearchParams(window.location.search);
    const selector = getScriptAttr("selector") || getScriptAttr("target") || urlParams.get("autocomplete-selector") || urlParams.get("selector") || 'input[type="text"], input[type="search"], input[type="email"], input[type="url"], input[type="tel"], textarea, [contenteditable="true"]';
    let completionList = getScriptAttr("completions") || getScriptAttr("completionlist") || getScriptAttr("list") || getScriptAttr("completions-list") || urlParams.get("autocomplete-completions") || urlParams.get("completions") || urlParams.get("completionlist") || void 0;
    const addInnerHTML = getScriptAttr("add-inner-html") === "true" || urlParams.get("add-inner-html") === "true" || true;
    if (currentScript && addInnerHTML) {
      const innerContent = currentScript.textContent || currentScript.innerHTML || "";
      const trimmedContent = innerContent.trim();
      if (trimmedContent.length > 0) {
        const lines = trimmedContent.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);
        if (lines.length > 0) {
          const innerHTMLList = lines.join("\n");
          if (completionList) {
            completionList = completionList + "\n" + innerHTMLList;
          } else {
            completionList = innerHTMLList;
          }
        }
      }
    }
    let normalizedCompletionList = void 0;
    if (completionList) {
      const hasNewlines = completionList.includes("\n");
      if (!hasNewlines) {
        normalizedCompletionList = completionList.split(";").map((s) => s.trim()).filter((s) => s.length > 0).join("\n");
      } else {
        normalizedCompletionList = completionList.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/[ \t]+/g, " ").replace(/ \n/g, "\n").replace(/\n /g, "\n").replace(/\n{3,}/g, "\n\n");
      }
    }
    const usePasteEvents = getScriptAttr("use-paste-events") === "true" || urlParams.get("use-paste-events") === "true";
    const simulateTyping = getScriptAttr("simulate-typing") === "true" || urlParams.get("simulate-typing") === "true";
    if (normalizedCompletionList) {
      const init = () => {
        const options = {};
        if (usePasteEvents)
          options.usePasteEvents = true;
        if (simulateTyping)
          options.simulateTyping = true;
        attachAutocomplete(selector, normalizedCompletionList, options);
      };
      if (document.readyState === "complete" || document.readyState === "interactive") {
        init();
      } else {
        document.addEventListener("DOMContentLoaded", init);
      }
    }
  }
  return __toCommonJS(browser_exports);
})();
//# sourceMappingURL=automobile-complete.js.map
