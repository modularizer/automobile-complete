import React, { useRef, useState } from "react";
import { View, TextInput, Text, StyleSheet, Platform, ViewStyle, TextStyle } from "react-native";
import { Theme } from "../theme/Theme";

interface AutocompleteInputProps {
  text: string;
  suggestion: string;
  onChangeText: (text: string) => void;
  onKeyPress: (e: any) => void;
  onSelectionChange?: (selection: { start: number; end: number }) => void;
  onArrowDown?: () => void;
  onArrowUp?: () => void;
  onTabOrEnter?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  maxLines?: number | null;
  theme?: Theme;
  styles?: {
    inputWrapper?: ViewStyle;
    input?: TextStyle;
    visibleText?: TextStyle;
    suggestionText?: TextStyle;
  };
}

export default function AutocompleteInput({
  text,
  suggestion,
  onChangeText,
  onKeyPress,
  onSelectionChange,
  onArrowDown,
  onArrowUp,
  onTabOrEnter,
  inputRef: externalInputRef,
  maxLines,
  theme,
  styles: customStyles,
}: AutocompleteInputProps) {
  const internalInputRef = useRef<TextInput>(null);
  const inputRef = externalInputRef || internalInputRef;
  const [inputHeight, setInputHeight] = useState<number | undefined>(undefined);
  
  const themeStyles = theme?.styles || defaultStyles;
  const isMultiline = maxLines === null || maxLines > 1;

  const mergedStyles = {
    inputWrapper: [themeStyles.inputWrapper, customStyles?.inputWrapper],
    input: [themeStyles.input, customStyles?.input],
    visibleText: [themeStyles.visibleText, customStyles?.visibleText],
    suggestionText: [themeStyles.suggestionText, customStyles?.suggestionText],
  };

  console.log("[AutocompleteInput] Rendering with text:", text, "suggestion:", suggestion);
  
  return (
    <View style={mergedStyles.inputWrapper}>
      <TextInput
        ref={inputRef}
        style={[
          mergedStyles.input,
          isMultiline && inputHeight !== undefined && { height: inputHeight },
        ]}
        value={text}
        onChangeText={(newText) => {
          // console.log("[AutocompleteInput] onChangeText called with:", newText);
          onChangeText(newText);
        }}
        onContentSizeChange={(e) => {
          if (isMultiline) {
            const { height } = e.nativeEvent.contentSize;
            setInputHeight(Math.max(height, 20)); // Minimum height of one line
          }
        }}
        onKeyPress={(e) => {
          const key = e.nativeEvent?.key || e.key;
          if (key === "Enter" && isMultiline) {
            return;
          }
          onKeyPress(e);
        }}
        onSelectionChange={(e) => {
          const { start, end } = e.nativeEvent.selection;
          onSelectionChange?.({ start, end });
        }}
        placeholder="Start typing..."
        placeholderTextColor={themeStyles.placeholderTextColor || "#999"}
        autoFocus
        multiline={isMultiline}
        scrollEnabled={false}
        textAlignVertical="top"
        selectionColor="#007AFF"
        {...(Platform.OS === "ios" && { cursorColor: "#007AFF" })}
        {...(Platform.OS === "android" && { underlineColorAndroid: "transparent" })}
        {...(Platform.OS === "web" && {
          style: [
            mergedStyles.input,
            isMultiline && inputHeight !== undefined && { height: inputHeight },
            {
              caretColor: "#007AFF",
              overflow: "hidden", // Prevent scrolling on web
            },
          ],
        })}
      />
      <View 
        style={defaultStyles.inputContainer}
        pointerEvents="none"
      >
        {isMultiline ? (
          // For multiline, use nested Text components so they flow together
          <Text style={mergedStyles.visibleText}>
            {text}
            {suggestion ? <Text style={mergedStyles.suggestionText}>{suggestion}</Text> : null}
          </Text>
        ) : (
          // For single line, use separate Text components in a row
          <>
            <Text style={mergedStyles.visibleText}>{text}</Text>
            {suggestion ? <Text style={mergedStyles.suggestionText}>{suggestion}</Text> : null}
          </>
        )}
      </View>
    </View>
  );
}

const defaultStyles = StyleSheet.create({
  inputContainer: {
    position: "absolute",
    left: 12,
    top: Platform.OS === "web" ? 15 : 12, // Adjust for web text baseline alignment
    right: 12,
    flexDirection: "row",
    alignItems: "flex-start", // Changed to flex-start for multiline support
    pointerEvents: "none",
    zIndex: 1,
  },
});

