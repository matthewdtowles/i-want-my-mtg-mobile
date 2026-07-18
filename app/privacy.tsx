import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { useThemedStyles } from "../lib/theme/ThemeContext";
import type { ThemeColors } from "../lib/theme/colors";

// Mirrors the web privacy policy (iwantmymtg.net/privacy). A few client-specific
// lines are adapted for the native app (e.g. session tokens are stored in the
// device keychain rather than a browser cookie).
const LAST_UPDATED = "April 14, 2026";

type Block =
  | { type: "p"; text: string }
  | { type: "bullets"; items: { label?: string; text: string }[] };

type Section = { heading: string; blocks: Block[] };

const INTRO =
  'This policy explains what data I Want My MTG ("the Service") collects, why ' +
  "it's collected, and what you can do about it. Plain language, no surprises.";

const SECTIONS: Section[] = [
  {
    heading: "Who runs this",
    blocks: [
      {
        type: "p",
        text: "I Want My MTG is operated by Matthew Towles, an individual based in Maryland, USA. You can reach me at legal@iwantmymtg.net.",
      },
    ],
  },
  {
    heading: "What I collect",
    blocks: [
      {
        type: "bullets",
        items: [
          {
            label: "Account data",
            text: "your email address, display name, and a hashed password. Passwords are never stored in plain text.",
          },
          {
            label: "Collection data",
            text: "cards you add to your inventory, transactions you record, and price alerts you configure. This data is tied to your account.",
          },
          {
            label: "Technical data",
            text: "your IP address is read in memory to enforce API rate limits. It is not written to our database or server logs.",
          },
        ],
      },
      {
        type: "p",
        text: "I do not collect analytics, set tracking cookies, or load any third-party tracking scripts.",
      },
    ],
  },
  {
    heading: "How I use it",
    blocks: [
      {
        type: "bullets",
        items: [
          { text: "To provide the collection tracking features you signed up for." },
          {
            text: "To send transactional email: account verification, password reset, and price-alert notifications you opted into.",
          },
          {
            text: "To protect the service from abuse (rate limiting, preventing account takeover).",
          },
        ],
      },
      {
        type: "p",
        text: "I never sell your data. I do not share it for advertising, and I do not run ads.",
      },
    ],
  },
  {
    heading: "Third parties involved",
    blocks: [
      {
        type: "p",
        text: "Running the Service requires a small number of service providers. They only receive the data they need to do their job.",
      },
      {
        type: "bullets",
        items: [
          {
            label: "Amazon Web Services",
            text: "hosts the application and database (United States).",
          },
          { label: "Amazon SES", text: "delivers transactional email." },
          {
            label: "Scryfall",
            text: "card images are loaded directly from scryfall.com by the app.",
          },
          {
            label: "Expo",
            text: "delivers push notifications you opt into, via Expo's push service.",
          },
          {
            label: "TCGPlayer (via Impact)",
            text: 'only involved when you tap a "Buy on TCGPlayer" link. Their site receives standard referral information and, if you make a purchase, the Service may earn a commission at no additional cost to you.',
          },
        ],
      },
    ],
  },
  {
    heading: "Sessions and on-device storage",
    blocks: [
      {
        type: "p",
        text: "The app stores your session tokens in the device's secure keychain (iOS) or keystore (Android) so you stay signed in. No advertising or analytics identifiers are stored.",
      },
      {
        type: "p",
        text: "Some preferences (theme, view options) are stored locally on your device and are not transmitted.",
      },
    ],
  },
  {
    heading: "How long I keep your data",
    blocks: [
      {
        type: "p",
        text: "Account and collection data is retained as long as your account is active. If you delete your account, your user record and related collection data (inventory, transactions, price alerts, notifications) are removed. Unverified pending-registration records expire automatically.",
      },
    ],
  },
  {
    heading: "Your choices",
    blocks: [
      {
        type: "bullets",
        items: [
          {
            label: "Access",
            text: "your inventory, transactions, and account details are visible to you inside the app.",
          },
          {
            label: "Export",
            text: "request a JSON copy of your account, inventory, transactions, and price alerts by emailing legal@iwantmymtg.net.",
          },
          {
            label: "Deletion",
            text: "you can delete your account from the Account screen at any time.",
          },
          {
            label: "Email",
            text: "you can disable price-alert emails by toggling or deleting your alerts. Transactional emails tied to account security (verification, password reset) cannot be disabled while the account is active.",
          },
        ],
      },
    ],
  },
  {
    heading: "California residents",
    blocks: [
      {
        type: "p",
        text: "If you are a California resident, the California Consumer Privacy Act gives you the right to know what personal information is collected, request its deletion, and not be discriminated against for exercising these rights. The rights above (Access, Export, Deletion) apply to you without any additional process.",
      },
    ],
  },
  {
    heading: "Children",
    blocks: [
      {
        type: "p",
        text: "The Service is not directed at children under 13 and I do not knowingly collect personal information from them. If you believe a child has created an account, contact me and I will remove it.",
      },
    ],
  },
  {
    heading: "Changes to this policy",
    blocks: [
      {
        type: "p",
        text: 'If this policy changes in a meaningful way, the updated version will be posted here with a new "Last updated" date. For material changes I will also email active users.',
      },
    ],
  },
  {
    heading: "Contact",
    blocks: [
      { type: "p", text: "Questions or requests: legal@iwantmymtg.net." },
    ],
  },
];

export default function PrivacyScreen() {
  const styles = useThemedStyles(createStyles);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: "Privacy Policy" }} />
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.updated}>Last updated: {LAST_UPDATED}</Text>
      <Text style={styles.paragraph}>{INTRO}</Text>

      {SECTIONS.map((section) => (
        <View key={section.heading} style={styles.section}>
          <Text style={styles.heading}>{section.heading}</Text>
          {section.blocks.map((block, i) =>
            block.type === "p" ? (
              <Text key={i} style={styles.paragraph}>
                {block.text}
              </Text>
            ) : (
              <View key={i} style={styles.bullets}>
                {block.items.map((item, j) => (
                  <View key={j} style={styles.bulletRow}>
                    <Text style={styles.bulletDot}>{"•"}</Text>
                    <Text style={styles.bulletText}>
                      {item.label ? (
                        <Text style={styles.bulletLabel}>{item.label} — </Text>
                      ) : null}
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>
            ),
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: { backgroundColor: colors.background },
    content: { padding: 20, paddingBottom: 40 },
    title: { fontSize: 24, fontWeight: "700", color: colors.textPrimary },
    updated: { fontSize: 13, color: colors.textMuted, marginTop: 4, marginBottom: 16 },
    section: { marginTop: 20 },
    heading: {
      fontSize: 17,
      fontWeight: "600",
      color: colors.textPrimary,
      marginBottom: 8,
    },
    paragraph: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
      marginTop: 8,
    },
    bullets: { marginTop: 8, gap: 6 },
    bulletRow: { flexDirection: "row", gap: 8 },
    bulletDot: { color: colors.textMuted, fontSize: 15, lineHeight: 22 },
    bulletText: { flex: 1, fontSize: 15, color: colors.textSecondary, lineHeight: 22 },
    bulletLabel: { color: colors.textPrimary, fontWeight: "600" },
  });
