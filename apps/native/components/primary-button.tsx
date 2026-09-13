import { Button } from "heroui-native";
import type { ComponentProps } from "react";

import { palette } from "@/theme";

type Props = ComponentProps<typeof Button> & {
  isLoading?: boolean;
};

function PrimaryButtonRoot({ style, isDisabled, isLoading, ...props }: Props) {
  const dimmed = Boolean(isDisabled || isLoading);

  return (
    <Button
      {...props}
      isDisabled={dimmed}
      style={[{ backgroundColor: palette.primary }, dimmed ? { opacity: 0.45 } : null, style]}
    />
  );
}

export const PrimaryButton = Object.assign(PrimaryButtonRoot, {
  Label: Button.Label,
});
