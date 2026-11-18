import { useRouter } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextField } from "@/components/TextField";
import { CategoryPicker, parsePincodes } from "@/features/profile/CategoryPicker";
import { useMe, useUpdateMe } from "@/features/session/hooks";
import { ApiError, errorMessage } from "@/services/api/client";
import { colors, layout, space } from "@/theme";

export default function EditProfileScreen() {
  const router = useRouter();
  const pro = useMe().data?.professional;
  const update = useUpdateMe();
  const [fullName, setFullName] = useState(pro?.fullName ?? "");
  const [categories, setCategories] = useState(pro?.categories ?? []);
  const [pins, setPins] = useState((pro?.pincodes ?? []).join(", "));
  if (!pro) return null;
  const affected = update.error instanceof ApiError && update.error.code === "affects_assignments" ? Object.values(update.error.fields ?? {}) : [];

  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Services & areas" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextField label="Full name" value={fullName} onChangeText={setFullName} autoComplete="name" />
          <View style={styles.field}>
            <AppText variant="label">Services you offer</AppText>
            <CategoryPicker value={categories} onChange={setCategories} />
          </View>
          <TextField label="Pincodes you can work in" value={pins} onChangeText={setPins} keyboardType="numbers-and-punctuation" hint="Comma separated, e.g. 600020, 600041" />
          <Notice>Your verification status can only be changed by Homecare.</Notice>
          {update.error ? (
            <Notice tone="error">
              {errorMessage(update.error)}
              {affected.length ? `\n${affected.map((a) => `• ${a}`).join("\n")}` : ""}
            </Notice>
          ) : null}
          <PrimaryButton label="Save" block loading={update.isPending} onPress={() => update.mutate({ fullName, categories, pincodes: parsePincodes(pins) }, { onSuccess: () => router.back() })} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  flex: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingBottom: space[10], gap: space[5] },
  field: { gap: space[2] },
});
