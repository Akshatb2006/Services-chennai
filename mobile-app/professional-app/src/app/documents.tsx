import { useQuery } from "@tanstack/react-query";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { SecondaryButton } from "@/components/Button";
import { FileUp } from "@/components/icons";
import { Notice } from "@/components/Notice";
import { ScreenHeader } from "@/components/ScreenHeader";
import { LoadingState } from "@/components/States";
import { proApi } from "@/services/api/pro";
import { queryKeys } from "@/services/api/query-client";
import { colors, layout, radius, space } from "@/theme";

const kinds = [
  { kind: "id_proof", title: "Photo ID", body: "Aadhaar, voter ID, PAN or driving licence" },
  { kind: "address_proof", title: "Address proof", body: "Any recent utility bill or rental agreement" },
  { kind: "skill_certificate", title: "Skill certificate (optional)", body: "Training or trade certificates you have" },
];

/**
 * Document submission. Secure storage isn't connected yet, so uploads are disabled and the screen
 * says so plainly (the API returns 503 for uploads). Verification is always done by Homecare staff.
 */
export default function DocumentsScreen() {
  const docs = useQuery({ queryKey: queryKeys.documents, queryFn: ({ signal }) => proApi.documents(signal) });
  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Verification documents" />
      <ScrollView contentContainerStyle={styles.content}>
        {docs.isPending ? (
          <LoadingState />
        ) : (
          <>
            {!docs.data?.storageConfigured ? <Notice>In-app upload isn&apos;t available yet. Homecare will collect and check these documents with you during verification.</Notice> : null}
            {kinds.map((k) => (
              <View key={k.kind} style={styles.card}>
                <View style={styles.icon}>
                  <FileUp size={20} color={colors.ink} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="heading-sm">{k.title}</AppText>
                  <AppText variant="body-sm" color="textSecondary">
                    {k.body}
                  </AppText>
                </View>
                <SecondaryButton label="Upload" disabled={!docs.data?.storageConfigured} accessibilityHint="Not available yet" />
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  content: { paddingHorizontal: layout.gutter, paddingBottom: space[10], gap: space[3] },
  card: { flexDirection: "row", alignItems: "center", gap: space[3], padding: space[4], borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  icon: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.stone, alignItems: "center", justifyContent: "center" },
  flex: { flex: 1, gap: 2 },
});
