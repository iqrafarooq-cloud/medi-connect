import { useLocalSearchParams, useRouter } from "expo-router";
import { Input, Label, TextField, useToast } from "heroui-native";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Chip, ChipRow, Segment } from "@/components/health/chips";
import { DateField } from "@/components/health/date-field";
import { KeyboardFormShell } from "@/components/keyboard-form-shell";
import { PrimaryButton } from "@/components/primary-button";
import { getRpcErrorMessage } from "@/lib/form-errors";
import {
  newIdempotencyKey,
  pickPdf,
  toIsoDate,
  uploadHealthRecord,
  type PickedFile,
} from "@/lib/health";
import { client, orpc, queryClient } from "@/utils/orpc";

const TITLES = {
  condition: "Add condition",
  allergy: "Add allergy",
  medication: "Add medication",
  surgery: "Add surgery",
} as const;

type Kind = keyof typeof TITLES;

export default function AddFactScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const params = useLocalSearchParams<{ kind: string }>();
  const kind = (TITLES[params.kind as Kind] ? params.kind : "condition") as Kind;
  const submitting = useRef(false);
  const idempotencyKey = useRef(newIdempotencyKey());
  const uploadKey = useRef(newIdempotencyKey());
  const uploadedId = useRef<string | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"current" | "previous">(kind === "surgery" ? "previous" : "current");
  const [date, setDate] = useState(toIsoDate(new Date()));
  const [notes, setNotes] = useState("");
  const [dose, setDose] = useState("");
  const [frequency, setFrequency] = useState("");
  const [facility, setFacility] = useState("");
  const [allergyType, setAllergyType] = useState<"medication" | "food" | "other">("medication");
  const [severity, setSeverity] = useState<"low" | "moderate" | "high">("moderate");
  const [file, setFile] = useState<PickedFile | null>(null);

  async function attach() {
    if (busy) return;
    try {
      const picked = await pickPdf();
      if (picked) setFile(picked);
    } catch (error) {
      toast.show({
        variant: "danger",
        label: getRpcErrorMessage(error, "Could not open files"),
      });
    }
  }

  async function save() {
    if (submitting.current) return;
    const trimmed = name.trim();
    if (!trimmed) {
      toast.show({ variant: "danger", label: "Name is required" });
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      let sourceDocumentId = uploadedId.current;
      if (file && !sourceDocumentId) {
        const uploaded = await uploadHealthRecord({
          file,
          category:
            kind === "medication" ? "prescription" : kind === "surgery" ? "report" : "report",
          encounterDate: date,
          notes: notes.trim() || undefined,
          idempotencyKey: uploadKey.current,
        });
        sourceDocumentId = uploaded.id;
        uploadedId.current = uploaded.id;
      }

      if (kind === "condition") {
        await client.health.addCondition({
          name: trimmed,
          status,
          diagnosedAt: date,
          notes: notes.trim() || undefined,
          idempotencyKey: idempotencyKey.current,
          sourceDocumentId,
        });
      } else if (kind === "allergy") {
        await client.health.addAllergy({
          substance: trimmed,
          allergyType,
          severity,
          reaction: notes.trim() || undefined,
          idempotencyKey: idempotencyKey.current,
          sourceDocumentId,
        });
      } else if (kind === "medication") {
        await client.health.addMedication({
          name: trimmed,
          dose: dose.trim() || undefined,
          frequency: frequency.trim() || undefined,
          status,
          startedAt: date,
          idempotencyKey: idempotencyKey.current,
          sourceDocumentId,
        });
      } else {
        await client.health.addSurgery({
          name: trimmed,
          status,
          performedAt: date,
          facility: facility.trim() || undefined,
          notes: notes.trim() || undefined,
          idempotencyKey: idempotencyKey.current,
          sourceDocumentId,
        });
      }

      await queryClient.invalidateQueries({ queryKey: orpc.health.summary.queryOptions().queryKey });
      router.back();
    } catch (error) {
      submitting.current = false;
      setBusy(false);
      toast.show({
        variant: "danger",
        label: getRpcErrorMessage(error, "Could not save"),
      });
    }
  }

  return (
    <KeyboardFormShell
      title={TITLES[kind]}
      onBack={() => router.back()}
      footer={
        <PrimaryButton size="lg" onPress={() => void save()} isLoading={busy}>
          <PrimaryButton.Label>Save</PrimaryButton.Label>
        </PrimaryButton>
      }
    >
      {kind === "allergy" ? (
        <>
          <Text className="mb-2 text-sm font-medium text-foreground">Type</Text>
          <ChipRow>
            {(["medication", "food", "other"] as const).map((item) => (
              <Chip
                key={item}
                label={item === "medication" ? "Medication" : item === "food" ? "Food" : "Other"}
                active={allergyType === item}
                onPress={() => setAllergyType(item)}
              />
            ))}
          </ChipRow>
          <Text className="mt-5 mb-2 text-sm font-medium text-foreground">Severity</Text>
          <ChipRow>
            {(["low", "moderate", "high"] as const).map((item) => (
              <Chip
                key={item}
                label={item[0]!.toUpperCase() + item.slice(1)}
                active={severity === item}
                onPress={() => setSeverity(item)}
              />
            ))}
          </ChipRow>
        </>
      ) : (
        <View className="mt-4">
          <Segment
            value={status}
            options={[
              { value: "current", label: "Current" },
              { value: "previous", label: "Previous" },
            ]}
            onChange={(value) => setStatus(value as "current" | "previous")}
          />
        </View>
      )}

      {kind !== "allergy" ? (
        <DateField
          label={kind === "medication" ? "Start date" : kind === "surgery" ? "Date" : "Date"}
          value={date}
          onChange={setDate}
        />
      ) : null}

      <View className={kind === "allergy" ? "mt-5" : "mt-4"}>
        <TextField>
          <Label>{kind === "allergy" ? "Substance" : "Name"}</Label>
          <Input value={name} onChangeText={setName} autoCapitalize="sentences" />
        </TextField>
      </View>

      {kind === "medication" ? (
        <>
          <View className="mt-4">
            <TextField>
              <Label>Dose</Label>
              <Input value={dose} onChangeText={setDose} placeholder="500 mg" />
            </TextField>
          </View>
          <View className="mt-4">
            <TextField>
              <Label>Frequency</Label>
              <Input value={frequency} onChangeText={setFrequency} placeholder="Twice daily" />
            </TextField>
          </View>
        </>
      ) : null}

      {kind === "surgery" ? (
        <View className="mt-4">
          <TextField>
            <Label>Facility</Label>
            <Input value={facility} onChangeText={setFacility} />
          </TextField>
        </View>
      ) : null}

      <View className="mt-4">
        <TextField>
          <Label>{kind === "allergy" ? "Reaction" : "Notes"}</Label>
          <Input value={notes} onChangeText={setNotes} placeholder="Optional" />
        </TextField>
      </View>

      <Pressable
        onPress={() => void attach()}
        disabled={busy}
        className="mt-5 h-12 justify-center rounded-xl border border-border bg-surface px-3"
        accessibilityRole="button"
      >
        <Text className="text-[15px] text-foreground">{file ? file.name : "Attach file"}</Text>
      </Pressable>
    </KeyboardFormShell>
  );
}
