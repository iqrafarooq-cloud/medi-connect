import { useForm } from "@tanstack/react-form";
import { useRouter } from "expo-router";
import {
  FieldError,
  Input,
  Label,
  Spinner,
  TextField,
  useToast,
} from "heroui-native";
import { useRef } from "react";
import { Text, TextInput, View } from "react-native";
import z from "zod";

import { KeyboardFormShell } from "@/components/keyboard-form-shell";
import { PrimaryButton } from "@/components/primary-button";
import { authClient } from "@/lib/auth-client";
import { getErrorMessage } from "@/lib/form-errors";
import { queryClient } from "@/utils/orpc";

const signInSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required").min(8, "Use at least 8 characters"),
});

export default function SignInScreen() {
  const router = useRouter();
  const passwordInputRef = useRef<TextInput>(null);
  const { toast } = useToast();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    validators: {
      onSubmit: signInSchema,
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email.trim(),
          password: value.password,
        },
        {
          onError(error) {
            toast.show({
              variant: "danger",
              label: error.error?.message || "Failed to sign in",
            });
          },
          onSuccess() {
            void queryClient.refetchQueries();
            router.replace("/(app)");
          },
        },
      );
    },
  });

  return (
    <KeyboardFormShell
      title="Log in"
      onBack={() => router.back()}
      footer={
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <PrimaryButton size="lg" onPress={form.handleSubmit} isDisabled={isSubmitting}>
              {isSubmitting ? <Spinner size="sm" color="default" /> : <PrimaryButton.Label>Log in</PrimaryButton.Label>}
            </PrimaryButton>
          )}
        </form.Subscribe>
      }
    >
      <Text className="font-bold text-3xl text-foreground tracking-tight">Welcome back</Text>
      <Text className="mt-2 mb-6 text-base text-muted">
        Sign in with the email on your MediConnect patient account.
      </Text>

      <form.Subscribe
        selector={(state) => getErrorMessage(state.errorMap.onSubmit)}
      >
        {(validationError) => (
          <FieldError isInvalid={!!validationError} className="mb-3">
            {validationError}
          </FieldError>
        )}
      </form.Subscribe>

      <View className="gap-4">
        <form.Field name="email">
          {(field) => (
            <TextField>
              <Label>Email</Label>
              <Input
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={field.handleChange}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => {
                  passwordInputRef.current?.focus();
                }}
              />
            </TextField>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <TextField>
              <Label>Password</Label>
              <Input
                ref={passwordInputRef}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChangeText={field.handleChange}
                placeholder="••••••••"
                secureTextEntry
                autoComplete="password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={form.handleSubmit}
              />
            </TextField>
          )}
        </form.Field>
      </View>

      <PressableLink onPress={() => router.push("/(auth)/sign-up")} />
    </KeyboardFormShell>
  );
}

function PressableLink({ onPress }: { onPress: () => void }) {
  return (
    <Text className="mt-6 text-center text-sm text-muted">
      New here?{" "}
      <Text onPress={onPress} className="text-primary font-medium">
        Create an account
      </Text>
    </Text>
  );
}
