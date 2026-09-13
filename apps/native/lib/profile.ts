export function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const word = parts[0] ?? "";
    return word.slice(0, 2).toUpperCase();
  }
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

export function formatActivityWhen(value: string, now = new Date()): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfThat = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dayDiff = Math.round((startOfToday.getTime() - startOfThat.getTime()) / 86_400_000);

  if (dayDiff === 0) {
    const time = date.toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit" });
    return `Today, ${time}`;
  }
  if (dayDiff === 1) return "Yesterday";

  return date.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() === now.getFullYear() ? undefined : "numeric",
  });
}

function countPhrase(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

export function profileStatsLine(stats: { records: number; visits: number; checks: number }): string {
  return [
    countPhrase(stats.records, "record", "records"),
    countPhrase(stats.visits, "clinic", "clinics"),
    countPhrase(stats.checks, "check", "checks"),
  ].join(" · ");
}
