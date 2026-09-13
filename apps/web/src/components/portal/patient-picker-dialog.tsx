"use client";

import { useEffect, useId, useState } from "react";
import { ArrowRight, Search, Users } from "lucide-react";

import { Avatar, AvatarFallback } from "@medi-connect/ui/components/avatar";
import { Badge } from "@medi-connect/ui/components/badge";
import { Button } from "@medi-connect/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@medi-connect/ui/components/dialog";
import { Input } from "@medi-connect/ui/components/input";
import { ScrollArea } from "@medi-connect/ui/components/scroll-area";
import { Skeleton } from "@medi-connect/ui/components/skeleton";
import { cn } from "@medi-connect/ui/lib/utils";

export type PatientPickerHit = {
  id: string;
  fullName: string;
  cnic: string;
  age?: number;
  sex?: string;
  bloodType?: string | null;
  dob?: string;
};

function formatCnic(cnic: string) {
  const d = cnic.replace(/\D/g, "");
  if (d.length !== 13) return cnic;
  return `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function metaLine(p: PatientPickerHit) {
  const parts: string[] = [];
  if (p.age != null) parts.push(String(p.age));
  if (p.sex) parts.push(p.sex);
  if (p.bloodType) parts.push(p.bloodType);
  return parts.join(" · ");
}

export function PatientPickerDialog({
  open,
  onOpenChange,
  query,
  setQuery,
  searching,
  searchHits,
  onSelect,
  activeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  query: string;
  setQuery: (v: string) => void;
  searching: boolean;
  searchHits: PatientPickerHit[];
  onSelect: (p: PatientPickerHit) => void;
  activeId?: string;
}) {
  const listId = useId();
  const [highlight, setHighlight] = useState(0);
  const q = query.trim();

  useEffect(() => {
    setHighlight(0);
  }, [q, searchHits]);

  function choose(index: number) {
    const hit = searchHits[index];
    if (hit) onSelect(hit);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!searchHits.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((i) => Math.min(searchHits.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(highlight);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="gap-0 overflow-hidden border-border/80 p-0 shadow-[0_28px_80px_-20px_rgba(19,30,27,0.35)] sm:max-w-[28rem]"
        onKeyDown={onKeyDown}
      >
        <DialogHeader className="gap-1 border-b border-border/70 bg-muted/30 px-6 pb-4 pt-6 pr-14">
          <DialogTitle className="text-xl tracking-tight">Find a patient</DialogTitle>
          <DialogDescription className="text-[13px] leading-snug">
            Search the shared Pakistan registry. Chat and documents load after you choose someone.
          </DialogDescription>
        </DialogHeader>

        <div className="border-b border-border/70 px-6 py-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name or CNIC…"
              className="h-11 rounded-xl border-border bg-background pl-10 pr-4 text-[15px] shadow-none"
              autoComplete="off"
              autoFocus
              aria-controls={listId}
              aria-autocomplete="list"
              role="combobox"
              aria-expanded={q.length > 0}
            />
          </div>
        </div>

        <ScrollArea className="h-[min(22rem,48vh)]">
          <div id={listId} role="listbox" className="px-3 py-3">
            {!q ? (
              <div className="flex flex-col items-center px-4 py-12 text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-primary/8 text-primary">
                  <Users className="size-5" aria-hidden />
                </div>
                <p className="font-heading text-sm font-semibold text-foreground">
                  Start typing to search
                </p>
                <p className="mt-1.5 max-w-[16rem] text-[13px] leading-relaxed text-muted-foreground">
                  Use a full or partial name, or a 13-digit CNIC.
                </p>
              </div>
            ) : searching && searchHits.length === 0 ? (
              <ul className="space-y-2 px-1" aria-busy="true" aria-label="Searching patients">
                {Array.from({ length: 3 }).map((_, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 rounded-xl px-3 py-3"
                  >
                    <Skeleton className="size-11 shrink-0 rounded-full" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </li>
                ))}
              </ul>
            ) : searchHits.length === 0 ? (
              <div className="flex flex-col items-center px-4 py-12 text-center">
                <p className="font-heading text-sm font-semibold text-foreground">No matches</p>
                <p className="mt-1.5 max-w-[16rem] text-[13px] leading-relaxed text-muted-foreground">
                  Nothing found for “{q}”. Try another spelling or the full CNIC.
                </p>
              </div>
            ) : (
              <ul className="space-y-1">
                {searchHits.map((p, index) => {
                  const selected = highlight === index;
                  const active = activeId === p.id;
                  const meta = metaLine(p);
                  return (
                    <li key={p.id} role="option" aria-selected={selected}>
                      <button
                        type="button"
                        onMouseEnter={() => setHighlight(index)}
                        onClick={() => onSelect(p)}
                        className={cn(
                          "group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors duration-150",
                          selected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "hover:bg-muted/80",
                        )}
                      >
                        <Avatar
                          className={cn(
                            "size-11 border",
                            selected ? "border-primary-foreground/20" : "border-border",
                          )}
                        >
                          <AvatarFallback
                            className={cn(
                              "text-sm font-semibold",
                              selected
                                ? "bg-primary-foreground/15 text-primary-foreground"
                                : "bg-primary/10 text-primary",
                            )}
                          >
                            {initials(p.fullName)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-heading text-[15px] font-semibold tracking-tight">
                              {p.fullName}
                            </span>
                            {active ? (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "h-5 shrink-0 px-1.5 text-[10px] font-semibold",
                                  selected &&
                                    "border-transparent bg-primary-foreground/15 text-primary-foreground",
                                )}
                              >
                                Active
                              </Badge>
                            ) : null}
                          </div>
                          {meta ? (
                            <p
                              className={cn(
                                "mt-0.5 truncate text-[12px]",
                                selected ? "text-primary-foreground/80" : "text-muted-foreground",
                              )}
                            >
                              {meta}
                            </p>
                          ) : null}
                          <p
                            className={cn(
                              "mt-0.5 font-mono text-[11px] tabular-nums",
                              selected ? "text-primary-foreground/70" : "text-muted-foreground",
                            )}
                          >
                            {formatCnic(p.cnic)}
                          </p>
                        </div>

                        <ArrowRight
                          className={cn(
                            "size-4 shrink-0 opacity-0 transition-opacity duration-150",
                            selected ? "opacity-100" : "group-hover:opacity-50",
                            selected ? "text-primary-foreground" : "text-muted-foreground",
                          )}
                          aria-hidden
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/20 px-6 py-3">
          <p className="text-[12px] text-muted-foreground">
            {q && !searching
              ? `${searchHits.length} match${searchHits.length === 1 ? "" : "es"}`
              : searching
                ? "Searching…"
                : "Live registry search"}
          </p>
          {searchHits.length > 0 ? (
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              ↑↓ to move · Enter to open
            </p>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
