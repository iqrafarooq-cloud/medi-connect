import { Modal, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const ADD_ACTIONS = [
  { id: "upload", label: "Upload record", icon: "cloud-upload-outline" },
  { id: "condition", label: "Add condition", icon: "pulse-outline" },
  { id: "allergy", label: "Add allergy", icon: "alert-circle-outline" },
  { id: "medication", label: "Add medication", icon: "medkit-outline" },
  { id: "surgery", label: "Add surgery", icon: "cut-outline" },
] as const;

export type AddAction = (typeof ADD_ACTIONS)[number]["id"];

export function HealthAddSheet({
  open,
  busy,
  onClose,
  onSelect,
}: {
  open: boolean;
  busy?: boolean;
  onClose: () => void;
  onSelect: (id: AddAction) => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 justify-end bg-black/40" onPress={busy ? undefined : onClose}>
        <Pressable
          className="rounded-t-3xl bg-surface px-4 pt-3"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
          onPress={() => undefined}
        >
          <View className="mb-3 items-center">
            <View className="h-1 w-10 rounded-full bg-border" />
          </View>
          {ADD_ACTIONS.map((action, index) => (
            <Pressable
              key={action.id}
              disabled={busy}
              onPress={() => onSelect(action.id)}
              className={`min-h-[52px] justify-center px-2 ${
                index === ADD_ACTIONS.length - 1 ? "" : "border-b border-border"
              }`}
              accessibilityRole="button"
            >
              <Text className="text-[16px] text-foreground">{action.label}</Text>
            </Pressable>
          ))}
          <Pressable
            disabled={busy}
            onPress={onClose}
            className="mt-2 min-h-[52px] items-center justify-center"
            accessibilityRole="button"
          >
            <Text className="text-[15px] font-medium text-muted">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
