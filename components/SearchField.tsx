import { StyleSheet, TextInput, type StyleProp, type ViewStyle } from "react-native";

import { useTheme, useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

/**
 * The shared search input used on every card-list screen, so search looks and
 * behaves the same everywhere (callers own state + debouncing).
 */
export function SearchField({
  value,
  onChangeText,
  placeholder,
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <TextInput
      style={[styles.input, style]}
      placeholder={placeholder}
      placeholderTextColor={colors.placeholder}
      value={value}
      onChangeText={onChangeText}
      autoCapitalize="none"
      autoCorrect={false}
      clearButtonMode="while-editing"
      returnKeyType="search"
    />
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    input: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
      fontSize: 15,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
  });
