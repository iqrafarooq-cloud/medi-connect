import { useRouter } from "expo-router";
import { useRef, useState } from "react";

import type { AddAction } from "@/components/health/add-sheet";

export function useHealthAdd() {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);
  const navigating = useRef(false);

  function openSheet() {
    if (sheetOpen || navigating.current) return;
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
  }

  function go(action: AddAction) {
    if (navigating.current) return;
    navigating.current = true;
    setSheetOpen(false);
    if (action === "upload") {
      router.push("/(app)/health/upload");
    } else {
      router.push(`/(app)/health/add/${action}`);
    }
    setTimeout(() => {
      navigating.current = false;
    }, 600);
  }

  return { sheetOpen, openSheet, closeSheet, go };
}
