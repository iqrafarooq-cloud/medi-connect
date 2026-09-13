export type LabPoint = {
  id: string;
  testName: string;
  value: number;
  unit: string | null;
  flag: string | null;
  observedAt: Date | string;
  entrySource: "document" | "manual";
  documentId: string | null;
};

export type LabSeries = {
  testName: string;
  unit: string | null;
  latest: LabPoint;
  points: number[];
  history: LabPoint[];
};

/** Group lab rows by case-insensitive test name; newest-first history, oldest→newest sparkline. */
export function groupLabsByTestName(rows: LabPoint[]): LabSeries[] {
  const map = new Map<string, LabPoint[]>();
  for (const row of rows) {
    const key = row.testName.trim().toLowerCase();
    if (!key) continue;
    const list = map.get(key) ?? [];
    list.push(row);
    map.set(key, list);
  }

  const series: LabSeries[] = [];
  for (const [, list] of map) {
    const sorted = [...list].sort(
      (a, b) => new Date(a.observedAt).getTime() - new Date(b.observedAt).getTime(),
    );
    const latest = sorted[sorted.length - 1];
    if (!latest) continue;
    series.push({
      testName: latest.testName,
      unit: latest.unit,
      latest,
      points: sorted.map((r) => r.value),
      history: [...sorted].reverse(),
    });
  }

  return series.sort((a, b) => a.testName.localeCompare(b.testName));
}

export function uniqueFacilities(facilities: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of facilities) {
    const f = raw.trim();
    if (!f) continue;
    const key = f.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(f);
  }
  return out;
}

export function encounterYear(occurredAt: Date | string): number {
  return new Date(occurredAt).getFullYear();
}
