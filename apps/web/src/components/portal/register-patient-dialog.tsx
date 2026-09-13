"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldAlert, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@medi-connect/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@medi-connect/ui/components/dialog";
import { DatePicker } from "@medi-connect/ui/components/date-picker";
import { Input } from "@medi-connect/ui/components/input";
import { Label } from "@medi-connect/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@medi-connect/ui/components/select";
import { Textarea } from "@medi-connect/ui/components/textarea";
import { cn } from "@medi-connect/ui/lib/utils";

import { PortalButtonSpinner } from "@/components/portal/portal-loading";

import { client } from "@/utils/orpc";

type ExistingPatient = { id: string; fullName: string; cnic: string };

function Field({
  label,
  htmlFor,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={htmlFor} className="text-[13px] text-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}

export function RegisterPatientDialog({
  open,
  onOpenChange,
  onRegistered,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegistered?: () => void;
}) {
  const router = useRouter();
  const [cnic, setCnic] = useState("");
  const [existing, setExisting] = useState<ExistingPatient | null>(null);
  const [cnicError, setCnicError] = useState<string | null>(null);
  const [cnicOk, setCnicOk] = useState(false);
  const [fullName, setFullName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "other">("male");
  const [bloodType, setBloodType] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingCnic, setCheckingCnic] = useState(false);

  function resetForm() {
    setCnic("");
    setExisting(null);
    setCnicError(null);
    setCnicOk(false);
    setFullName("");
    setDateOfBirth("");
    setGender("male");
    setBloodType("");
    setPhone("");
    setNotes("");
    setLoading(false);
    setCheckingCnic(false);
  }

  useEffect(() => {
    if (!open) resetForm();
  }, [open]);

  async function lookupCnic() {
    setExisting(null);
    setCnicError(null);
    setCnicOk(false);
    if (!cnic.trim()) return;
    setCheckingCnic(true);
    try {
      const found = await client.patient.searchByCnic({ cnic });
      if (found) {
        setExisting(found);
        setCnicError(
          `CNIC already registered to ${found.fullName}. Open their record or use a different CNIC.`,
        );
      } else {
        setCnicOk(true);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lookup failed");
    } finally {
      setCheckingCnic(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (existing) {
      setCnicError(
        `Cannot create a duplicate record. ${existing.fullName} is already in the global registry.`,
      );
      return;
    }
    if (!fullName.trim()) {
      toast.error("Enter the patient’s full name");
      return;
    }
    if (!dateOfBirth) {
      toast.error("Select a date of birth");
      return;
    }
    setLoading(true);
    try {
      const result = await client.patient.create({
        cnic,
        fullName,
        dateOfBirth,
        gender,
        bloodType: bloodType || undefined,
        phone: phone || undefined,
        notes: notes || undefined,
      });

      if (!result.created) {
        setExisting(result.patient);
        setCnicError("This CNIC already exists in the global registry.");
        setLoading(false);
        return;
      }

      toast.success("Patient registered globally");
      onOpenChange(false);
      onRegistered?.();
      router.push(`/patients/${result.patient.id}` as Route);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not register patient");
      setLoading(false);
    }
  }

  const formLocked = !!existing;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent className="flex max-h-[min(92vh,760px)] w-[calc(100%-1.5rem)] max-w-[40rem] flex-col gap-0 overflow-visible rounded-2xl border-border/80 p-0 shadow-[0_28px_80px_-20px_rgba(19,30,27,0.35)] sm:max-w-[40rem]">
        <DialogHeader className="gap-1 border-b border-border/70 bg-muted/25 px-6 pt-6 pb-5 pr-14 text-left">
          <div className="mb-1 flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <UserPlus className="size-5" aria-hidden />
          </div>
          <DialogTitle className="text-xl">Register patient</DialogTitle>
          <DialogDescription className="text-[13px] leading-relaxed">
            Create a shared global record. Check the CNIC before saving to avoid duplicates.
          </DialogDescription>
        </DialogHeader>

        <form
          id="register-patient-form"
          onSubmit={onSubmit}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <div className="space-y-6 px-6 py-5">
            <section className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-heading text-sm font-semibold text-foreground">Identity check</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    13-digit national identity number
                  </p>
                </div>
                {cnicOk ? (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                    Available
                  </span>
                ) : null}
              </div>
              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
                <Field label="CNIC" htmlFor="reg-cnic" className="min-w-0 flex-1">
                  <Input
                    id="reg-cnic"
                    className={cn(
                      "h-11 rounded-lg shadow-none",
                      cnicError && "border-destructive focus-visible:ring-destructive/30",
                      cnicOk && "border-primary/40",
                    )}
                    value={cnic}
                    onChange={(e) => {
                      setCnic(e.target.value);
                      setExisting(null);
                      setCnicError(null);
                      setCnicOk(false);
                    }}
                    placeholder="42101-1234567-1"
                    aria-invalid={!!cnicError}
                  />
                </Field>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 shrink-0 gap-2 rounded-lg px-4 shadow-none"
                  disabled={checkingCnic || !cnic.trim()}
                  onClick={() => void lookupCnic()}
                >
                  {checkingCnic ? <PortalButtonSpinner /> : null}
                  Check CNIC
                </Button>
              </div>
              {cnicError ? (
                <div
                  className="flex gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5 text-[13px] text-destructive"
                  role="alert"
                >
                  <ShieldAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <p>
                    {cnicError}
                    {existing ? (
                      <>
                        {" "}
                        <Link
                          href={`/patients/${existing.id}` as Route}
                          className="font-semibold underline underline-offset-2"
                          onClick={() => onOpenChange(false)}
                        >
                          View existing record
                        </Link>
                      </>
                    ) : null}
                  </p>
                </div>
              ) : null}
            </section>

            <section className="space-y-4">
              <div>
                <p className="font-heading text-sm font-semibold text-foreground">Patient details</p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">
                  Demographics for the longitudinal record
                </p>
              </div>

              <Field label="Full name" htmlFor="reg-name">
                <Input
                  id="reg-name"
                  className="h-11 rounded-lg shadow-none"
                  required
                  disabled={formLocked}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="As on CNIC"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Date of birth" htmlFor="reg-dob">
                  <DatePicker
                    id="reg-dob"
                    value={dateOfBirth}
                    onChange={setDateOfBirth}
                    disabled={formLocked}
                    placeholder="Select date"
                    fromYear={1920}
                    toYear={new Date().getFullYear()}
                    disabledMatcher={(date) => date > new Date()}
                  />
                </Field>
                <Field label="Gender">
                  <Select
                    value={gender}
                    onValueChange={(v: "male" | "female" | "other") => setGender(v)}
                    disabled={formLocked}
                  >
                    <SelectTrigger className="h-11 w-full rounded-lg shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Phone (+92)" htmlFor="reg-phone">
                  <Input
                    id="reg-phone"
                    className="h-11 rounded-lg shadow-none"
                    disabled={formLocked}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="03XX XXXXXXX"
                  />
                </Field>
                <Field label="Blood type" htmlFor="reg-blood">
                  <Input
                    id="reg-blood"
                    className="h-11 rounded-lg shadow-none"
                    disabled={formLocked}
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    placeholder="Optional · e.g. B+"
                  />
                </Field>
              </div>

              <Field label="Intake notes" htmlFor="reg-notes">
                <Textarea
                  id="reg-notes"
                  disabled={formLocked}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[5.5rem] rounded-lg shadow-none"
                  placeholder="Optional clinical context for first registration"
                />
              </Field>
            </section>
          </div>
        </form>

        <DialogFooter className="gap-2 border-t border-border/70 bg-muted/15 px-6 py-4 sm:justify-between">
          <p className="hidden text-[12px] text-muted-foreground sm:block">
            Record is shared across verified facilities
          </p>
          <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-lg shadow-none"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="register-patient-form"
              className="h-11 gap-2 rounded-lg px-5"
              disabled={loading || formLocked}
            >
              {loading ? <PortalButtonSpinner /> : null}
              {loading ? "Saving…" : "Create patient"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
