import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle, TextStyle } from "react-native";
import { Theme } from "../theme/Theme";

interface CompletionDropdownOptionProps {
  completion: {
    typedPrefix: string;
    remainingPrefix: string;
    completion: string;
  };
  index: number;
  isFocused: boolean;
  isTabSelectable?: boolean;
  onSelect: (completion: {
    typedPrefix: string;
    remainingPrefix: string;
    completion: string;
  }) => void;
  styles?: {
    completionItem?: ViewStyle;
    completionItemFocused?: ViewStyle;
    highlightContainer?: ViewStyle;
    completionTyped?: TextStyle;
    completionRemainingPrefix?: TextStyle;
    completionPostfix?: TextStyle;
  };
  theme?: Theme;
}

export default function CompletionDropdownOption({
  completion,
  index,
  isFocused,
  isTabSelectable = false,
  onSelect,
  styles: customStyles,
  theme,
}: CompletionDropdownOptionProps) {
  const themeStyles = theme?.styles || defaultStyles;
  const mergedStyles = {
    completionItem: [themeStyles.completionItem, customStyles?.completionItem],
    completionItemFocused: [
      themeStyles.completionItemFocused,
      customStyles?.completionItemFocused,
    ],
    highlightContainer: [
      themeStyles.highlightContainer,
      customStyles?.highlightContainer,
    ],
    completionTyped: [themeStyles.completionTyped, customStyles?.completionTyped],
    completionRemainingPrefix: [
      themeStyles.completionRemainingPrefix,
      customStyles?.completionRemainingPrefix,
    ],
    completionPostfix: [themeStyles.completionPostfix, customStyles?.completionPostfix],
  };

  // Style as focused if actually focused OR if it's the tab-selectable option
  const shouldShowFocused = isFocused || isTabSelectable;

  return (
    <TouchableOpacity
      key={index}
      style={[
        mergedStyles.completionItem,
        shouldShowFocused && mergedStyles.completionItemFocused,
      ]}
      onPress={() => onSelect(completion)}
      activeOpacity={0.7}
    >
      {completion.typedPrefix ? (
        <View style={mergedStyles.highlightContainer}>
          <Text style={mergedStyles.completionTyped}>{completion.typedPrefix}</Text>
        </View>
      ) : null}
      {completion.remainingPrefix ? (
        <Text style={mergedStyles.completionRemainingPrefix}>
          {completion.remainingPrefix}
        </Text>
      ) : null}
      {completion.completion ? (
        <Text style={mergedStyles.completionPostfix}>{completion.completion}</Text>
      ) : null}
    </TouchableOpacity>
  );
}

const defaultStyles = StyleSheet.create({
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

