import { Link, Stack } from "expo-router";
import { Button, Surface } from "heroui-native";
import { Text, View } from "react-native";

import { Container } from "@/components/container";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found", headerShown: true }} />
      <Container>
        <View className="flex-1 justify-center items-center p-4">
          <Surface variant="secondary" className="items-center p-6 max-w-sm rounded-lg">
            <Text className="text-foreground font-medium text-lg mb-1">Page not found</Text>
            <Text className="text-muted text-sm text-center mb-4">
              This screen is not part of MediConnect.
            </Text>
            <Link href="/" asChild>
              <Button size="sm">
                <Button.Label>Go home</Button.Label>
              </Button>
            </Link>
          </Surface>
        </View>
      </Container>
    </>
  );
}
