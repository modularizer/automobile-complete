import React, { useState, useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet} from "react-native";
import { Theme } from "../theme";

export type ThemeMode = "system" | "light" | "dark";

interface ThemeSelectorProps {
  currentMode: ThemeMode;
  onModeChange: (mode: ThemeMode) => void;
  systemColorScheme?: string | null;
  theme?: Theme;
}

export default function ThemeSelector({
  currentMode,
  onModeChange,
  systemColorScheme,
  theme,
}: ThemeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<View>(null);
  const dropdownRef = useRef<View>(null);
  const systemLabel = systemColorScheme === "dark" ? "System (Dark)" : "System (Light)";
  
  const options = [
    { value: "system" as ThemeMode, label: systemLabel },
    { value: "light" as ThemeMode, label: "Light" },
    { value: "dark" as ThemeMode, label: "Dark" },
  ];
  
  const currentLabel = options.find((opt) => opt.value === currentMode)?.label || systemLabel;


  const handleSelect = (value: ThemeMode) => {
    onModeChange(value);
    setIsOpen(false);
  };

  const themeStyles = theme?.styles || defaultStyles;

  return (
    <View ref={containerRef} style={themeStyles.themeSelectorContainer}>
      <TouchableOpacity
        style={themeStyles.themeSelectorTrigger}
        onPress={() => setIsOpen(!isOpen)}
        activeOpacity={0.7}
      >
        <Text style={themeStyles.themeSelectorTriggerText}>{currentLabel}</Text>
        <Text style={themeStyles.themeSelectorArrow}>{isOpen ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      
      {isOpen && (
        <View ref={dropdownRef} style={themeStyles.themeSelectorDropdown}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                themeStyles.themeSelectorOption,
                currentMode === option.value && themeStyles.themeSelectorOptionSelected,
              ]}
              onPress={() => handleSelect(option.value)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  themeStyles.themeSelectorOptionText,
                  currentMode === option.value && themeStyles.themeSelectorOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const defaultStyles = StyleSheet.create({
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
  themeSelectorOptionSelected: {
    // No special background, just indicate with text style
  },
  themeSelectorOptionText: {
    fontSize: 14,
    color: "#333",
  },
  themeSelectorOptionTextSelected: {
    fontWeight: "600",
    color: "#000",
  },
});

