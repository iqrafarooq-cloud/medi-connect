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
import { RemedyClinicCard, RemedySuggestionList } from "@/components/health/remedy-cards";
import { KeyboardFormShell } from "@/components/keyboard-form-shell";
import { PrimaryButton } from "@/components/primary-button";
import { getRpcErrorMessage } from "@/lib/form-errors";
import { client, orpc, queryClient } from "@/utils/orpc";

type Result = Awaited<ReturnType<typeof client.health.checkRemedy>>;

const EMPTY: Partial<RemedyAnswers> = {};

export default function RemedyScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const submitting = useRef(false);
  const [answers, setAnswers] = useState<Partial<RemedyAnswers>>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const parsed = useMemo(() => remedyAnswersInput.safeParse(answers), [answers]);
  const ready = parsed.success;

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
    return (
      <KeyboardFormShell
        title="Remedial measure"
        onBack={() => router.back()}
        footer={
          <PrimaryButton size="lg" onPress={() => router.back()}>
            <PrimaryButton.Label>Done</PrimaryButton.Label>
          </PrimaryButton>
        }
      >
        <Text className="mt-1 text-[20px] font-bold text-foreground tracking-tight">
          {severe ? "Contact a clinic" : "Your self-care plan"}
        </Text>
        <Text className="mt-2 text-[15px] leading-6 text-muted">{result.summary}</Text>
        {severe ? (
          <View className="mt-5 gap-3">
            {result.clinics.length > 0 ? (
              result.clinics.map((clinic) => <RemedyClinicCard key={clinic.id} clinic={clinic} />)
            ) : (
              <View className="rounded-2xl border border-border bg-surface px-4 py-4">
                <Text className="text-[15px] leading-6 text-foreground">
                  No verified clinic is listed yet. Use the Clinic tab, or call emergency services if you cannot wait.
                </Text>
              </View>
            )}
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
      title="Remedial measure"
      onBack={() => router.back()}
      footer={
        <PrimaryButton size="lg" onPress={() => void submit()} isDisabled={!ready || busy}>
          {busy ? <Spinner size="sm" color="default" /> : <PrimaryButton.Label>Get support</PrimaryButton.Label>}
        </PrimaryButton>
      }
    >
      <Text className="mt-1 text-[15px] leading-6 text-muted">
        Answer all ten. Suggestions stay at rest, movement, fluids, food, and sleep — never medicine.
      </Text>
      {REMEDY_QUESTIONS.map((question, index) => {
        const selected = answers[question.id];
        return (
          <View key={question.id} className={index === 0 ? "mt-5" : "mt-6"}>
            <Text className="mb-2 text-[14px] font-semibold text-foreground">
              {index + 1}. {question.prompt}
            </Text>
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
      <Text className="mt-6 mb-4 text-[12px] leading-5 text-muted">{REMEDY_DISCLAIMER}</Text>
    </KeyboardFormShell>
  );
}
