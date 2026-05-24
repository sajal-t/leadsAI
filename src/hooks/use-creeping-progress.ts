"use client";

import { useEffect, useRef, useState } from "react";

/** Don't creep more than this many points ahead of the last server value. */
const MAX_AHEAD = 28;

/** Wait this long on the same server % before creeping. */
const STALL_MS = 6_000;

/** How often to nudge while stalled. */
const TICK_MS = 2_500;

/** Points added per tick while stalled. */
const BUMP = 2;

function creepCap(serverProgress: number): number {
  if (serverProgress <= 15) return 38;
  if (serverProgress <= 40) return 54;
  if (serverProgress <= 55) return 84;
  if (serverProgress <= 85) return 97;
  return 99;
}

/**
 * Smooths discovery UI when the backend sits on one % for a long time (e.g. scraping at 15%).
 * Never exceeds the next pipeline milestone cap or 99 until the server reports completion.
 */
export function useCreepingProgress(serverProgress: number, active: boolean): number {
  const [display, setDisplay] = useState(() => Math.max(0, serverProgress));
  const lastServer = useRef(serverProgress);
  const lastChangeAt = useRef(Date.now());

  useEffect(() => {
    const server = Math.max(0, Math.min(100, serverProgress));
    if (server !== lastServer.current) {
      lastServer.current = server;
      lastChangeAt.current = Date.now();
      setDisplay((prev) => Math.max(prev, server));
      return;
    }
    if (server >= 100) {
      setDisplay(100);
    }
  }, [serverProgress]);

  useEffect(() => {
    if (!active) return;

    const id = window.setInterval(() => {
      const server = lastServer.current;
      if (server >= 100) {
        setDisplay(100);
        return;
      }

      const stalledFor = Date.now() - lastChangeAt.current;
      if (stalledFor < STALL_MS) return;

      const cap = Math.min(creepCap(server), server + MAX_AHEAD, 99);
      setDisplay((prev) => {
        const floor = Math.max(prev, server);
        if (floor >= cap) return floor;
        return Math.min(cap, floor + BUMP);
      });
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [active]);

  return Math.round(display);
}
