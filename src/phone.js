export function normalizePhoneNumber(value = '') {
  return String(value).replace(/\D/g, '').slice(0, 11);
}

export function formatPhoneNumber(value = '') {
  const digits = normalizePhoneNumber(value);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export function isValidPhoneNumber(value = '') {
  return /^01\d{8,9}$/.test(normalizePhoneNumber(value));
}
