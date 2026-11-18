import { zodResolver } from "@hookform/resolvers/zod";
import { addressLabels, createAddressSchema, SERVICE_CITY, type Address } from "@homecare/contracts";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/Button";
import { CategoryChip } from "@/components/CategoryChip";
import { Notice } from "@/components/Notice";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextField } from "@/components/TextField";
import { addressLabelNames, useAddresses, useCreateAddress, useUpdateAddress } from "@/features/addresses/hooks";
import { errorMessage } from "@/services/api/client";
import { colors, layout, radius, space } from "@/theme";

/** Add (no id) or edit (?id=) an address. Chennai only for now; serviceability is confirmed per request. */
export default function AddressFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const existing = useAddresses().data?.find((a) => a.id === id);
  const editing = !!id;
  return (
    <SafeAreaView style={styles.root}>
      <ScreenHeader title={editing ? "Edit address" : "Add address"} />
      {editing && !existing ? null : <AddressForm key={existing?.id ?? "new"} id={id} initial={existing} />}
    </SafeAreaView>
  );
}

function AddressForm({ id, initial }: { id?: string; initial?: Address }) {
  const router = useRouter();
  const create = useCreateAddress();
  const update = useUpdateAddress();
  const mutation = id ? update : create;
  const { control, handleSubmit, formState } = useForm({
    resolver: zodResolver(createAddressSchema),
    defaultValues: {
      label: initial?.label ?? "home",
      line1: initial?.line1 ?? "",
      line2: initial?.line2 ?? "",
      landmark: initial?.landmark ?? "",
      pincode: initial?.pincode ?? "",
      city: SERVICE_CITY.city,
      state: SERVICE_CITY.state,
    },
  });
  const e = formState.errors;
  const submit = handleSubmit((values) => {
    const input = { ...values, line2: values.line2 || null, landmark: values.landmark || null };
    const done = { onSuccess: () => router.back() };
    if (id) update.mutate({ id, input }, done);
    else create.mutate(input, done);
  });

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Controller
          control={control}
          name="label"
          render={({ field }) => (
            <View style={styles.field}>
              <AppText variant="label">Save as</AppText>
              <View style={styles.chips} accessibilityRole="tablist">
                {addressLabels.map((l) => (
                  <CategoryChip key={l} label={addressLabelNames[l]} selected={field.value === l} onPress={() => field.onChange(l)} />
                ))}
              </View>
            </View>
          )}
        />
        <Controller
          control={control}
          name="line1"
          render={({ field }) => (
            <TextField label="House / flat and street" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} autoComplete="street-address" textContentType="streetAddressLine1" error={e.line1?.message} />
          )}
        />
        <Controller
          control={control}
          name="line2"
          render={({ field }) => (
            <TextField label="Area (optional)" value={field.value ?? ""} onChangeText={field.onChange} onBlur={field.onBlur} textContentType="streetAddressLine2" error={e.line2?.message} />
          )}
        />
        <Controller
          control={control}
          name="landmark"
          render={({ field }) => <TextField label="Landmark (optional)" value={field.value ?? ""} onChangeText={field.onChange} onBlur={field.onBlur} error={e.landmark?.message} />}
        />
        <Controller
          control={control}
          name="pincode"
          render={({ field }) => (
            <TextField label="Pincode" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} keyboardType="number-pad" maxLength={6} autoComplete="postal-code" textContentType="postalCode" error={e.pincode?.message} />
          )}
        />
        <View style={styles.city}>
          <AppText variant="label">City</AppText>
          <AppText>
            {SERVICE_CITY.city}, {SERVICE_CITY.state}
          </AppText>
          <AppText variant="body-sm" color="textSecondary">
            We currently serve {SERVICE_CITY.city}. Availability for your exact area is confirmed when you send a request.
          </AppText>
        </View>
        {mutation.error ? <Notice tone="error">{errorMessage(mutation.error)}</Notice> : null}
        <PrimaryButton label="Save address" block loading={mutation.isPending} onPress={() => submit()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  flex: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingBottom: space[8], gap: space[5] },
  field: { gap: space[2] },
  chips: { flexDirection: "row", gap: space[2] },
  city: { gap: space[1], padding: space[4], borderRadius: radius.md, backgroundColor: colors.stone },
});
