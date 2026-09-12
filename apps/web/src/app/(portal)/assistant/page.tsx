"use client";

import { useState } from "react";

import { Badge } from "@medi-connect/ui/components/badge";
import { Button } from "@medi-connect/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@medi-connect/ui/components/card";
import { Textarea } from "@medi-connect/ui/components/textarea";

const starter = [
  {
    role: "you",
    text: "Does this patient have a history of penicillin allergies?",
  },
  {
    role: "assistant",
    text: "Stub response: documented penicillin allergy (rash) in Nov 2024 note from City Care Clinic. Source citation UI will link to the uploaded chart once RAG is live.",
  },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState(starter);
  const [draft, setDraft] = useState("");

  function send() {
    if (!draft.trim()) return;
    setMessages((prev) => [
      ...prev,
      { role: "you", text: draft.trim() },
      {
        role: "assistant",
        text: "AI EHR assistant is a UI stub. Answers will be grounded in the global patient file store via RAG later.",
      },
    ]);
    setDraft("");
  }

  return (
    <div className="flex w-full max-w-none flex-col gap-4">
      <div className="space-y-1.5">
        <Badge variant="secondary">Physician AI · stub</Badge>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          EHR evidence explorer
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Conversational history search with source citations — grounded in the global patient file
          store once RAG is live.
        </p>
      </div>

      <Card className="min-h-[28rem]">
        <CardHeader className="px-4 pt-4 sm:px-5">
          <CardTitle className="text-base">Session</CardTitle>
          <CardDescription>Mock thread — not connected to a model yet.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-4 pb-4 sm:px-5">
          <div className="min-h-[16rem] flex-1 space-y-3 rounded-lg border bg-muted/20 p-3 sm:p-4">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={
                  m.role === "you"
                    ? "ml-auto max-w-[75%] rounded-xl bg-primary px-4 py-3 text-primary-foreground"
                    : "mr-auto max-w-[80%] rounded-xl bg-card px-4 py-3 shadow-sm ring-1 ring-border"
                }
              >
                <p className="text-sm leading-relaxed">{m.text}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about allergies, cardiac events, meds…"
              className="min-h-20 flex-1"
            />
            <Button className="h-10 shrink-0 sm:w-28" onClick={send}>
              Send (stub)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
