import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Input, Label, TextField, useToast, useThemeColor } from "heroui-native";
import type { ComponentProps } from "react";
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
import { palette } from "@/theme";
import { orpc, queryClient } from "@/utils/orpc";

const CATEGORIES = [
  { id: "lab", label: "Lab" },
  { id: "imaging", label: "Imaging" },
  { id: "prescription", label: "Rx" },
  { id: "report", label: "Report" },
  { id: "other", label: "Other" },
] as const;

type IconName = ComponentProps<typeof Ionicons>["name"];

function isPdfFile(file: PickedFile) {
  return file.mimeType.includes("pdf") || file.name.toLowerCase().endsWith(".pdf");
}

export default function UploadRecordScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const muted = useThemeColor("muted");
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
        <PrimaryButton size="lg" onPress={() => void save()} isDisabled={!file} isLoading={busy}>
          <PrimaryButton.Label>Save record</PrimaryButton.Label>
        </PrimaryButton>
      }
    >
      <Text className="mt-1 font-bold text-[26px] text-foreground tracking-tight">Attach a record</Text>
      <Text className="mt-1.5 mb-6 text-[15px] leading-6 text-muted">
        A lab, scan, prescription, or report. PDF, JPG, or PNG.
      </Text>

      <Text className="mb-2.5 text-[13px] font-semibold text-foreground">Type</Text>
      <ChipRow>
        {CATEGORIES.map((item) => (
          <Chip
            key={item.id}
            label={item.label}
            active={category === item.id}
            onPress={() => setCategory(item.id)}
          />
        ))}
      </ChipRow>

      <Text className="mt-6 mb-2.5 text-[13px] font-semibold text-foreground">File</Text>
      {file ? (
        <View className="overflow-hidden rounded-2xl border border-border bg-surface">
          <View className="flex-row items-center gap-3 px-3 py-3">
            <View
              className="h-12 w-12 items-center justify-center rounded-xl"
              style={{ backgroundColor: "rgba(5, 150, 105, 0.12)" }}
            >
              <Ionicons
                name={isPdfFile(file) ? "document-text" : "image"}
                size={22}
                color={palette.primary}
              />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
                {file.name}
              </Text>
              <Text className="mt-0.5 text-[12px] text-muted">
                {isPdfFile(file) ? "PDF" : "Photo"} · ready to save
              </Text>
            </View>
            <Pressable
              onPress={() => setFile(null)}
              hitSlop={8}
              className="h-11 w-11 items-center justify-center rounded-full"
              accessibilityRole="button"
              accessibilityLabel="Remove file"
            >
              <Ionicons name="close" size={20} color={muted} />
            </Pressable>
          </View>
          <View className="flex-row gap-2 border-t border-border px-3 py-3">
            <SourceButton icon="document-outline" label="PDF" onPress={() => void choose("pdf")} compact />
            <SourceButton icon="image-outline" label="Photo" onPress={() => void choose("photo")} compact />
            <SourceButton icon="camera-outline" label="Camera" onPress={() => void choose("camera")} compact />
          </View>
        </View>
      ) : (
        <View className="rounded-2xl border border-border bg-surface px-3 pb-3 pt-5">
          <View className="items-center">
            <View
              className="h-12 w-12 items-center justify-center rounded-2xl"
              style={{ backgroundColor: "rgba(5, 150, 105, 0.12)" }}
            >
              <Ionicons name="cloud-upload-outline" size={22} color={palette.primary} />
            </View>
            <Text className="mt-3 text-[16px] font-semibold text-foreground">No file yet</Text>
            <Text className="mt-1 text-center text-[13px] leading-5 text-muted">
              Choose a PDF, pick a photo, or take one now.
            </Text>
          </View>
          <View className="mt-4 flex-row gap-2">
            <SourceButton icon="document-outline" label="PDF" onPress={() => void choose("pdf")} />
            <SourceButton icon="image-outline" label="Photo" onPress={() => void choose("photo")} />
            <SourceButton icon="camera-outline" label="Camera" onPress={() => void choose("camera")} />
          </View>
        </View>
      )}

      <DateField label="Date of record" value={date} onChange={setDate} />

      <View className="mt-4 mb-2">
        <TextField>
          <Label>Notes</Label>
          <Input
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional — clinic or context"
            multiline
            textAlignVertical="top"
            className="min-h-[88px] py-3"
          />
        </TextField>
      </View>
    </KeyboardFormShell>
  );
}

function SourceButton({
  icon,
  label,
  onPress,
  compact,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 items-center justify-center rounded-xl border border-border bg-background ${
        compact ? "h-11 flex-row gap-1.5 px-2" : "h-[72px]"
      }`}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
    >
      <Ionicons name={icon} size={compact ? 16 : 20} color={palette.primary} />
      <Text className={`font-semibold text-foreground ${compact ? "text-[12px]" : "mt-1.5 text-[13px]"}`}>
        {label}
      </Text>
    </Pressable>
  );
}
