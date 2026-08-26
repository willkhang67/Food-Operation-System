/**
 * Kitchen ETA helpers. The deadline lives on the server (`estimatedReadyAt`);
 * this module only formats a countdown for display. It must never PATCH status.
 */

export interface KitchenCountdown {
  /** Human label, e.g. "8:05" or "Overdue 1:20". */
  label: string;
  overdue: boolean;
  /** True when the API never set an ETA (legacy paid rows). */
  missing: boolean;
}

function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${pad(seconds)}`;
}

export function getKitchenCountdown(
  estimatedReadyAt: string | null | undefined,
  nowMs: number = Date.now(),
): KitchenCountdown {
  if (!estimatedReadyAt) {
    return { label: "No ETA", overdue: false, missing: true };
  }

  const deadline = new Date(estimatedReadyAt).getTime();
  if (Number.isNaN(deadline)) {
    return { label: "No ETA", overdue: false, missing: true };
  }

  const remainingMs = deadline - nowMs;

  if (remainingMs >= 0) {
    return {
      label: formatDuration(Math.ceil(remainingMs / 1000)),
      overdue: false,
      missing: false,
    };
  }

  return {
    label: `Overdue ${formatDuration(Math.ceil(-remainingMs / 1000))}`,
    overdue: true,
    missing: false,
  };
}
