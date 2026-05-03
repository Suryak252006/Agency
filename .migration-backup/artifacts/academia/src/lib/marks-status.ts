/**
 * Shared mark status presentation metadata.
 *
 * Both the admin lock-review page and the faculty marks-entry page
 * render marks in the same three states. Keeping STATUS_META here
 * ensures the badge colours and labels stay in sync whenever the
 * workflow states change.
 */
export const STATUS_META: Record<string, { label: string; className: string }> = {
  SUBMITTED:    { label: 'Submitted',    className: 'bg-blue-100 text-blue-700' },
  LOCK_PENDING: { label: 'Lock pending', className: 'bg-amber-100 text-amber-700' },
  LOCKED:       { label: 'Locked',       className: 'bg-green-100 text-green-700' },
};
