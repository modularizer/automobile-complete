import React from "react";
import { View, StyleSheet, TextInput, ViewStyle, TextStyle } from "react-native";
import AutocompleteInput from "./AutocompleteInput";
import CompletionDropdown from "./CompletionDropdown";
import { AutocompleteTextController, CompletionOption } from "../engine/AutocompleteTextController";
import { Theme } from "../theme/Theme";

interface AutocompleteFieldProps {
  controller: AutocompleteTextController;
  inputRef: React.RefObject<TextInput | null>;
  showDropdown?: boolean;
  theme?: Theme;
  styles?: {
    autocompleteWrapper?: ViewStyle;
    input?: {
      inputWrapper?: ViewStyle;
      input?: TextStyle;
      visibleText?: TextStyle;
      suggestionText?: TextStyle;
    };
    dropdown?: {
      dropdownContainer?: ViewStyle;
      completionsList?: ViewStyle;
      option?: {
        completionItem?: ViewStyle;
        completionItemFocused?: ViewStyle;
        highlightContainer?: ViewStyle;
        completionTyped?: TextStyle;
        completionRemainingPrefix?: TextStyle;
        completionPostfix?: TextStyle;
      };
    };
  };
}

export default function AutocompleteField({
  controller,
  inputRef,
  showDropdown = true,
  theme,
  styles: customStyles,
}: AutocompleteFieldProps) {
  const themeStyles = theme?.styles || defaultStyles;
  const mergedStyles = {
    autocompleteWrapper: [themeStyles.autocompleteWrapper, customStyles?.autocompleteWrapper],
  };

  return (
    <View style={mergedStyles.autocompleteWrapper}>
      <AutocompleteInput
        text={controller.text}
        suggestion={controller.suggestion}
        onChangeText={controller.handleTextChange}
        onKeyPress={controller.handleKeyPress}
        inputRef={inputRef}
        maxLines={controller.maxLines}
        theme={theme}
        styles={customStyles?.input}
      />

      {showDropdown && (
        <CompletionDropdown
          completions={controller.availableCompletions}
          focusedIndex={controller.focusedIndex}
          tabSelectableIndex={controller.tabSelectableIndex}
          onSelect={controller.selectCompletion}
          theme={theme}
          styles={customStyles?.dropdown}
          optionStyles={customStyles?.dropdown?.option}
        />
      )}
    </View>
  );
}

const defaultStyles = StyleSheet.create({
  autocompleteWrapper: {
    maxWidth: 600,
    width: "100%",
    alignSelf: "center",
  },
});

