import { Theme, ThemeStyles } from "./Theme";

export class LightTheme extends Theme {
  name = "light";

  styles: ThemeStyles = {
    // AutocompleteInput styles
    inputWrapper: {
      position: "relative",
      width: "100%",
    },
    input: {
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      lineHeight: 20, // Match line height for proper single-line start
      backgroundColor: "#fff",
      color: "rgba(0,0,0,0.01)", // Almost transparent but allows cursor
      // Height will be controlled dynamically for multiline expansion
    },
    visibleText: {
      fontSize: 16,
      lineHeight: 20, // Match input lineHeight
      color: "#000",
    },
    suggestionText: {
      fontSize: 16,
      lineHeight: 20, // Match input lineHeight
      color: "#999",
    },
    placeholderTextColor: "#999",

    // CompletionDropdown styles
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
      maxHeight: 500,
      width: "100%",
      overflow: "hidden",
    },
    completionsList: {
      maxHeight: 500,
    },

    // CompletionDropdownOption styles
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

    // AutocompleteField styles
    autocompleteWrapper: {
      maxWidth: 600,
      width: "100%",
      alignSelf: "center",
    },

    // Demo page styles
    demoContainer: {
      flex: 1,
      padding: 20,
      backgroundColor: "#fff",
    },
    demoHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 40,
      width: "100%",
      overflow: "visible",
      zIndex: 1,
    },
    demoTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: "#000",
    },
    demoSpacer: {
      flex: 0.35,
    },

    // ThemeSelector styles
    themeSelectorContainer: {
      position: "relative",
    },
    themeSelectorTrigger: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 6,
      backgroundColor: "#fff",
      minWidth: 120,
      justifyContent: "space-between",
    },
    themeSelectorTriggerText: {
      fontSize: 14,
      color: "#333",
    },
    themeSelectorArrow: {
      fontSize: 10,
      color: "#666",
      marginLeft: 8,
    },
    themeSelectorDropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      marginTop: 4,
      backgroundColor: "#fff",
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "#ddd",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      minWidth: 120,
      overflow: "hidden",
    },
    themeSelectorOption: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#f0f0f0",
      cursor: "pointer",
    },
    themeSelectorOptionText: {
      fontSize: 14,
      color: "#333",
    },
    themeSelectorOptionSelected: {
      // No special background, just indicate with text style
    },
    themeSelectorOptionTextSelected: {
      fontWeight: "600",
      color: "#000",
    },
  };
}

