/** Event timezone for Spartakiada (Kazakhstan) */
export const EVENT_TIMEZONE = "Asia/Almaty";

/**
 * Parse value from <input type="datetime-local"> as Asia/Almaty wall time → UTC ISO.
 * Input example: "2026-07-26T15:00"
 */
export function almatyLocalInputToUtcIso(localInput: string): string {
  const match = localInput.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );
  if (!match) {
    throw new Error("Некорректная дата/время");
  }

  const [, y, mo, d, h, mi, s] = match;
  const asUtcGuess = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s ?? 0),
  );

  // Find UTC instant whose Almaty wall-clock equals the entered local time
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

  const partsOf = (ms: number) => {
    const parts = formatter.formatToParts(new Date(ms));
    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? "00";
    return {
      year: Number(get("year")),
      month: Number(get("month")),
      day: Number(get("day")),
      hour: Number(get("hour")),
      minute: Number(get("minute")),
      second: Number(get("second")),
    };
  };

  const target = {
    year: Number(y),
    month: Number(mo),
    day: Number(d),
    hour: Number(h),
    minute: Number(mi),
    second: Number(s ?? 0),
  };

  let utc = asUtcGuess;
  for (let i = 0; i < 3; i++) {
    const got = partsOf(utc);
    const gotAsUtc = Date.UTC(
      got.year,
      got.month - 1,
      got.day,
      got.hour,
      got.minute,
      got.second,
    );
    const targetAsUtc = Date.UTC(
      target.year,
      target.month - 1,
      target.day,
      target.hour,
      target.minute,
      target.second,
    );
    utc += targetAsUtc - gotAsUtc;
  }

  return new Date(utc).toISOString();
}

/** UTC ISO → value for <input type="datetime-local"> in Asia/Almaty */
export function utcIsoToAlmatyLocalInput(iso: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const parts = formatter.formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

/** Format for public boards in Asia/Almaty */
export function formatEventDateTime(iso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: EVENT_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** YYYY-MM-DD of an event in Asia/Almaty (for date filters) */
export function eventDateInAlmaty(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}
