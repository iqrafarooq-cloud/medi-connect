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
    <div className="flex w-full max-w-none flex-col gap-4">
      <div className="space-y-1.5">
        <Badge variant="secondary">Pre-arrival command · stub</Badge>
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Live triage command
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Bay readiness, critical packets, and ETA for patients en route to your facility.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {bays.map((bay) => (
          <Card key={bay.name}>
            <CardHeader className="space-y-2 px-4 pt-4 sm:px-5">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="font-heading text-lg">{bay.name}</CardTitle>
                <Badge variant={bay.status === "Available" ? "secondary" : "default"}>
                  {bay.status}
                </Badge>
              </div>
              <CardDescription className="text-sm leading-relaxed">{bay.patient}</CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:px-5">
              <Button variant="outline" className="h-10 w-full" disabled>
                Assign team (soon)
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="space-y-1 px-4 pt-4 sm:px-5">
          <CardTitle className="font-heading text-lg">Critical data packet</CardTitle>
          <CardDescription>Mock payload a paramedic would push on route.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 px-4 pb-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-4">
          {[
            ["Complaint", "Chest pain / ACS screen"],
            ["Blood type", "B+"],
            ["Allergies", "Penicillin"],
            ["Last ECG", "STEMI criteria pending"],
          ].map(([label, value]) => (
            <div key={label} className="space-y-1 rounded-lg bg-muted/50 p-3.5">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
              <p className="text-sm font-medium sm:text-base">{value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
