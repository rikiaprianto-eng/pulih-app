export function formatIDR(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function avatarUrl(seed: string): string {
  const encoded = encodeURIComponent(seed);
  return `https://ui-avatars.com/api/?name=${encoded}&background=0d9488&color=fff&size=256&font-size=0.35&bold=true`;
}
