import { zodResolver } from "@hookform/resolvers/zod";
import { formatPhone, OTP_LENGTH, sendOtpSchema, updateCustomerSchema } from "@homecare/contracts";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { openExternal } from "@/utils/links";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/Button";
import { Notice } from "@/components/Notice";
import { ScreenHeader } from "@/components/ScreenHeader";
import { TextField } from "@/components/TextField";
import { legalLinks } from "@/constants/app";
import { useSendOtp, useVerifyOtp } from "@/features/auth/hooks";
import { useUpdateProfile } from "@/features/profile/hooks";
import { useCountdown } from "@/hooks/useCountdown";
import { ApiError, errorMessage } from "@/services/api/client";
import { colors, layout, space } from "@/theme";

type Step = { name: "phone" } | { name: "code"; phone: string } | { name: "profile" };

/**
 * Sign in with a mobile number: phone → one-time code → (first time) your name.
 * Presented as a modal; closing it returns to where the customer was.
 */
export default function SignInScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ name: "phone" });
  const [resendAt, setResendAt] = useState<number | null>(null);
  const finish = () => (router.canGoBack() ? router.back() : router.replace("/"));

  const title = step.name === "phone" ? "Sign in" : step.name === "code" ? "Enter code" : "About you";
  return (
    <SafeAreaView style={styles.root} edges={Platform.OS === "ios" ? ["bottom"] : ["top", "bottom"]}>
      <ScreenHeader title={title} variant="close" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step.name === "phone" ? (
            <PhoneStep
              onSent={(phone, resendAfterSeconds) => {
                setResendAt(Date.now() + resendAfterSeconds * 1000);
                setStep({ name: "code", phone });
              }}
            />
          ) : step.name === "code" ? (
            <CodeStep
              phone={step.phone}
              resendAt={resendAt}
              onResent={(s) => setResendAt(Date.now() + s * 1000)}
              onChangeNumber={() => setStep({ name: "phone" })}
              onVerified={(complete) => (complete ? finish() : setStep({ name: "profile" }))}
            />
          ) : (
            <ProfileStep onDone={finish} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PhoneStep({ onSent }: { onSent: (phone: string, resendAfterSeconds: number) => void }) {
  const send = useSendOtp();
  const { control, handleSubmit, formState } = useForm({ resolver: zodResolver(sendOtpSchema), defaultValues: { phone: "" } });
  const submit = handleSubmit(({ phone }) =>
    send.mutate(
      { phone },
      {
        onSuccess: (r) => onSent(phone, r.resendAfterSeconds),
        // A code was sent moments ago: go straight to entering it.
        onError: (e) => e instanceof ApiError && e.code === "otp_cooldown" && onSent(phone, e.retryAfterSeconds ?? 30),
      },
    ),
  );
  const error = send.error instanceof ApiError && send.error.code === "otp_cooldown" ? null : send.error;

  return (
    <View style={styles.step}>
      <AppText color="textSecondary">We&apos;ll text you a {OTP_LENGTH}-digit code to sign in or create your account.</AppText>
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <TextField
            label="Mobile number"
            prefix="+91"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoComplete="tel"
            placeholder="98400 12345"
            maxLength={16}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={() => submit()}
            error={formState.errors.phone?.message}
          />
        )}
      />
      {error ? <Notice tone="error">{errorMessage(error)}</Notice> : null}
      <PrimaryButton label="Send code" block loading={send.isPending} onPress={() => submit()} />
      <AppText variant="body-sm" color="textSecondary">
        By continuing you agree to our{" "}
        <AppText variant="body-sm" style={styles.link} accessibilityRole="link" onPress={() => void openExternal(legalLinks.terms)}>
          Terms
        </AppText>{" "}
        and{" "}
        <AppText variant="body-sm" style={styles.link} accessibilityRole="link" onPress={() => void openExternal(legalLinks.privacy)}>
          Privacy policy
        </AppText>
        .
      </AppText>
    </View>
  );
}

function CodeStep({
  phone,
  resendAt,
  onResent,
  onChangeNumber,
  onVerified,
}: {
  phone: string;
  resendAt: number | null;
  onResent: (seconds: number) => void;
  onChangeNumber: () => void;
  onVerified: (profileComplete: boolean) => void;
}) {
  const [code, setCode] = useState("");
  const verify = useVerifyOtp();
  const resend = useSendOtp();
  const wait = useCountdown(resendAt);

  const submit = (value = code) => {
    if (value.length !== OTP_LENGTH || verify.isPending) return;
    verify.mutate(
      { phone, code: value, deviceName: Platform.OS === "ios" ? "iPhone app" : Platform.OS === "android" ? "Android app" : "Web preview" },
      { onSuccess: (s) => onVerified(s.customer.profileComplete) },
    );
  };

  return (
    <View style={styles.step}>
      <View style={styles.inline}>
        <AppText color="textSecondary">Sent to {formatPhone(phone)}. </AppText>
        <Pressable accessibilityRole="button" onPress={onChangeNumber} hitSlop={8}>
          <AppText style={styles.link}>Change</AppText>
        </Pressable>
      </View>
      <TextField
        label={`${OTP_LENGTH}-digit code`}
        value={code}
        onChangeText={(t) => {
          const digits = t.replace(/\D/g, "").slice(0, OTP_LENGTH);
          setCode(digits);
          if (verify.error) verify.reset();
          if (digits.length === OTP_LENGTH) submit(digits);
        }}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={OTP_LENGTH}
        autoFocus
        placeholder="••••••"
      />
      {verify.error ? <Notice tone="error">{errorMessage(verify.error)}</Notice> : null}
      {resend.error ? <Notice tone="error">{errorMessage(resend.error)}</Notice> : null}
      <PrimaryButton label="Verify" block loading={verify.isPending} disabled={code.length !== OTP_LENGTH} onPress={() => submit()} />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: wait > 0 || resend.isPending }}
        disabled={wait > 0 || resend.isPending}
        onPress={() => resend.mutate({ phone }, { onSuccess: (r) => onResent(r.resendAfterSeconds) })}
        style={styles.resend}
      >
        <AppText variant="label" color={wait > 0 ? "textSecondary" : "text"}>
          {wait > 0 ? `Resend code in ${wait}s` : resend.isPending ? "Sending…" : "Resend code"}
        </AppText>
      </Pressable>
    </View>
  );
}

function ProfileStep({ onDone }: { onDone: () => void }) {
  const update = useUpdateProfile();
  const { control, handleSubmit, formState } = useForm({
    resolver: zodResolver(updateCustomerSchema.required({ fullName: true })),
    defaultValues: { fullName: "", email: "" },
  });
  const submit = handleSubmit((values) => update.mutate(values, { onSuccess: onDone }));
  return (
    <View style={styles.step}>
      <AppText color="textSecondary">Add your name so our team knows who they&apos;re helping.</AppText>
      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <TextField label="Full name" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} autoComplete="name" textContentType="name" autoFocus error={formState.errors.fullName?.message} />
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
            textContentType="emailAddress"
            error={formState.errors.email?.message}
          />
        )}
      />
      {update.error ? <Notice tone="error">{errorMessage(update.error)}</Notice> : null}
      <PrimaryButton label="Continue" block loading={update.isPending} onPress={() => submit()} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  flex: { flex: 1 },
  content: { paddingHorizontal: layout.gutter, paddingBottom: space[8] },
  step: { gap: space[5], paddingTop: space[2] },
  inline: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  link: { textDecorationLine: "underline", color: colors.text },
  resend: { alignSelf: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: space[3] },
});
