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

export function maskPhone(phone: string) {
  // (88) 99123-2210 -> (88) 9####-2210
  const match = phone.match(/^(\(\d{2}\)\s?9)\d{3}(-?\d{4})$/);
  if (!match) return phone;
  return `${match[1]}####${match[2].startsWith("-") ? match[2] : `-${match[2]}`}`;
}
