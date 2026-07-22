export function formatInt(n: number) {
  return new Intl.NumberFormat("pt-BR").format(n);
}

export function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

export function formatDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(iso));
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "medium",
  }).format(new Date(iso));
}

/** Formats digits as the user types into a Brazilian phone number: (DDD) 9XXXX-XXXX. */
export function formatPhoneInput(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);
  if (rest.length === 0) return `(${ddd}`;

  const isMobile = digits.length > 10;
  const prefixLen = isMobile ? 5 : 4;
  const prefix = rest.slice(0, prefixLen);
  const suffix = rest.slice(prefixLen, prefixLen + 4);

  return suffix ? `(${ddd}) ${prefix}-${suffix}` : `(${ddd}) ${prefix}`;
}
