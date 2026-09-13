import { useForm } from "@tanstack/react-form";
import DateTimePicker, { type DateTimePickerEvent } from "@react-native-community/datetimepicker";
import {
  isValidCnic,
  isValidPakistanPhone,
  maskCnicInput,
  parseIsoDateOfBirth,
} from "@/lib/pakistan";
import { useRouter } from "expo-router";
import {
  FieldError,
  Input,
  Label,
  TextField,
  useToast,
} from "heroui-native";
import { useRef, useState } from "react";
import { Platform, Pressable, Text, TextInput, View } from "react-native";
import z from "zod";

import { KeyboardFormShell } from "@/components/keyboard-form-shell";
import { PrimaryButton } from "@/components/primary-button";
import { authClient } from "@/lib/auth-client";
import { getErrorMessage, getRpcErrorMessage } from "@/lib/form-errors";
import { client, queryClient } from "@/utils/orpc";

const accountSchema = z
  .object({
    fullName: z.string().trim().min(1, "Name is required").min(2, "Name must be at least 2 characters"),
    email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
    password: z.string().min(1, "Password is required").min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const identitySchema = z.object({
  phone: z.string().min(1, "Mobile number is required").refine(isValidPakistanPhone, {
    message: "Enter a valid Pakistan mobile number",
  }),
  cnic: z.string().min(1, "CNIC is required").refine(isValidCnic, {
    message: "CNIC must be 13 digits",
  }),
  dateOfBirth: z.string().min(1, "Date of birth is required").refine((value) => parseIsoDateOfBirth(value) !== null, {
    message: "Enter a valid date of birth",
  }),
  gender: z.enum(["male", "female", "other"]),
});

const genders = [
  { value: "male" as const, label: "Male" },
  { value: "female" as const, label: "Female" },
  { value: "other" as const, label: "Other" },
];

function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) {
    const fallback = new Date();
    fallback.setFullYear(fallback.getFullYear() - 25);
    return fallback;
  }
  return new Date(year, month - 1, day);
}

