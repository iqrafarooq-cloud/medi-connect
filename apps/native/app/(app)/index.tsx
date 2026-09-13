import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Spinner, useToast } from "heroui-native";
import { useState } from "react";
import { Alert, Text, View } from "react-native";

import { QueueStatusCard } from "@/components/clinic/queue-status-card";
import { Container } from "@/components/container";
import { HomeConnectedPages, HomeHealthCard, HomeHeroCard } from "@/components/home/home-feed";
import { authClient } from "@/lib/auth-client";
import { minutesUntilEta } from "@/lib/clinic-map";
import { getRpcErrorMessage } from "@/lib/form-errors";
import {
  countHealthRecords,
  firstNameFrom,
  homeGreeting,
  homeHero,
  homePageCards,
  type HomeHref,
} from "@/lib/home";
import { client, orpc, queryClient } from "@/utils/orpc";

export default function HomeScreen() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = authClient.useSession();
  const [leaving, setLeaving] = useState(false);
  const me = useQuery({
    ...orpc.patient.me.queryOptions(),
    enabled: Boolean(session?.user),
  });
  const queue = useQuery(orpc.triage.myQueue.queryOptions());
  const remedy = useQuery(orpc.health.latestRemedy.queryOptions());
  const summary = useQuery(orpc.health.summary.queryOptions());

  const firstName = firstNameFrom(me.data?.fullName ?? session?.user.name);
  const recordCount = countHealthRecords(summary.data);
  const queueValue = queue.data
    ? {
        clinicName: queue.data.clinicName,
        minutesLeft: minutesUntilEta(new Date(queue.data.etaAt)),
        complaint: queue.data.complaint,
      }
    : null;
  const last = remedy.data?.last ?? null;
  const remedyValue = last ? { severity: last.severity, summary: last.summary } : null;
  const greeting = homeGreeting({
    firstName,
    hasQueue: Boolean(queueValue),
    remedySeverity: remedyValue?.severity ?? null,
    recordCount,
  });
  const hero = homeHero({ queue: queueValue, remedy: remedyValue });
  const pages = homePageCards({
    recordCount,
    queue: queueValue,
    remedy: remedyValue,
  });
  const health = pages[0];
  const clinic = pages[1];
  const profile = pages[2];
  const loading = queue.isLoading || remedy.isLoading || summary.isLoading;

  function go(href: HomeHref) {
    router.push(href);
  }

  function requestLeave() {
    if (!queue.data || leaving) return;
    Alert.alert(
      "Leave this queue?",
      `The clinic will no longer see you inbound at ${queue.data.clinicName}.`,
      [
        { text: "Stay", style: "cancel" },
        {
          text: "Leave queue",
          style: "destructive",
          onPress: () => void leaveQueue(),
        },
      ],
    );
  }

  async function leaveQueue() {
    if (leaving) return;
    setLeaving(true);
    try {
      const result = await client.triage.leaveQueue();
      await queryClient.invalidateQueries({ queryKey: orpc.triage.myQueue.queryOptions().queryKey });
      toast.show({
        variant: "success",
        label: result.left ? `You left the queue at ${result.clinicName}` : "You're not in a queue",
      });
    } catch (error) {
      toast.show({
        variant: "danger",
        label: getRpcErrorMessage(error, "Could not leave the clinic queue"),
      });
    } finally {
      setLeaving(false);
    }
  }

  return (
    <Container className="px-4">
      <Text className="font-bold text-[26px] text-foreground tracking-tight">{greeting.title}</Text>
      {greeting.body && hero.kind !== "queue" ? (
        <Text className="mt-1.5 text-[15px] leading-6 text-muted">{greeting.body}</Text>
      ) : null}

      {loading ? (
        <View className="mt-8 py-16 items-center">
          <Spinner size="sm" />
        </View>
      ) : health && clinic && profile ? (
        <View className="mt-6 pb-10">
          {hero.kind === "queue" && queueValue ? (
            <QueueStatusCard
              className="rounded-3xl"
              clinicName={queueValue.clinicName}
              minutesLeft={queueValue.minutesLeft}
              onPress={() => go(hero.href)}
              onLeave={requestLeave}
              leaving={leaving}
            />
          ) : (
            <HomeHeroCard hero={hero} onPress={go} />
          )}
          <View className="mt-4">
            <HomeHealthCard card={health} onPress={go} />
          </View>
          <View className="mt-4">
            <HomeConnectedPages clinic={clinic} profile={profile} onPress={go} />
          </View>
        </View>
      ) : null}
    </Container>
  );
}
