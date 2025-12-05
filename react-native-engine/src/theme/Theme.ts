import { ViewStyle, TextStyle } from "react-native";

export interface ThemeStyles {
  // AutocompleteInput styles
  inputWrapper: ViewStyle;
  input: TextStyle;
  visibleText: TextStyle;
  suggestionText: TextStyle;
  placeholderTextColor?: string;

  // CompletionDropdown styles
  dropdownContainer: ViewStyle;
  completionsList: ViewStyle;

  // CompletionDropdownOption styles
  completionItem: ViewStyle;
  completionItemFocused: ViewStyle;
  highlightContainer: ViewStyle;
  completionTyped: TextStyle;
  completionRemainingPrefix: TextStyle;
  completionPostfix: TextStyle;

  // AutocompleteField styles
  autocompleteWrapper: ViewStyle;

  // Demo page styles
  demoContainer: ViewStyle;
  demoHeader: ViewStyle;
  demoTitle: TextStyle;
  demoSpacer: ViewStyle;

  // ThemeSelector styles
  themeSelectorContainer: ViewStyle;
  themeSelectorTrigger: ViewStyle;
  themeSelectorTriggerText: TextStyle;
  themeSelectorArrow: TextStyle;
  themeSelectorDropdown: ViewStyle;
  themeSelectorOption: ViewStyle;
  themeSelectorOptionText: TextStyle;
  themeSelectorOptionSelected: ViewStyle;
  themeSelectorOptionTextSelected: TextStyle;
}

export abstract class Theme {
  abstract name: string;
  abstract styles: ThemeStyles;

  // Helper method to merge custom styles with theme styles
  mergeStyles<T extends Record<string, any>>(
    themeStyle: T,
    customStyle?: Partial<T>
  ): T {
    if (!customStyle) return themeStyle;
    return { ...themeStyle, ...customStyle };
  }
}

