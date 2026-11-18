import { zodResolver } from "@hookform/resolvers/zod";
import { isServiceSlug, services } from "@homecare/catalog";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { PrimaryButton, SecondaryButton } from "@/components/Button";
import { CategoryChip } from "@/components/CategoryChip";
import { Plus, UserRound } from "@/components/icons";
import { Notice } from "@/components/Notice";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { addressLabelNames, formatAddress, useAddresses } from "@/features/addresses/hooks";
import { useSession } from "@/features/profile/session";
import { useCreateRequest } from "@/features/requests/hooks";
import { newRequestSchema, preferredTimes, upcomingDates, type NewRequestForm, type NewRequestFormInput } from "@/features/requests/schema";
import { ApiError, errorMessage } from "@/services/api/client";
import { colors, layout, radius, space, type } from "@/theme";

/**
 * Send a service request. Submitting creates a request that is *under review* — not a booking.
 * Requires sign-in, a complete profile and a saved address.
 */
export default function NewRequestScreen() {
  const router = useRouter();
  const { isSignedIn, isRestoring, customer } = useSession();

  let body;
  if (isRestoring) body = <LoadingState />;
  else if (!isSignedIn)
    body = (
      <EmptyState
        icon={UserRound}
        title="Sign in to send a request"
        body="We'll text you a code. It only takes a minute, and you can follow your request afterwards."
        action={<PrimaryButton label="Sign in" onPress={() => router.push("/sign-in")} />}
      />
    );
  else if (customer && !customer.profileComplete)
    body = (
      <EmptyState
        icon={UserRound}
        title="Add your name first"
        body="Our team needs to know who they're helping."
        action={<PrimaryButton label="Complete profile" onPress={() => router.push("/profile/edit")} />}
      />
    );
  else body = <RequestForm />;

  return (
    <SafeAreaView style={styles.root} edges={Platform.OS === "ios" ? ["bottom"] : ["top", "bottom"]}>
      <ScreenHeader title="New request" variant="close" />
      <View style={styles.flex}>{body}</View>
    </SafeAreaView>
  );
}

