import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TextInput, Appearance } from "react-native";
import AutocompleteField from "./AutocompleteField";
import { AutocompleteTextController } from "../engine/AutocompleteTextController";
import { LightTheme, DarkTheme, Theme } from "../theme";
import ThemeSelector, { ThemeMode } from "./ThemeSelector";
import { ConfigCacheController } from "../utils/ConfigCacheController";

// Sample completion list data
const SAMPLE_COMPLETIONS = `
We|lcome! to "automobile-complete".  #5
Th|is project demos a fast, offline, super dumb autocompletion method  #5
Basic|ally, we preprocess a completion tree using python  #5
Th|en, we can load in our list and use it with a text controller  #5
Is it the best solution?| no. probably not  #5
Is it super si|mple to hardcode the exact completions you want? Yes.  #5
Is it customiz|able? Yes.  #5
Se|e more at https://github.com/modularizer/automobile-complete  #5


`;

interface AutocompleteDemoProps {
  completionList?: string;
  maxCompletions?: number;
  theme?: Theme;
  darkMode?: boolean;
  showThemeSelector?: boolean;
}

export default function AutocompleteDemo({
  completionList = SAMPLE_COMPLETIONS,
  maxCompletions,
  theme: providedTheme,
  darkMode,
  showThemeSelector = true,
}: AutocompleteDemoProps) {
  console.log("[AutocompleteDemo] Component rendering, completionList length:", completionList.length);
  const [controller] = useState(() => {
    console.log("[AutocompleteDemo] Creating controller with completionList");
    return new AutocompleteTextController(completionList, {
      maxCompletions,
      tabBehavior: "select-best", // Default
    });
  });
  const [updateTrigger, setUpdateTrigger] = useState(0);
  const inputRef = useRef<TextInput | null>(null);
  
  // Create theme config controller
  const themeConfigController = React.useMemo(
    () =>
      new ConfigCacheController<ThemeMode>({
        key: "automobile-complete-theme",
        defaultValue: "system",
        urlParamName: "theme",
        validate: (value): value is ThemeMode => {
          return value === "light" || value === "dark" || value === "system";
        },
      }),
    []
  );

  const [themeMode, setThemeMode] = useState<ThemeMode>(() =>
    themeConfigController.getValueSync()
  );
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);
  const [systemColorScheme, setSystemColorScheme] = useState<string | null>(
    Appearance.getColorScheme() || null
  );

  // Initialize theme from config controller (URL param -> storage -> default)
  useEffect(() => {
    const initializeTheme = async () => {
      const theme = await themeConfigController.getValue();
      setThemeMode(theme);
      setIsThemeLoaded(true);
    };

    initializeTheme();
  }, [themeConfigController]);

  // Save theme to storage when it changes
  useEffect(() => {
    if (isThemeLoaded) {
      themeConfigController.setValue(themeMode);
    }
  }, [themeMode, isThemeLoaded, themeConfigController]);

  // Listen to system theme changes
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme || null);
    });
    return () => subscription.remove();
  }, []);

  // Determine active theme based on mode
  const getActiveTheme = (): Theme => {
    if (providedTheme) return providedTheme;
    if (darkMode !== undefined) return darkMode ? new DarkTheme() : new LightTheme();
    
    // Use themeMode
    if (themeMode === "light") return new LightTheme();
    if (themeMode === "dark") return new DarkTheme();
    
    // System mode - use system color scheme
    return systemColorScheme === "dark" ? new DarkTheme() : new LightTheme();
  };

  const activeTheme = React.useMemo(() => getActiveTheme(), [
    providedTheme,
    darkMode,
    themeMode,
    systemColorScheme,
  ]);

  // Subscribe to controller changes
  useEffect(() => {
    controller.setInputRef(inputRef);
    const unsubscribe = controller.subscribe(() => {
      setUpdateTrigger((prev) => prev + 1);
    });
    return unsubscribe;
  }, [controller]);

  // Reinitialize if completionList changes
  useEffect(() => {
    controller.initializeTrie(completionList);
  }, [completionList, controller]);

  return (
    <View style={activeTheme.styles.demoContainer}>
      <View style={activeTheme.styles.demoHeader}>
        <Text style={activeTheme.styles.demoTitle}>Automobile-Complete</Text>
        {showThemeSelector && (
          <ThemeSelector
            currentMode={themeMode}
            onModeChange={setThemeMode}
            systemColorScheme={systemColorScheme}
            theme={activeTheme}
          />
        )}
      </View>
      
      <View style={activeTheme.styles.demoSpacer} />
      
      <AutocompleteField
        controller={controller}
        inputRef={inputRef}
        showDropdown={true}
        theme={activeTheme}
      />
    </View>
  );
}

