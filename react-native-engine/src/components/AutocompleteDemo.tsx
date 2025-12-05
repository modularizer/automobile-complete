import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, Appearance } from "react-native";
import AutocompleteField from "./AutocompleteField";
import { AutocompleteTextController } from "../engine/AutocompleteTextController";
import { LightTheme, DarkTheme, Theme } from "../theme";
import ThemeSelector, { ThemeMode } from "./ThemeSelector";
import { ConfigCacheController } from "../utils/ConfigCacheController";
import GithubLink from "./GithubLink";

// Sample completion list data
const SAMPLE_COMPLETIONS = `
We|lcome to "automobile-complete"!
A d|umb, fast, offline, hard-coded autocomplete engine
U|se python to generate a human-readable completionlist
Contr|ol fine-toothed params to adjust what completions you want
The|n, write the hard-coded list to file, and load into Typesript/Javascript
No|w, add a simple text controller
Is it t|he best solution?  no. probably not
It doe|sn't scale well for context-aware completions
It i|s currently more for saving time typing long individual words
h|ippopotamus
BUT: it| can be used as a fallback in addition to your smart stuff
AND| it is FREE, unlike most LLM APIs
Is it c|ustomizable? Definitely
S|ee more at https://github.com/modularizer/automobile-complete
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
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <GithubLink
            url="https://github.com/modularizer/automobile-complete"
            theme={activeTheme}
            size={24}
          />
          <Text style={[activeTheme.styles.demoTitle, { marginLeft: 12 }]}>Automobile-Complete</Text>
        </View>
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

