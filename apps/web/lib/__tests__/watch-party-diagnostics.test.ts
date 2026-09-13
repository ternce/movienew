import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clearWatchPartyDiagnostics,
  getWatchPartyDiagnosticLogText,
  isWatchPartyDiagnosticsEnabled,
  logWatchPartyDiagnostic,
  markWatchPartyMicroFreeze,
  WATCH_PARTY_DIAGNOSTIC_BUFFER_SIZE,
} from "../watch-party-diagnostics";

describe("watch party diagnostics", () => {
  beforeEach(() => {
    clearWatchPartyDiagnostics();
    vi.spyOn(console, "debug").mockImplementation(() => undefined);
  });

  afterEach(() => {
    clearWatchPartyDiagnostics();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("is disabled by default", () => {
    expect(isWatchPartyDiagnosticsEnabled()).toBe(false);

    logWatchPartyDiagnostic("[WP MEDIA EVENT]", { event: "waiting" });

    expect(console.debug).not.toHaveBeenCalled();
    expect(getWatchPartyDiagnosticLogText()).toBe("");
  });

  it("stores enabled diagnostics in chronological plain text", () => {
    vi.stubEnv("NEXT_PUBLIC_WATCH_PARTY_DIAGNOSTICS", "true");

    logWatchPartyDiagnostic("[WP SOCKET]", {
      event: "sync-state",
      sequence: 71,
    });
    logWatchPartyDiagnostic("[WP MEDIA MUTATION]", {
      action: "playbackRate",
      from: 1.03,
      to: 1,
    });

    expect(getWatchPartyDiagnosticLogText()).toContain(
      "+0ms [WP SOCKET] sync-state sequence=71",
    );
    expect(getWatchPartyDiagnosticLogText()).toContain(
      "[WP MEDIA MUTATION] playbackRate from=1.03 to=1",
    );
  });

  it("keeps a bounded ring buffer", () => {
    vi.stubEnv("NEXT_PUBLIC_WATCH_PARTY_DIAGNOSTICS", "true");

    for (let index = 0; index < WATCH_PARTY_DIAGNOSTIC_BUFFER_SIZE + 25; index += 1) {
      logWatchPartyDiagnostic("[WP RECONCILE]", {
        event: "state",
        sequence: index,
      });
    }

    const lines = getWatchPartyDiagnosticLogText().split("\n");
    expect(lines).toHaveLength(WATCH_PARTY_DIAGNOSTIC_BUFFER_SIZE);
    expect(lines[0]).toContain("sequence=25");
    expect(lines.at(-1)).toContain(`sequence=${WATCH_PARTY_DIAGNOSTIC_BUFFER_SIZE + 24}`);
  });

  it("adds a user micro-freeze mark", () => {
    vi.stubEnv("NEXT_PUBLIC_WATCH_PARTY_DIAGNOSTICS", "true");

    markWatchPartyMicroFreeze();

    expect(getWatchPartyDiagnosticLogText()).toContain(
      "[WP USER MARK] MICRO_FREEZE",
    );
  });

  it("clears entries and resets the relative timeline", () => {
    vi.stubEnv("NEXT_PUBLIC_WATCH_PARTY_DIAGNOSTICS", "true");

    logWatchPartyDiagnostic("[WP HLS]", { event: "FRAG_LOADING" });
    clearWatchPartyDiagnostics();
    logWatchPartyDiagnostic("[WP HLS]", { event: "FRAG_BUFFERED" });

    expect(getWatchPartyDiagnosticLogText()).toBe(
      "+0ms [WP HLS] FRAG_BUFFERED",
    );
  });
});
