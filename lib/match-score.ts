import type { ScheduleEvent } from "@/types";

/** Extract numeric match score from dedicated columns or text fallbacks. */
export function getMatchScores(
  event: ScheduleEvent,
): { a: number; b: number } | null {
  if (event.score_a != null && event.score_b != null) {
    return { a: Number(event.score_a), b: Number(event.score_b) };
  }

  const fromText = parseScorePair(event.result_text);
  if (fromText) return fromText;

  const fromNotes = event.notes?.match(/Счёт:\s*([^|]+)/i)?.[1]?.trim();
  if (fromNotes) return parseScorePair(fromNotes);

  return null;
}

function parseScorePair(value: string | null | undefined): { a: number; b: number } | null {
  if (!value) return null;
  const match = value.match(/(-?\d+(?:[.,]\d+)?)\s*[:\-–]\s*(-?\d+(?:[.,]\d+)?)/);
  if (!match) return null;
  const a = Number(match[1].replace(",", "."));
  const b = Number(match[2].replace(",", "."));
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return { a, b };
}
