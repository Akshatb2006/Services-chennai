import { zodResolver } from "@hookform/resolvers/zod";
import { formatPhone, OTP_LENGTH, sendOtpSchema } from "@homecare/contracts";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { PrimaryButton } from "@/components/Button";
import { Wordmark } from "@/components/Logo";
import { Notice } from "@/components/Notice";
import { TextField } from "@/components/TextField";
import { useSendOtp, useVerifyOtp } from "@/features/session/hooks";
import { useCountdown } from "@/hooks/useCountdown";
import { ApiError, errorMessage } from "@/services/api/client";
import { colors, layout, radius, space } from "@/theme";

/** Epoch ms `seconds` from now (kept outside render for the compiler's purity rule). */
const secondsFromNow = (seconds: number) => Date.now() + seconds * 1000;

/** Professional sign-in: phone → code. New numbers continue to registration. */
export default function SignInScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const send = useSendOtp();
  const verify = useVerifyOtp();
  const [code, setCode] = useState("");
  const wait = useCountdown(resendAt);
  const form = useForm({ resolver: zodResolver(sendOtpSchema), defaultValues: { phone: "" } });

  const sent = (p: string, seconds: number) => {
    setPhone(p);
    setResendAt(secondsFromNow(seconds));
  };
  const submitPhone = form.handleSubmit(({ phone: p }) =>
    send.mutate({ phone: p }, { onSuccess: (r) => sent(p, r.resendAfterSeconds), onError: (e) => e instanceof ApiError && e.code === "otp_cooldown" && sent(p, e.retryAfterSeconds ?? 30) }),
  );
  const submitCode = (value: string) => {
    if (!phone || value.length !== OTP_LENGTH || verify.isPending) return;
    verify.mutate(
      { phone, code: value, deviceName: Platform.OS === "ios" ? "iPhone (Pro app)" : Platform.OS === "android" ? "Android (Pro app)" : "Web preview" },
      { onSuccess: (s) => router.replace(s.me.professional ? "/" : "/register") },
    );
  };
  const sendError = send.error instanceof ApiError && send.error.code === "otp_cooldown" ? null : send.error;

  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Wordmark tone="light" size={32} />
            <AppText variant="display-md" color="textInverse" style={styles.title}>
              Work with Homecare
            </AppText>
            <AppText color="textInverseSecondary">Jobs, schedule and updates for Homecare professionals in Chennai.</AppText>
          </View>

          {!phone ? (
            <View style={styles.step}>
              <Controller
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <TextField
                    label="Mobile number"
                    prefix="+91"
                    value={field.value}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                    placeholder="98400 12345"
                    maxLength={16}
                    onSubmitEditing={() => submitPhone()}
                    error={form.formState.errors.phone?.message}
                  />
                )}
              />
              {sendError ? <Notice tone="error">{errorMessage(sendError)}</Notice> : null}
              <PrimaryButton label="Send code" block loading={send.isPending} onPress={() => submitPhone()} />
            </View>
          ) : (
            <View style={styles.step}>
              <View style={styles.inline}>
                <AppText color="textSecondary">Sent to {formatPhone(phone)}. </AppText>
                <Pressable accessibilityRole="button" onPress={() => setPhone(null)} hitSlop={8}>
                  <AppText style={styles.link}>Change</AppText>
                </Pressable>
              </View>
              <TextField
                label={`${OTP_LENGTH}-digit code`}
                value={code}
                onChangeText={(t) => {
                  const d = t.replace(/\D/g, "").slice(0, OTP_LENGTH);
                  setCode(d);
                  if (verify.error) verify.reset();
                  if (d.length === OTP_LENGTH) submitCode(d);
                }}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                autoComplete="one-time-code"
                maxLength={OTP_LENGTH}
                autoFocus
              />
              {verify.error ? <Notice tone="error">{errorMessage(verify.error)}</Notice> : null}
              <PrimaryButton label="Verify" block loading={verify.isPending} disabled={code.length !== OTP_LENGTH} onPress={() => submitCode(code)} />
              <Pressable
                accessibilityRole="button"
                disabled={wait > 0 || send.isPending}
                onPress={() => send.mutate({ phone }, { onSuccess: (r) => setResendAt(secondsFromNow(r.resendAfterSeconds)) })}
                style={styles.resend}
              >
                <AppText variant="label" color={wait > 0 ? "textSecondary" : "text"}>
                  {wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
                </AppText>
              </Pressable>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.porcelain },
  flex: { flex: 1 },
  content: { padding: layout.gutter, gap: space[6] },
  hero: { backgroundColor: colors.ink, borderRadius: radius.xl, padding: space[6], gap: space[2] },
  title: { marginTop: space[6] },
  step: { gap: space[5] },
  inline: { flexDirection: "row", flexWrap: "wrap", alignItems: "center" },
  link: { textDecorationLine: "underline" },
  resend: { alignSelf: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: space[3] },
});
