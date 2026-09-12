import { Card, CardContent, CardDescription, CardHeader, CardTitle } from"@medi-connect/ui/components/card";
import { Badge } from"@medi-connect/ui/components/badge";
import { Ambulance, Clock3, MapPin, Phone } from"lucide-react";

const incoming = [
  {
    id:"1",
    name:"Ahmed Khan",
    complaint:"Chest pain · suspected ACS",
    eta:"6 min",
    blood:"B+",
    from:"Model Town, Lahore",
    priority:"Critical",
  },
  {
    id:"2",
    name:"Fatima Raza",
    complaint:"Pediatric fever + dehydration",
    eta:"14 min",
    blood:"O+",
    from:"Gulberg III",
    priority:"Urgent",
  },
  {
    id:"3",
    name:"Usman Ali",
    complaint:"Road traffic injury · stable",
    eta:"22 min",
    blood:"A-",
    from:"Thokar Niaz Baig",
    priority:"Standard",
  },
];

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
      <div className="space-y-3">
        <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
          Live intake feed
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground leading-relaxed">
          Pre-arrival alerts for patients en route to your facility. Live ETA wiring is stubbed —
          layout and workflows are ready for realtime backends.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label:"En route", value:"3", hint:"Active alerts" },
          { label:"Avg ETA", value:"14m", hint:"Mock estimate" },
          { label:"Bay ready", value:"2", hint:"Trauma + peds" },
        ].map((stat) => (
          <Card key={stat.label} className="">
            <CardHeader className="gap-2 px-6 pt-6">
              <CardDescription className="text-sm">{stat.label}</CardDescription>
              <CardTitle className="font-heading text-3xl">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6 text-sm text-muted-foreground">{stat.hint}</CardContent>
          </Card>
        ))}
      </div>

      <section className="space-y-5">
        <h2 className="font-heading text-xl font-semibold">Incoming patients</h2>
        <div className="grid gap-5">
          {incoming.map((item) => (
            <Card
              key={item.id}
              className=""
            >
              <CardContent className="grid gap-6 px-6 py-6 md:grid-cols-[1fr_auto] md:items-center">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="font-heading text-xl font-semibold">{item.name}</h3>
                    <Badge variant={item.priority ==="Critical" ?"destructive" :"secondary"}>
                      {item.priority}
                    </Badge>
                  </div>
                  <p className="text-base text-foreground/90">{item.complaint}</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2">
                      <MapPin className="size-4" /> {item.from}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Ambulance className="size-4" /> Blood {item.blood}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <Phone className="size-4" /> Paramedic link (stub)
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-primary/10 px-5 py-4 text-primary">
                  <Clock3 className="size-6" />
                  <div>
                    <p className="text-xs uppercase tracking-wide opacity-80">ETA</p>
                    <p className="font-heading text-2xl font-semibold">{item.eta}</p>
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
