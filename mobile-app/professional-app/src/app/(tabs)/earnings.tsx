import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Wallet } from "@/components/icons";
import { ScreenContainer } from "@/components/ScreenContainer";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useEarnings } from "@/features/jobs/hooks";
import { errorMessage } from "@/services/api/client";
import { colors, radius, space } from "@/theme";

/**
 * Earnings. Payments and payouts don't exist in the backend yet, so this shows an explicit
 * "not available" state: no balances, estimates or commissions are ever invented.
 */
export default function EarningsScreen() {
  const earnings = useEarnings();
  return (
    <ScreenContainer>
      <AppText variant="display-md" accessibilityRole="header" style={styles.title}>
        Earnings
      </AppText>
      {earnings.isPending ? (
        <LoadingState />
      ) : earnings.isError ? (
        <ErrorState message={errorMessage(earnings.error)} onRetry={() => void earnings.refetch()} />
      ) : (
        <View style={styles.card}>
          <EmptyState icon={Wallet} title="Earnings aren't available yet" body={earnings.data.message} />
          <AppText variant="body-sm" color="textSecondary" style={styles.note}>
            Payment terms for each job are agreed with Homecare directly for now.
          </AppText>
        </View>
      )}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { paddingTop: space[3], marginBottom: space[5] },
  card: { borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, paddingBottom: space[5] },
  note: { textAlign: "center", paddingHorizontal: space[6] },
});
