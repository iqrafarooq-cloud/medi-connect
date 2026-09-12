import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@medi-connect/ui/components/card";
import { Badge } from "@medi-connect/ui/components/badge";
import { Ambulance, Clock3, MapPin, Phone } from "lucide-react";

const incoming = [
  {
    id: "1",
    name: "Ahmed Khan",
    complaint: "Chest pain · suspected ACS",
    eta: "6 min",
    blood: "B+",
    from: "Model Town, Lahore",
    priority: "Critical",
  },
  {
    id: "2",
    name: "Fatima Raza",
    complaint: "Pediatric fever + dehydration",
    eta: "14 min",
    blood: "O+",
    from: "Gulberg III",
    priority: "Urgent",
  },
  {
    id: "3",
    name: "Usman Ali",
    complaint: "Road traffic injury · stable",
    eta: "22 min",
    blood: "A-",
    from: "Thokar Niaz Baig",
    priority: "Standard",
  },
];

export default function DashboardPage() {
  return (
    <div className="flex w-full max-w-none flex-col gap-4">
      <div className="space-y-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight sm:text-3xl">
          Live intake feed
        </h1>
        <p className="max-w-3xl text-sm text-muted-foreground leading-relaxed sm:text-base">
          Pre-arrival alerts for patients en route to your facility. Live ETA wiring is stubbed —
          layout and workflows are ready for realtime backends.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: "En route", value: "3", hint: "Active alerts" },
          { label: "Avg ETA", value: "14m", hint: "Mock estimate" },
          { label: "Bay ready", value: "2", hint: "Trauma + peds" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="gap-1 px-4 pt-4 pb-1 sm:px-5">
              <CardDescription className="text-xs sm:text-sm">{stat.label}</CardDescription>
              <CardTitle className="font-heading text-2xl sm:text-3xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 text-xs text-muted-foreground sm:px-5 sm:text-sm">
              {stat.hint}
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="font-heading text-lg font-semibold">Incoming patients</h2>
        <div className="grid gap-3">
          {incoming.map((item) => (
            <Card key={item.id}>
              <CardContent className="grid gap-4 px-4 py-4 md:grid-cols-[1fr_auto] md:items-center sm:px-5 sm:py-4">
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-heading text-lg font-semibold sm:text-xl">{item.name}</h3>
                    <Badge variant={item.priority === "Critical" ? "destructive" : "secondary"}>
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="text-sm text-foreground/90 sm:text-base">{item.complaint}</p>
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-muted-foreground sm:text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="size-3.5" /> {item.from}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Ambulance className="size-3.5" /> Blood {item.blood}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Phone className="size-3.5" /> Paramedic link (stub)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-lg bg-primary/10 px-4 py-3 text-primary">
                  <Clock3 className="size-5" />
                  <div>
                    <p className="text-[10px] uppercase tracking-wide opacity-80">ETA</p>
                    <p className="font-heading text-xl font-semibold sm:text-2xl">{item.eta}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
