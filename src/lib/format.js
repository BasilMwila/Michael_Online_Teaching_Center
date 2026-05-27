export function formatMoney(amountCents, currency = 'USD') {
  if (amountCents == null) return '';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(amountCents / 100);
  } catch {
    return `${currency} ${(amountCents / 100).toFixed(2)}`;
  }
}

export function formatDateTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  });
}

export function formatDate(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString(undefined, { dateStyle: 'medium' });
}

export function statusBadgeClass(status) {
  switch (status) {
    case 'active':
    case 'confirmed':
    case 'completed':
    case 'attended':
      return 'bg-emerald-100 text-emerald-800';
    case 'pending':
    case 'pending_payment':
    case 'open':
      return 'bg-amber-100 text-amber-800';
    case 'rejected':
    case 'cancelled':
    case 'no_show':
      return 'bg-red-100 text-red-800';
    case 'full':
      return 'bg-gray-200 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}
