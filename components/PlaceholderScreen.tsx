import { StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  note?: string;
};

/**
 * Temporary screen body used by the v1 tab shell. Each real feature
 * (browse, inventory, transactions, portfolio) replaces its own screen
 * in a later issue; this keeps the navigation shell runnable now.
 */
export function PlaceholderScreen({ title, note }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {note ? <Text style={styles.note}>{note}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  note: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});