function RequestForm() {
  const router = useRouter();
  const params = useLocalSearchParams<{ service?: string }>();
  const addresses = useAddresses();
  const create = useCreateRequest();
  const dates = upcomingDates(14);

  const { control, handleSubmit, formState, setValue, getValues } = useForm<NewRequestFormInput, unknown, NewRequestForm>({
    resolver: zodResolver(newRequestSchema),
    defaultValues: {
      service: params.service && isServiceSlug(params.service) ? params.service : "",
      addressId: "",
      preferredDate: dates[1].value,
      preferredTime: "flexible",
      details: "",
    },
  });
  const errors = formState.errors;

  // Preselect the default address (or a newly added one when none is chosen yet).
  useEffect(() => {
    const list = addresses.data ?? [];
    if (!list.length) return;
    const current = getValues("addressId");
    if (!list.some((a) => a.id === current)) setValue("addressId", (list.find((a) => a.isDefault) ?? list[list.length - 1]).id);
  }, [addresses.data, getValues, setValue]);

  const preselected = params.service;
  const serviceOptions = [...services].sort((x, y) => Number(y.slug === preselected) - Number(x.slug === preselected));

  const onSubmit = handleSubmit((values) =>
    create.mutate(values, { onSuccess: (r) => router.replace({ pathname: "/requests/[id]", params: { id: r.id, created: "1" } }) }),
  );
  const serverFieldError = (f: string) => (create.error instanceof ApiError ? create.error.fields?.[f] : undefined);

  if (addresses.isPending) return <LoadingState label="Loading your addresses" />;
  if (addresses.isError) return <ErrorState message={errorMessage(addresses.error)} onRetry={() => void addresses.refetch()} />;

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Field label="Service" error={errors.service?.message ?? serverFieldError("service")}>
          <Controller
            control={control}
            name="service"
            render={({ field }) => (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.bleed}>
                {serviceOptions.map((s) => (
                  <CategoryChip key={s.slug} label={s.name} selected={field.value === s.slug} onPress={() => field.onChange(s.slug)} />
                ))}
              </ScrollView>
            )}
          />
        </Field>

        <Field label="Address" error={errors.addressId?.message ?? serverFieldError("addressId")}>
          <Controller
            control={control}
            name="addressId"
            render={({ field }) => (
              <View style={styles.addresses} accessibilityRole="radiogroup">
                {addresses.data.map((a) => {
                  const selected = field.value === a.id;
                  return (
                    <Pressable
                      key={a.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      accessibilityLabel={`${addressLabelNames[a.label]}: ${formatAddress(a)}`}
                      onPress={() => field.onChange(a.id)}
                      style={[styles.address, selected && styles.addressSelected]}
                    >
                      <View style={[styles.radio, selected && styles.radioOn]}>{selected ? <View style={styles.radioDot} /> : null}</View>
                      <View style={styles.flex}>
                        <AppText variant="heading-sm">{addressLabelNames[a.label]}</AppText>
                        <AppText variant="body-sm" color="textSecondary" numberOfLines={2}>
                          {formatAddress(a)}
                        </AppText>
                      </View>
                    </Pressable>
                  );
                })}
                <SecondaryButton label={addresses.data.length ? "Add another address" : "Add an address"} icon={Plus} onPress={() => router.push("/addresses/edit")} />
              </View>
            )}
          />
        </Field>

        <Field label="Preferred date" error={errors.preferredDate?.message ?? serverFieldError("preferredDate")}>
          <Controller
            control={control}
            name="preferredDate"
            render={({ field }) => (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.bleed}>
                {dates.map((d) => (
                  <CategoryChip key={d.value} label={d.label} selected={field.value === d.value} onPress={() => field.onChange(d.value)} />
                ))}
              </ScrollView>
            )}
          />
        </Field>

        <Field label="Preferred time">
          <Controller
            control={control}
            name="preferredTime"
            render={({ field }) => (
              <View style={styles.wrap}>
                {preferredTimes.map((t) => (
                  <CategoryChip key={t.value} label={t.label} selected={field.value === t.value} onPress={() => field.onChange(t.value)} />
                ))}
              </View>
            )}
          />
        </Field>

        <Field label="What do you need?" error={errors.details?.message ?? serverFieldError("details")}>
          <Controller
            control={control}
            name="details"
            render={({ field }) => (
              <TextInput
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                multiline
                placeholder="E.g. 2BHK deep clean before Pongal, kitchen needs extra attention"
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="What do you need?"
                style={[styles.input, errors.details && styles.inputError]}
              />
            )}
          />
        </Field>

        <Notice>Sending a request doesn&apos;t confirm a booking. We&apos;ll review it, check availability and update you.</Notice>
        {create.error && !(create.error instanceof ApiError && create.error.fields) ? <Notice tone="error">{errorMessage(create.error)}</Notice> : null}
      </ScrollView>
      <View style={styles.footer}>
        <PrimaryButton label="Send request" block loading={create.isPending} onPress={() => onSubmit()} />
      </View>
    </KeyboardAvoidingView>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <AppText variant="label">{label}</AppText>
      {children}
      {error ? (
        <AppText variant="body-sm" color="error" accessibilityLiveRegion="polite">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  flex: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingBottom: space[6], gap: space[6] },
  field: { gap: space[2] },
  bleed: { marginHorizontal: -layout.gutter },
  chips: { gap: space[2], paddingHorizontal: layout.gutter },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: space[2] },
  addresses: { gap: space[2] },
  address: { flexDirection: "row", gap: space[3], padding: space[4], borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: "flex-start" },
  addressSelected: { borderColor: colors.ink },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.borderStrong, alignItems: "center", justifyContent: "center", marginTop: 2 },
  radioOn: { borderColor: colors.ink },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.ink },
  input: {
    ...type["body-md"],
    lineHeight: undefined,
    color: colors.text,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    paddingHorizontal: space[4],
    paddingVertical: space[3],
    minHeight: 112,
    textAlignVertical: "top",
  },
  inputError: { borderColor: colors.error },
  footer: { paddingHorizontal: layout.gutter, paddingVertical: space[3], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.borderStrong },
});
