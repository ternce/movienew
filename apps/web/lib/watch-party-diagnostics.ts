"use client";

export type WatchPartyDiagnosticLabel =
  | "[WP SOCKET]"
  | "[WP RECONCILE]"
  | "[WP MEDIA MUTATION]"
  | "[WP MEDIA EVENT]"
  | "[WP HLS]"
  | "[WP PLAYER]"
  | "[WP IOS SYNC]"
  | "[WP PLAY RECOVERY]"
  | "[WP SYNC RECOVERY]"
  | "[WP Sync Correction]"
  | "[WP USER MARK]";

export type WatchPartyDiagnosticEntry = {
  relativeMs: number;
  label: WatchPartyDiagnosticLabel;
  event?: string | null;
  action?: string | null;
  payload: Record<string, unknown>;
};

const MAX_WATCH_PARTY_DIAGNOSTICS = 400;
const watchPartyDiagnosticEntries: WatchPartyDiagnosticEntry[] = [];
let diagnosticStartMs: number | null = null;

export function isWatchPartyDiagnosticsEnabled() {
  return process.env.NEXT_PUBLIC_WATCH_PARTY_DIAGNOSTICS === "true";
}

function getNowMs() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "boolean") return String(value);
  if (typeof value === "string") return value.includes(" ") ? JSON.stringify(value) : value;
  return null;
}

function formatDiagnosticEntry(entry: WatchPartyDiagnosticEntry) {
  const compactFields = Object.entries(entry.payload)
    .filter(([key]) => key !== "event" && key !== "action")
    .map(([key, value]) => {
      const formatted = formatValue(value);
      return formatted === null ? null : `${key}=${formatted}`;
    })
    .filter(Boolean)
    .join(" ");
  const subject = entry.action || entry.event || "";
  return `+${entry.relativeMs}ms ${entry.label}${subject ? ` ${subject}` : ""}${
    compactFields ? ` ${compactFields}` : ""
  }`;
}

export function logWatchPartyDiagnostic(
  label: WatchPartyDiagnosticLabel,
  payload: Record<string, unknown>,
) {
  if (!isWatchPartyDiagnosticsEnabled()) return;
  const now = getNowMs();
  if (diagnosticStartMs === null) diagnosticStartMs = now;
  watchPartyDiagnosticEntries.push({
    relativeMs: Math.round(now - diagnosticStartMs),
    label,
    event: typeof payload.event === "string" ? payload.event : null,
    action: typeof payload.action === "string" ? payload.action : null,
    payload,
  });
  if (watchPartyDiagnosticEntries.length > MAX_WATCH_PARTY_DIAGNOSTICS) {
    watchPartyDiagnosticEntries.splice(
      0,
      watchPartyDiagnosticEntries.length - MAX_WATCH_PARTY_DIAGNOSTICS,
    );
  }
  // eslint-disable-next-line no-console
  console.debug(label, payload);
}

export function getWatchPartyDiagnosticLogText() {
  return watchPartyDiagnosticEntries.map(formatDiagnosticEntry).join("\n");
}

export function clearWatchPartyDiagnostics() {
  watchPartyDiagnosticEntries.length = 0;
  diagnosticStartMs = null;
}

export function markWatchPartyMicroFreeze() {
  logWatchPartyDiagnostic("[WP USER MARK]", {
    event: "MICRO_FREEZE",
  });
}

export const WATCH_PARTY_DIAGNOSTIC_BUFFER_SIZE = MAX_WATCH_PARTY_DIAGNOSTICS;
