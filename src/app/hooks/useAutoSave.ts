import { useEffect, useState } from "react";

export function useAutoSave(data: unknown, enabled: boolean, delay = 800) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;

    setIsSaving(true);
    const timer = setTimeout(() => {
      setIsSaving(false);
      setLastSavedAt(Date.now());
    }, delay);
    return () => clearTimeout(timer);
  }, [data, enabled, delay]);

  return { isSaving, lastSavedAt };
}
