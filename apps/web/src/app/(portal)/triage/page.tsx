import { Badge } from "@medi-connect/ui/components/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@medi-connect/ui/components/card";
import { Button } from "@medi-connect/ui/components/button";

const bays = [
  { name: "Trauma 1", status: "Preparing", patient: "Ahmed Khan · ETA 6m" },
  { name: "Trauma 2", status: "Available", patient: "—" },
  { name: "Peds A", status: "Assigned", patient: "Fatima Raza · ETA 14m" },
];

export default function TriagePage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <div className="space-y-3">
        <Badge variant="secondary">Pre-arrival command · stub</Badge>
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Live triage command
        </h1>
        <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
          Spacious take on the Stitch pre-arrival board — bay readiness, critical packets, and ETA
          without the cramped density of the original frames.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {bays.map((bay) => (
          <Card key={bay.name} className="rounded-2xl border-none ring-1 ring-border/60 shadow-none">
            <CardHeader className="space-y-3 px-6 pt-6">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="font-heading text-xl">{bay.name}</CardTitle>
                <Badge variant={bay.status === "Available" ? "secondary" : "default"}>
                  {bay.status}
                </Badge>
              </div>
              <CardDescription className="text-sm leading-relaxed">{bay.patient}</CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <Button variant="outline" className="h-11 w-full" disabled>
                Assign team (soon)
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-none ring-1 ring-border/60 shadow-none">
        <CardHeader className="space-y-2 px-6 pt-8 sm:px-8">
          <CardTitle className="font-heading text-xl">Critical data packet</CardTitle>
          <CardDescription>Mock payload a paramedic would push on route.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 px-6 pb-10 sm:grid-cols-2 sm:px-8 lg:grid-cols-4">
          {[
            ["Complaint", "Chest pain / ACS screen"],
            ["Blood type", "B+"],
            ["Allergies", "Penicillin"],
            ["Last ECG", "STEMI criteria pending"],
          ].map(([label, value]) => (
            <div key={label} className="space-y-2 rounded-xl bg-muted/50 p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-base font-medium">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
