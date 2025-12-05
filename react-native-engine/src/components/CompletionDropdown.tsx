import React from "react";
import { View, ScrollView, StyleSheet, ViewStyle } from "react-native";
import CompletionDropdownOption from "./CompletionDropdownOption";
import { Theme } from "../theme/Theme";

interface CompletionDropdownProps {
  completions: Array<{
    typedPrefix: string;
    remainingPrefix: string;
    completion: string;
  }>;
  focusedIndex: number | null;
  tabSelectableIndex?: number | null;
  onSelect: (completion: {
    typedPrefix: string;
    remainingPrefix: string;
    completion: string;
  }) => void;
  styles?: {
    dropdownContainer?: ViewStyle;
    completionsList?: ViewStyle;
  };
  optionStyles?: {
    completionItem?: ViewStyle;
    completionItemFocused?: ViewStyle;
    highlightContainer?: ViewStyle;
    completionTyped?: any;
    completionRemainingPrefix?: any;
    completionPostfix?: any;
  };
  theme?: Theme;
}

export default function CompletionDropdown({
  completions,
  focusedIndex,
  tabSelectableIndex,
  onSelect,
  styles: customStyles,
  optionStyles,
  theme,
}: CompletionDropdownProps) {
  if (completions.length === 0) {
    return null;
  }

  const themeStyles = theme?.styles || defaultStyles;
  const mergedStyles = {
    dropdownContainer: [themeStyles.dropdownContainer, customStyles?.dropdownContainer],
    completionsList: [themeStyles.completionsList, customStyles?.completionsList],
  };

  return (
    <View style={mergedStyles.dropdownContainer}>
      <ScrollView style={mergedStyles.completionsList} nestedScrollEnabled={true}>
        {completions.map((completion, index) => (
          <CompletionDropdownOption
            key={index}
            completion={completion}
            index={index}
            isFocused={focusedIndex === index}
            isTabSelectable={tabSelectableIndex === index}
            onSelect={onSelect}
            styles={optionStyles}
            theme={theme}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const defaultStyles = StyleSheet.create({
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
});

