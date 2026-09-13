import { useRouter } from "expo-router";
import { Input, Label, Spinner, TextField, useToast } from "heroui-native";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { Chip, ChipRow } from "@/components/health/chips";
import { DateField } from "@/components/health/date-field";
import { KeyboardFormShell } from "@/components/keyboard-form-shell";
import { PrimaryButton } from "@/components/primary-button";
import {
  newIdempotencyKey,
  pickPdf,
  pickPhoto,
  takePhoto,
  toIsoDate,
  uploadHealthRecord,
  type PickedFile,
} from "@/lib/health";
import { getRpcErrorMessage } from "@/lib/form-errors";
import { orpc, queryClient } from "@/utils/orpc";

const CATEGORIES = [
  { id: "lab", label: "Lab" },
  { id: "imaging", label: "Imaging" },
  { id: "prescription", label: "Rx" },
  { id: "report", label: "Report" },
  { id: "other", label: "Other" },
] as const;

export default function UploadRecordScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const submitting = useRef(false);
  const idempotencyKey = useRef(newIdempotencyKey());
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["id"]>("lab");
  const [file, setFile] = useState<PickedFile | null>(null);
  const [date, setDate] = useState(toIsoDate(new Date()));
  const [notes, setNotes] = useState("");

  async function choose(kind: "pdf" | "photo" | "camera") {
    if (busy) return;
    try {
      const picked = kind === "pdf" ? await pickPdf() : kind === "camera" ? await takePhoto() : await pickPhoto();
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
    if (!file) {
      toast.show({ variant: "danger", label: "Choose a PDF or photo" });
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      await uploadHealthRecord({
        file,
        category,
        encounterDate: date,
        notes: notes.trim() || undefined,
        idempotencyKey: idempotencyKey.current,
      });
      await queryClient.invalidateQueries({ queryKey: orpc.health.summary.queryOptions().queryKey });
      router.back();
    } catch (error) {
      submitting.current = false;
      setBusy(false);
      toast.show({
        variant: "danger",
        label: getRpcErrorMessage(error, "Could not upload"),
      });
    }
  }

  return (
    <KeyboardFormShell
      title="Upload"
      onBack={() => router.back()}
      footer={
        <PrimaryButton size="lg" onPress={() => void save()} isDisabled={busy}>
          {busy ? <Spinner size="sm" color="default" /> : <PrimaryButton.Label>Save</PrimaryButton.Label>}
        </PrimaryButton>
      }
    >
      <Text className="mb-3 text-sm font-medium text-foreground">Type</Text>
      <ChipRow>
        {CATEGORIES.map((item) => (
          <Chip key={item.id} label={item.label} active={category === item.id} onPress={() => setCategory(item.id)} />
        ))}
      </ChipRow>

      <Text className="mt-6 mb-3 text-sm font-medium text-foreground">File</Text>
      <View className="flex-row gap-2">
        <FileButton label="PDF" onPress={() => void choose("pdf")} />
        <FileButton label="Photo" onPress={() => void choose("photo")} />
        <FileButton label="Camera" onPress={() => void choose("camera")} />
      </View>
      {file ? <Text className="mt-2 text-[13px] text-muted">{file.name}</Text> : null}

      <DateField label="Date" value={date} onChange={setDate} />

      <View className="mt-4">
        <TextField>
          <Label>Notes</Label>
          <Input value={notes} onChangeText={setNotes} placeholder="Optional" />
        </TextField>
      </View>
    </KeyboardFormShell>
  );
}

function FileButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="h-11 flex-1 items-center justify-center rounded-xl border border-border bg-surface"
      accessibilityRole="button"
    >
      <Text className="text-[13px] font-medium text-foreground">{label}</Text>
    </Pressable>
  );
}
