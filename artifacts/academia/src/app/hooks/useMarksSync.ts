import { useCallback, useState } from "react";

export type SyncState = "idle" | "saving" | "saved" | "error";

export function useMarksSync(_examId: string, _userId: string) {
  const [syncState, setSyncState] = useState<SyncState>("idle");

  const queueChange = useCallback(() => {
    setSyncState("saved");
  }, []);

  const retry = useCallback(() => {
    setSyncState("idle");
  }, []);

  return { syncState, queueChange, retry };
}
