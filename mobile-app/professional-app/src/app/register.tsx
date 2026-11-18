import { registerProfessionalSchema } from "@homecare/contracts";
import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { TextField } from "@/components/TextField";
import { AvailabilityGrid, everyDay } from "@/features/profile/AvailabilityGrid";
import { CategoryPicker, parsePincodes } from "@/features/profile/CategoryPicker";
import { useRegister, useSignOut } from "@/features/session/hooks";
import { ApiError, errorMessage } from "@/services/api/client";
import { colors, layout, space } from "@/theme";

/**
 * Registration (first sign-in on a number operations hasn't registered): name, services, pincodes
 * and weekly availability. Creates the profile as "pending verification" — Homecare staff verify.
 */
export default function RegisterScreen() {
  const router = useRouter();
  const register = useRegister();
  const signOut = useSignOut();
  const [fullName, setFullName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [pins, setPins] = useState("");
  const [availability, setAvailability] = useState(everyDay());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const parsed = registerProfessionalSchema.safeParse({ fullName, categories, pincodes: parsePincodes(pins), availability });
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const i of parsed.error.issues) e[String(i.path[0])] ??= i.message;
      setErrors(e);
      return;
    }
    setErrors({});
    register.mutate(parsed.data, { onSuccess: () => router.replace("/") });
  };
  const server = register.error instanceof ApiError ? register.error.fields ?? {} : {};

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AppText variant="display-md" accessibilityRole="header">
            Set up your profile
          </AppText>
          <AppText color="textSecondary">Tell us what you do and where. Homecare will verify you before you receive jobs.</AppText>

          <TextField label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" textContentType="name" error={errors.fullName} />

          <View style={styles.field}>
            <AppText variant="label">Services you offer</AppText>
            <CategoryPicker value={categories} onChange={setCategories} />
            {errors.categories || server.categories ? (
              <AppText variant="body-sm" color="error">
                {errors.categories ?? server.categories}
              </AppText>
            ) : null}
          </View>

          <TextField
            label="Pincodes you can work in"
            value={pins}
            onChangeText={setPins}
            keyboardType="numbers-and-punctuation"
            placeholder="600020, 600041"
            hint="Only areas you can reliably reach."
            error={errors.pincodes}
          />

          <View style={styles.field}>
            <AppText variant="label">When you can work</AppText>
            <AvailabilityGrid value={availability} onChange={setAvailability} />
          </View>

          {register.error && !Object.keys(server).length ? <Notice tone="error">{errorMessage(register.error)}</Notice> : null}
          <PrimaryButton label="Submit for verification" block loading={register.isPending} onPress={submit} />
          <SecondaryButton label="Sign out" block onPress={() => signOut.mutate(undefined, { onSuccess: () => router.replace("/sign-in") })} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  flex: { flex: 1 },
  content: { padding: layout.gutter, gap: space[5], paddingBottom: space[10] },
  field: { gap: space[2] },
});
