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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
      <div className="space-y-3">
        <Badge variant="secondary">Physician AI · stub</Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          EHR evidence explorer
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Conversational history search with source citations — layout inspired by Stitch, with more
          breathing room for long clinical answers.
        </p>
      </div>

      <Card className="rounded-2xl border-none ring-1 ring-border/60 shadow-none">
        <CardHeader className="px-6 pt-8 sm:px-8">
          <CardTitle className="text-lg">Session</CardTitle>
          <CardDescription>Mock thread — not connected to a model yet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-6 pb-8 sm:px-8">
          <div className="space-y-4">
            {messages.map((m, i) => (
              <div
                key={`${m.role}-${i}`}
                className={
                  m.role === "you"
                    ? "ml-auto max-w-[85%] rounded-2xl bg-primary px-5 py-4 text-primary-foreground"
                    : "mr-auto max-w-[90%] rounded-2xl bg-muted px-5 py-4"
                }
              >
                <p className="text-sm leading-relaxed">{m.text}</p>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask about allergies, cardiac events, meds…"
              className="min-h-28"
            />
            <Button className="h-11" onClick={send}>
              Send (stub)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
