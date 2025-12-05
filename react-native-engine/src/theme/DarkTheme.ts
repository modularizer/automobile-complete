import { Theme, ThemeStyles } from "./Theme";

export class DarkTheme extends Theme {
  name = "dark";

  styles: ThemeStyles = {
    // AutocompleteInput styles
    inputWrapper: {
      position: "relative",
      width: "100%",
    },
    input: {
      borderWidth: 1,
      borderColor: "#444",
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      backgroundColor: "#1e1e1e",
      minHeight: 44,
      color: "rgba(255,255,255,0.01)", // Almost transparent but allows cursor
    },
    visibleText: {
      fontSize: 16,
      color: "#fff",
    },
    suggestionText: {
      fontSize: 16,
      color: "#888",
    },

    // CompletionDropdown styles
    dropdownContainer: {
      marginTop: 4,
      backgroundColor: "#1e1e1e",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#444",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3, // For Android
      maxHeight: 300,
      width: "100%",
      overflow: "hidden",
    },
    completionsList: {
      maxHeight: 300,
    },

    // CompletionDropdownOption styles
    completionItem: {
      flexDirection: "row",
      paddingVertical: 4,
      paddingHorizontal: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#333",
      alignItems: "center",
      cursor: "pointer",
    },
    completionItemFocused: {
      backgroundColor: "#2a2a2a",
    },
    highlightContainer: {
      backgroundColor: "#1a3a5a", // Dark blue background to highlight
      borderRadius: 3,
      paddingHorizontal: 0,
    },
    completionTyped: {
      fontSize: 14,
      color: "#fff", // White for typed portion of prefix
    },
    completionRemainingPrefix: {
      fontSize: 14,
      color: "#fff", // White for rest of prefix
    },
    completionPostfix: {
      fontSize: 14,
      color: "#888", // Light grey for completion
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
      backgroundColor: "#121212",
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
      color: "#e0e0e0",
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
      borderColor: "#444",
      borderRadius: 6,
      backgroundColor: "#1e1e1e",
      minWidth: 120,
      justifyContent: "space-between",
    },
    themeSelectorTriggerText: {
      fontSize: 14,
      color: "#e0e0e0",
    },
    themeSelectorArrow: {
      fontSize: 10,
      color: "#888",
      marginLeft: 8,
    },
    themeSelectorDropdown: {
      position: "absolute",
      top: "100%",
      right: 0,
      marginTop: 4,
      backgroundColor: "#1e1e1e",
      borderRadius: 6,
      borderWidth: 1,
      borderColor: "#444",
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 3,
      minWidth: 120,
      overflow: "hidden",
    },
    themeSelectorOption: {
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: "#333",
      cursor: "pointer",
    },
    themeSelectorOptionText: {
      fontSize: 14,
      color: "#e0e0e0",
    },
    themeSelectorOptionSelected: {
      // No special background, just indicate with text style
    },
    themeSelectorOptionTextSelected: {
      fontWeight: "600",
      color: "#fff",
    },
  };
}

