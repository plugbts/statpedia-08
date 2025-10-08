export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function toYmd(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}
