interface ErrorBannerProps {
  message?: string;
}

/**
 * Standardised error banner for query failure states.
 * Intentionally minimal — no icon, no retry button — because the
 * page skeleton already provides context. Pages that need richer
 * recovery UI should compose their own instead of extending this.
 */
export function ErrorBanner({
  message = 'Something went wrong. Please refresh the page.',
}: ErrorBannerProps) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  );
}
