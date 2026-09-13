import { Button } from "heroui-native";
import type { ComponentProps } from "react";

import { palette } from "@/theme";

function PrimaryButtonRoot({ style, ...props }: ComponentProps<typeof Button>) {
  return <Button {...props} style={[{ backgroundColor: palette.primary }, style]} />;
}

export const PrimaryButton = Object.assign(PrimaryButtonRoot, {
  Label: Button.Label,
});