function formatDisplayDate(iso: string): string {
  if (!iso) return "Select date of birth";
  return fromIsoDate(iso).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function SignUpScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [showPicker, setShowPicker] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const cnicRef = useRef<TextInput>(null);

  const minDate = new Date();
  minDate.setFullYear(minDate.getFullYear() - 120);

  const form = useForm({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      cnic: "",
      dateOfBirth: "",
      gender: "" as "" | "male" | "female" | "other",
    },
    onSubmit: async ({ value }) => {
      const identity = identitySchema.safeParse({
        phone: value.phone,
        cnic: value.cnic,
        dateOfBirth: value.dateOfBirth,
        gender: value.gender === "male" || value.gender === "female" || value.gender === "other"
          ? value.gender
          : undefined,
      });
      if (!identity.success) {
        toast.show({
          variant: "danger",
          label: identity.error.issues[0]?.message ?? "Check your details",
        });
        return;
      }
      try {
        await client.patient.selfRegister({
          fullName: value.fullName.trim(),
          email: value.email.trim(),
          password: value.password,
          phone: value.phone,
          cnic: value.cnic,
          dateOfBirth: value.dateOfBirth,
          gender: identity.data.gender,
        });
      } catch (error) {
        toast.show({
          variant: "danger",
          label: getRpcErrorMessage(error, "Could not create account"),
        });
        return;
      }

      await authClient.signIn.email(
        {
          email: value.email.trim(),
          password: value.password,
        },
        {
          onError(error) {
            toast.show({
              variant: "danger",
              label: error.error?.message || "Account created. Please log in.",
            });
            router.replace("/(auth)/sign-in");
          },
          onSuccess() {
            void queryClient.refetchQueries();
            router.replace("/(app)");
          },
        },
      );
    },
  });

  async function goNext() {
    const result = accountSchema.safeParse({
      fullName: form.getFieldValue("fullName"),
      email: form.getFieldValue("email"),
      password: form.getFieldValue("password"),
      confirmPassword: form.getFieldValue("confirmPassword"),
    });
    if (!result.success) {
      const message = result.error.issues[0]?.message ?? "Check the account details";
      toast.show({ variant: "danger", label: message });
      return;
    }
    setStep(2);
  }

  const maxDate = new Date();

  return (
    <KeyboardFormShell
      title={step === 1 ? "Create account" : "Health details"}
      onBack={() => {
        if (step === 2) {
          setStep(1);
          return;
        }
        router.back();
      }}
      footer={
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) =>
            step === 1 ? (
              <PrimaryButton size="lg" onPress={() => void goNext()}>
                <PrimaryButton.Label>Continue</PrimaryButton.Label>
              </PrimaryButton>
            ) : (
              <PrimaryButton size="lg" onPress={form.handleSubmit} isLoading={isSubmitting}>
                <PrimaryButton.Label>Create patient account</PrimaryButton.Label>
              </PrimaryButton>
            )
          }
        </form.Subscribe>
      }
    >
      <View className="flex-row gap-2 mb-5">
        <View className="h-1 flex-1 rounded-full bg-primary" />
        <View className={`h-1 flex-1 rounded-full ${step === 2 ? "bg-primary" : "bg-border"}`} />
      </View>

      <Text className="font-bold text-3xl text-foreground tracking-tight">
        {step === 1 ? "Your login" : "Your identity"}
      </Text>
      <Text className="mt-2 mb-6 text-base text-muted">
        {step === 1
          ? "We’ll use this email and password whenever you open MediConnect."
          : "CNIC is your global patient identity. It must not already be in the system."}
      </Text>

      <form.Subscribe selector={(state) => getErrorMessage(state.errorMap.onSubmit)}>
        {(validationError) => (
          <FieldError isInvalid={!!validationError} className="mb-3">
            {validationError}
          </FieldError>
        )}
      </form.Subscribe>

      {step === 1 ? (
        <View className="gap-4">
          <form.Field name="fullName">
            {(field) => (
              <TextField>
                <Label>Full name</Label>
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChangeText={field.handleChange}
                  placeholder="Ayesha Khan"
                  autoComplete="name"
                  textContentType="name"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => emailRef.current?.focus()}
                />
              </TextField>
            )}
          </form.Field>
          <form.Field name="email">
            {(field) => (
              <TextField>
                <Label>Email</Label>
                <Input
                  ref={emailRef}
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
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </TextField>
            )}
          </form.Field>
          <form.Field name="password">
            {(field) => (
              <TextField>
                <Label>Password</Label>
                <Input
                  ref={passwordRef}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChangeText={field.handleChange}
                  placeholder="At least 8 characters"
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => confirmRef.current?.focus()}
                />
              </TextField>
            )}
          </form.Field>
          <form.Field name="confirmPassword">
            {(field) => (
              <TextField>
                <Label>Confirm password</Label>
                <Input
                  ref={confirmRef}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChangeText={field.handleChange}
                  placeholder="Re-enter password"
                  secureTextEntry
                  autoComplete="new-password"
                  textContentType="newPassword"
                  returnKeyType="go"
                  onSubmitEditing={() => void goNext()}
                />
              </TextField>
            )}
          </form.Field>
        </View>
      ) : (
        <View className="gap-4">
          <form.Field name="gender">
            {(field) => (
              <View>
                <Label>Gender</Label>
                <View className="mt-2 flex-row gap-2">
                  {genders.map((option) => {
                    const selected = field.state.value === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        onPress={() => field.handleChange(option.value)}
                        className={`flex-1 items-center rounded-xl border py-3 ${
                          selected ? "border-primary bg-primary/10" : "border-border bg-surface"
                        }`}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                      >
                        <Text className={`font-medium ${selected ? "text-primary" : "text-foreground"}`}>
                          {option.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </form.Field>
          <form.Field name="dateOfBirth">
            {(field) => (
              <View>
                <Label>Date of birth</Label>
                <Pressable
                  onPress={() => setShowPicker(true)}
                  className="mt-1.5 h-12 justify-center rounded-xl border border-border bg-surface px-3"
                  accessibilityRole="button"
                  accessibilityLabel="Choose date of birth"
                >
                  <Text className={field.state.value ? "text-foreground" : "text-muted"}>
                    {formatDisplayDate(field.state.value)}
                  </Text>
                </Pressable>
                {showPicker ? (
                  <DateTimePicker
                    value={fromIsoDate(field.state.value)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    maximumDate={maxDate}
                    minimumDate={minDate}
                    onChange={(event: DateTimePickerEvent, selected?: Date) => {
                      if (Platform.OS === "android") {
                        setShowPicker(false);
                      }
                      if (event.type === "dismissed") {
                        return;
                      }
                      if (selected) {
                        field.handleChange(toIsoDate(selected));
                      }
                    }}
                  />
                ) : null}
                {Platform.OS === "ios" && showPicker ? (
                  <Pressable onPress={() => setShowPicker(false)} className="mt-2 self-end">
                    <Text className="text-primary font-medium">Done</Text>
                  </Pressable>
                ) : null}
              </View>
            )}
          </form.Field>
          <form.Field name="phone">
            {(field) => (
              <TextField>
                <Label>Mobile number</Label>
                <Input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChangeText={field.handleChange}
                  placeholder="03XX XXXXXXX"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => cnicRef.current?.focus()}
                />
              </TextField>
            )}
          </form.Field>
          <form.Field name="cnic">
            {(field) => (
              <TextField>
                <Label>CNIC</Label>
                <Input
                  ref={cnicRef}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChangeText={(text) => field.handleChange(maskCnicInput(text))}
                  placeholder="xxxxx-xxxxxxx-x"
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
              </TextField>
            )}
          </form.Field>
        </View>
      )}
    </KeyboardFormShell>
  );
}
