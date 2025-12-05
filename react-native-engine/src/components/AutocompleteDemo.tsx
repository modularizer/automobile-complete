import React, { useState, useRef, useEffect } from "react";
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import { Trie } from "../engine/Trie";
import { TAB } from "../engine/constants";

// Sample completion list data
const SAMPLE_COMPLETIONS = `
approp|riate #46774
bost|on #46774
hopi|ng #46774
musl|im #46774
mista|ke #46774
`;

interface AutocompleteDemoProps {
  completionList?: string;
}

export default function AutocompleteDemo({
  completionList = SAMPLE_COMPLETIONS,
}: AutocompleteDemoProps) {
  const [text, setText] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [trieRoot, setTrieRoot] = useState<Trie | null>(null);
  const [currentNode, setCurrentNode] = useState<Trie | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Initialize trie from completion list
  useEffect(() => {
    const t = Trie.fromWords(completionList);
    setTrieRoot(t);
    setCurrentNode(t);
  }, [completionList]);

  // Update suggestion as text changes
  useEffect(() => {
    if (!trieRoot) return;

    // Walk through the trie with current text from root
    const node = trieRoot.walk_to(text);
    setCurrentNode(node);
    setSuggestion(node.completion || "");
    // Reset focused index when text changes
    setFocusedIndex(null);
  }, [text, trieRoot]);

  // Get completions from current node and split based on current node's prefix
  const availableCompletions = currentNode
    ? currentNode.list_options().map((opt) => {
        const fullPrefix = opt.prefix;
        const currentNodePrefix = currentNode.prefix.toLowerCase();
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
      })
    : [];

  const handleTextChange = (newText: string) => {
    setText(newText);
  };

  const selectCompletion = (completion: { typedPrefix: string; remainingPrefix: string; completion: string }) => {
    const fullWord = completion.typedPrefix + completion.remainingPrefix + completion.completion;
    if (trieRoot) {
      const node = trieRoot.walk_to(fullWord);
      setText(node.full_text);
      setCurrentNode(node);
      setSuggestion(node.completion || "");
      setFocusedIndex(null);
      // Refocus the input
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyPress = (e: any) => {
    const key = e.nativeEvent.key;
    
    // Handle arrow keys for navigation
    if (key === "ArrowDown") {
      e.preventDefault();
      if (availableCompletions.length > 0) {
        setFocusedIndex((prev) => {
          if (prev === null) return 0;
          return Math.min(prev + 1, availableCompletions.length - 1);
        });
      }
      return;
    }
    
    if (key === "ArrowUp") {
      e.preventDefault();
      if (availableCompletions.length > 0) {
        setFocusedIndex((prev) => {
          if (prev === null) return availableCompletions.length - 1;
          return Math.max(prev - 1, 0);
        });
      }
      return;
    }
    
    // Handle Tab or Enter key to accept completion or focused option
    if (key === "Tab" || key === "Enter") {
      e.preventDefault();
      if (focusedIndex !== null && availableCompletions[focusedIndex]) {
        // Select focused option
        selectCompletion(availableCompletions[focusedIndex]);
      } else if (suggestion && currentNode) {
        // Accept current suggestion
        const node = currentNode.walk_to(TAB);
        setText(node.full_text);
        setCurrentNode(node);
        setSuggestion(node.completion || "");
        // Refocus the input
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Autocomplete Demo</Text>
      
      <View style={styles.spacer} />
      
      <View style={styles.autocompleteWrapper}>
        <View style={styles.inputWrapper}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={text}
            onChangeText={handleTextChange}
            onKeyPress={handleKeyPress}
            placeholder="Start typing..."
            autoFocus
            multiline={false}
            selectionColor="#007AFF"
            {...(Platform.OS === "ios" && { cursorColor: "#007AFF" })}
            {...(Platform.OS === "android" && { underlineColorAndroid: "transparent" })}
          {...(Platform.OS === "web" && {
            onKeyDown: (e: any) => {
              const key = e.key;
              
              // Handle arrow keys for navigation
              if (key === "ArrowDown") {
                e.preventDefault();
                if (availableCompletions.length > 0) {
                  setFocusedIndex((prev) => {
                    if (prev === null) return 0;
                    return Math.min(prev + 1, availableCompletions.length - 1);
                  });
                }
                return;
              }
              
              if (key === "ArrowUp") {
                e.preventDefault();
                if (availableCompletions.length > 0) {
                  setFocusedIndex((prev) => {
                    if (prev === null) return availableCompletions.length - 1;
                    return Math.max(prev - 1, 0);
                  });
                }
                return;
              }
              
    // Handle Tab or Enter key to accept completion or focused option
    if (key === "Tab" || key === "Enter") {
      e.preventDefault();
      if (focusedIndex !== null && availableCompletions[focusedIndex]) {
        // Select focused option
        selectCompletion(availableCompletions[focusedIndex]);
      } else if (suggestion && currentNode) {
        // Accept current suggestion
        const node = currentNode.walk_to(TAB);
        setText(node.full_text);
        setCurrentNode(node);
        setSuggestion(node.completion || "");
        // Refocus the input
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }
    }
            },
              style: {
                ...styles.input,
                caretColor: "#007AFF",
                color: "rgba(0,0,0,0.01)", // Almost transparent but allows cursor
              },
            })}
          />
          <View style={styles.inputContainer} pointerEvents="none">
            <Text style={styles.visibleText}>{text}</Text>
            {suggestion && (
              <Text style={styles.suggestionText}>{suggestion}</Text>
            )}
          </View>
        </View>

        {availableCompletions.length > 0 && (
          <View style={styles.dropdownContainer}>
            <ScrollView 
              style={styles.completionsList}
              nestedScrollEnabled={true}
            >
            {availableCompletions.map((completion, index) => (
              <View
                key={index}
                style={[
                  styles.completionItem,
                  focusedIndex === index && styles.completionItemFocused,
                ]}
                onTouchStart={() => selectCompletion(completion)}
              >
                <View style={styles.highlightContainer}>
                  <Text style={styles.completionTyped}>{completion.typedPrefix}</Text>
                </View>
                <Text style={styles.completionRemainingPrefix}>{completion.remainingPrefix}</Text>
                <Text style={styles.completionPostfix}>{completion.completion}</Text>
              </View>
            ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
    alignSelf: "flex-start",
  },
  spacer: {
    flex: 0.35,
  },
  autocompleteWrapper: {
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
  inputWrapper: {
    position: "relative",
    width: "100%",
  },
  inputContainer: {
    position: "absolute",
    left: 12,
    top: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    pointerEvents: "none",
    zIndex: 1,
  },
  visibleText: {
    fontSize: 16,
    color: "#000",
  },
  suggestionText: {
    fontSize: 16,
    color: "#999",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    minHeight: 44,
    color: Platform.OS === "web" ? "rgba(0,0,0,0.01)" : "rgba(0,0,0,0.01)", // Almost transparent but allows cursor
  },
  dropdownContainer: {
    marginTop: 4,
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // For Android
    maxHeight: 300,
    width: "100%",
    overflow: "hidden",
  },
  completionsList: {
    maxHeight: 300,
  },
  completionItem: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    alignItems: "center",
    cursor: "pointer",
  },
  completionItemFocused: {
    backgroundColor: "#f5f5f5",
  },
  highlightContainer: {
    backgroundColor: "#e3f2fd", // Light blue background to highlight
    borderRadius: 3,
    paddingHorizontal: 0,
  },
  completionTyped: {
    fontSize: 14,
    color: "#000", // Black for typed portion of prefix
  },
  completionRemainingPrefix: {
    fontSize: 14,
    color: "#000", // Black for rest of prefix
  },
  completionPostfix: {
    fontSize: 14,
    color: "#999", // Grey for completion
  },
});

