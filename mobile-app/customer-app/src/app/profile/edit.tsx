import { zodResolver } from "@hookform/resolvers/zod";
import { formatPhone, updateCustomerSchema } from "@homecare/contracts";
import { useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { ScreenHeader } from "@/components/ScreenHeader";
import { LoadingState } from "@/components/States";
import { TextField } from "@/components/TextField";
import { useUpdateProfile } from "@/features/profile/hooks";
import { useSession } from "@/features/profile/session";
import { errorMessage } from "@/services/api/client";
import { colors, layout, radius, space } from "@/theme";

const schema = updateCustomerSchema.required({ fullName: true });

export default function EditProfileScreen() {
  const { customer } = useSession();
  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title="Personal information" />
      {customer ? <ProfileForm key={customer.id} fullName={customer.fullName ?? ""} email={customer.email ?? ""} phone={customer.phone} /> : <LoadingState label="Loading profile" />}
    </SafeAreaView>
  );
}

function ProfileForm({ fullName, email, phone }: { fullName: string; email: string; phone: string }) {
  const router = useRouter();
  const update = useUpdateProfile();
  const { control, handleSubmit, formState } = useForm({ resolver: zodResolver(schema), defaultValues: { fullName, email } });
  const submit = handleSubmit((values) => update.mutate(values, { onSuccess: () => router.back() }));

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Controller
          control={control}
          name="fullName"
          render={({ field }) => (
            <TextField label="Full name" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} autoComplete="name" textContentType="name" error={formState.errors.fullName?.message} />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              label="Email (optional)"
              value={field.value ?? ""}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={formState.errors.email?.message}
            />
          )}
        />
        <View style={styles.phone}>
          <AppText variant="label">Mobile number</AppText>
          <AppText>{formatPhone(phone)}</AppText>
          <AppText variant="body-sm" color="textSecondary">
            Your number is how you sign in, so it can&apos;t be edited here.
          </AppText>
        </View>
        {update.error ? <Notice tone="error">{errorMessage(update.error)}</Notice> : null}
        <PrimaryButton label="Save" block loading={update.isPending} onPress={() => submit()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  flex: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingBottom: space[8], gap: space[5] },
  phone: { gap: space[1], padding: space[4], borderRadius: radius.md, backgroundColor: colors.stone },
});
