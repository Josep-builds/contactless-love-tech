export function elapsedLabel(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m ago`;
  if (hours < 48) return `${Math.round(hours)}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  escalated: "Escalated",
  closed: "Closed",
};
