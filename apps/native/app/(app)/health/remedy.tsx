import {
  REMEDY_DISCLAIMER,
  REMEDY_QUESTIONS,
  remedyAnswersInput,
  type RemedyAnswers,
} from "@medi-connect/api/lib/health-remedy";
import { useRouter } from "expo-router";
import { Spinner, useToast } from "heroui-native";
import { useMemo, useRef, useState } from "react";
import { Text, View } from "react-native";

import { Chip, ChipRow } from "@/components/health/chips";
import { RemedySuggestionList } from "@/components/health/remedy-cards";
import { KeyboardFormShell } from "@/components/keyboard-form-shell";
import { PrimaryButton } from "@/components/primary-button";
import { getRpcErrorMessage } from "@/lib/form-errors";
import { palette } from "@/theme";
import { client, orpc, queryClient } from "@/utils/orpc";

type Result = Awaited<ReturnType<typeof client.health.checkRemedy>>;

const EMPTY: Partial<RemedyAnswers> = {};

function answeredCount(answers: Partial<RemedyAnswers>) {
  return REMEDY_QUESTIONS.filter((question) => {
    const selected = answers[question.id];
    return question.multiple
      ? Array.isArray(selected) && selected.length > 0
      : typeof selected === "string" && selected.length > 0;
  }).length;
}

function severityStyle(severity: Result["severity"]) {
  if (severity === "severe") {
    return { label: "Clinic care", backgroundColor: "rgba(230, 57, 70, 0.12)", color: palette.tertiary };
  }
  if (severity === "watch") {
    return { label: "Keep watch", backgroundColor: "rgba(166, 124, 0, 0.16)", color: "#8A6400" };
  }
  return { label: "Self-care", backgroundColor: "rgba(5, 150, 105, 0.12)", color: palette.primary };
}

export default function RemedyScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const submitting = useRef(false);
  const [answers, setAnswers] = useState<Partial<RemedyAnswers>>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const parsed = useMemo(() => remedyAnswersInput.safeParse(answers), [answers]);
  const ready = parsed.success;
  const done = answeredCount(answers);
  const total = REMEDY_QUESTIONS.length;

  function pick(id: (typeof REMEDY_QUESTIONS)[number]["id"], value: string, multiple?: boolean) {
    setAnswers((current) => {
      if (!multiple) return { ...current, [id]: value };
      if (value === "nothing") return { ...current, alreadyTried: ["nothing"] };
      const tried = (current.alreadyTried ?? []).filter((item) => item !== "nothing");
      const exists = tried.some((item) => item === value);
      const next = exists ? tried.filter((item) => item !== value) : [...tried, value];
      return { ...current, alreadyTried: next as RemedyAnswers["alreadyTried"] };
    });
  }

  async function submit() {
    if (!parsed.success || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const data = await client.health.checkRemedy(parsed.data);
      setResult(data);
      await queryClient.invalidateQueries({ queryKey: orpc.health.latestRemedy.queryOptions().queryKey });
    } catch (error) {
      submitting.current = false;
      setBusy(false);
      toast.show({
        variant: "danger",
        label: getRpcErrorMessage(error, "Could not finish the check"),
      });
      return;
    }
    setBusy(false);
  }

  if (result) {
    const severe = result.severity === "severe";
    const mark = severityStyle(result.severity);
    return (
      <KeyboardFormShell
        title="Feeling unwell"
        onBack={() => router.back()}
        footer={
          <PrimaryButton
            size="lg"
            onPress={() => router.replace({ pathname: "/(app)/clinic", params: { focus: "nearby" } })}
          >
            <PrimaryButton.Label>Find a clinic</PrimaryButton.Label>
          </PrimaryButton>
        }
      >
        <View
          className="self-start rounded-full px-3 py-1.5"
          style={{ backgroundColor: mark.backgroundColor }}
        >
          <Text className="text-[12px] font-semibold" style={{ color: mark.color }}>
            {mark.label}
          </Text>
        </View>
        <Text className="mt-3 text-[24px] font-bold text-foreground tracking-tight">
          {severe ? "Contact a clinic" : "Your self-care plan"}
        </Text>
        <Text className="mt-2 text-[15px] leading-6 text-muted">{result.summary}</Text>
        {severe ? (
          <View className="mt-5 rounded-2xl border border-border bg-surface px-4 py-4">
            <Text className="text-[15px] leading-6 text-foreground">
              Nearby enrolled clinics are on the Clinic tab. Call emergency services if you cannot wait.
            </Text>
          </View>
        ) : (
          <View className="mt-5">
            <RemedySuggestionList suggestions={result.suggestions} />
          </View>
        )}
        <Text className="mt-6 mb-4 text-[12px] leading-5 text-muted">{result.disclaimer}</Text>
      </KeyboardFormShell>
    );
  }

  return (
    <KeyboardFormShell
        title="Feeling unwell"
      onBack={() => router.back()}
      footer={
        <PrimaryButton size="lg" onPress={() => void submit()} isDisabled={!ready || busy}>
          {busy ? <Spinner size="sm" color="default" /> : <PrimaryButton.Label>Get support</PrimaryButton.Label>}
        </PrimaryButton>
      }
    >
      <Text className="mt-1 font-bold text-[26px] text-foreground tracking-tight">A short check-in</Text>
      <Text className="mt-1.5 text-[15px] leading-6 text-muted">
        Ten questions. Suggestions stay at rest, movement, fluids, food, and sleep — never medicine.
      </Text>

      <View className="mt-5 mb-1 flex-row items-center justify-between">
        <Text className="text-[13px] font-semibold text-foreground">
          {done} of {total} answered
        </Text>
        <Text className="text-[13px] text-muted">{ready ? "Ready" : "Answer each one"}</Text>
      </View>
      <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-secondary">
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${Math.round((done / total) * 100)}%` }}
        />
      </View>

      {REMEDY_QUESTIONS.map((question, index) => {
        const selected = answers[question.id];
        const filled = question.multiple
          ? Array.isArray(selected) && selected.length > 0
          : typeof selected === "string" && selected.length > 0;
        return (
          <View key={question.id} className={index === 0 ? "mt-6" : "mt-7"}>
            <View className="mb-2.5 flex-row items-start gap-3">
              <View
                className={`mt-0.5 h-7 w-7 items-center justify-center rounded-full ${
                  filled ? "bg-primary" : "bg-surface-secondary"
                }`}
              >
                <Text className={`text-[12px] font-bold ${filled ? "text-primary-foreground" : "text-muted"}`}>
                  {index + 1}
                </Text>
              </View>
              <Text className="flex-1 text-[16px] font-semibold text-foreground leading-6">
                {question.prompt}
              </Text>
            </View>
            <ChipRow>
              {question.options.map((option) => {
                const active = question.multiple
                  ? Array.isArray(selected) && selected.includes(option.value as RemedyAnswers["alreadyTried"][number])
                  : selected === option.value;
                return (
                  <Chip
                    key={option.value}
                    label={option.label}
                    active={active}
                    onPress={() => pick(question.id, option.value, question.multiple)}
                  />
                );
              })}
            </ChipRow>
          </View>
        );
      })}
      <Text className="mt-7 mb-4 text-[12px] leading-5 text-muted">{REMEDY_DISCLAIMER}</Text>
    </KeyboardFormShell>
  );
}
