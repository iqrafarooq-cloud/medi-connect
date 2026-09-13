"use client";

import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@medi-connect/ui/components/button";
import { Calendar } from "@medi-connect/ui/components/calendar";
import { Input } from "@medi-connect/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger } from "@medi-connect/ui/components/popover";
import { cn } from "@medi-connect/ui/lib/utils";

function parseDateOnly(value?: string) {
  if (!value) return undefined;
  const parsed = parse(value, "yyyy-MM-dd", new Date());
  return isValid(parsed) ? parsed : undefined;
}

function formatDateOnly(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function parseDateTimeLocal(value?: string) {
  if (!value) return undefined;
  const parsed = parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
  return isValid(parsed) ? parsed : undefined;
}

function formatDateTimeLocal(date: Date) {
  return format(date, "yyyy-MM-dd'T'HH:mm");
}

function padTimePart(n: number) {
  return String(n).padStart(2, "0");
}

function yearOptions(fromYear: number, toYear: number) {
  const years: number[] = [];
  for (let y = toYear; y >= fromYear; y -= 1) years.push(y);
  return years;
}

const nativeSelectClassName = cn(
  "h-9 cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm shadow-none",
  "outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
);

/** ShadCN date picker bound to `YYYY-MM-DD` strings. */
export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  id,
  fromYear = 1920,
  toYear = new Date().getFullYear(),
  disabledMatcher,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  fromYear?: number;
  toYear?: number;
  disabledMatcher?: (date: Date) => boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = parseDateOnly(value);
  const [month, setMonth] = React.useState<Date>(selected ?? new Date(toYear - 25, 0, 1));

  React.useEffect(() => {
    if (selected) setMonth(selected);
  }, [selected]);

  function shiftMonth(delta: number) {
    const next = new Date(month);
    next.setMonth(next.getMonth() + delta);
    if (next.getFullYear() < fromYear || next.getFullYear() > toYear) return;
    setMonth(next);
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          data-empty={!selected}
          className={cn(
            "h-11 w-full justify-start gap-2.5 rounded-lg px-3 text-left font-normal shadow-none data-[empty=true]:text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">
            {selected ? format(selected, "dd MMM yyyy") : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[80] w-auto overflow-hidden rounded-xl border border-border p-0 shadow-xl"
        align="start"
        side="bottom"
        sideOffset={8}
        avoidCollisions={false}
        onOpenAutoFocus={(event) => {
          // Keep focus inside the dialog trigger flow; avoid dialog focus-out dismiss.
          event.preventDefault();
        }}
      >
        <div className="flex items-center gap-1.5 border-b border-border/80 bg-muted/30 px-2.5 py-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <select
            aria-label="Month"
            className={cn(nativeSelectClassName, "min-w-0 flex-1")}
            value={month.getMonth()}
            onChange={(e) => {
              const next = new Date(month);
              next.setMonth(Number(e.target.value));
              setMonth(next);
            }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <option key={i} value={i}>
                {format(new Date(2020, i, 1), "MMMM")}
              </option>
            ))}
          </select>
          <select
            aria-label="Year"
            className={cn(nativeSelectClassName, "w-[5.25rem] shrink-0")}
            value={month.getFullYear()}
            onChange={(e) => {
              const next = new Date(month);
              next.setFullYear(Number(e.target.value));
              setMonth(next);
            }}
          >
            {yearOptions(fromYear, toYear).map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 shrink-0"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <Calendar
          mode="single"
          captionLayout="label"
          hideNavigation
          fixedWeeks
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          disabled={disabledMatcher}
          onSelect={(date) => {
            if (!date) {
              onChange("");
              return;
            }
            onChange(formatDateOnly(date));
            setOpen(false);
          }}
          className="rounded-none border-0"
          classNames={{
            month_caption: "sr-only",
            month: "flex w-full flex-col gap-2",
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

/** ShadCN date + time picker bound to `datetime-local` (`YYYY-MM-DDTHH:mm`) strings. */
export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick date & time",
  disabled,
  className,
  id,
}: {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const selected = parseDateTimeLocal(value);
  const timeValue = selected
    ? `${padTimePart(selected.getHours())}:${padTimePart(selected.getMinutes())}`
    : "00:00";

  function commit(nextDate: Date, time = timeValue) {
    const [hoursRaw, minutesRaw] = time.split(":");
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    const merged = new Date(nextDate);
    merged.setHours(
      Number.isFinite(hours) ? hours : 0,
      Number.isFinite(minutes) ? minutes : 0,
      0,
      0,
    );
    onChange(formatDateTimeLocal(merged));
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabled}
          data-empty={!selected}
          className={cn(
            "h-11 w-full justify-start gap-2.5 rounded-lg px-3 text-left font-normal shadow-none data-[empty=true]:text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">
            {selected ? format(selected, "dd MMM yyyy, HH:mm") : placeholder}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="z-[80] w-auto overflow-hidden rounded-xl border border-border p-0 shadow-xl"
        align="start"
        side="bottom"
        sideOffset={8}
        avoidCollisions={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
        }}
      >
        <Calendar
          mode="single"
          captionLayout="label"
          fixedWeeks
          selected={selected}
          defaultMonth={selected}
          onSelect={(date) => {
            if (!date) {
              onChange("");
              return;
            }
            commit(date);
          }}
          className="rounded-none border-0"
        />
        <div className="flex items-center gap-3 border-t border-border bg-muted/20 px-3 py-3">
          <label
            className="text-xs font-medium text-muted-foreground"
            htmlFor={`${id ?? "dt"}-time`}
          >
            Time
          </label>
          <Input
            id={`${id ?? "dt"}-time`}
            type="time"
            className="h-9 rounded-lg shadow-none"
            value={timeValue}
            disabled={disabled || !selected}
            onChange={(e) => {
              if (!selected) return;
              commit(selected, e.target.value || "00:00");
            }}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
