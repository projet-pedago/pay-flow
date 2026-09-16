/** Photos Unsplash (licence Unsplash, pas de clé API). */
export const photos = {
  office: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1800&q=80",
  payroll: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1600&q=80",
  team: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1600&q=80",
  desk: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1600&q=80",
};

export const ecosystemLogos = [
  { name: "URSSAF", domain: "urssaf.fr" },
  { name: "impots.gouv.fr", domain: "impots.gouv.fr" },
  { name: "Service-Public", domain: "service-public.fr" },
  { name: "Banque de France", domain: "banque-france.fr" },
];

export const stackLogos = [
  { name: "React", slug: "react" },
  { name: "TypeScript", slug: "typescript" },
  { name: "Tailwind CSS", slug: "tailwindcss" },
  { name: "Docker", slug: "docker" },
  { name: "Supabase", slug: "supabase" },
  { name: "GitHub", slug: "github" },
];

export function hostFromUrl(value?: string): string | undefined {
  if (!value) return undefined;
  const raw = value.includes("://") ? value : `https://${value}`;
  try {
    const host = new URL(raw).hostname.replace(/^www\./, "");
    return host || undefined;
  } catch {
    const host = value.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
    return host || undefined;
  }
}

export function companyLogoUrl(domain: string, size = 128): string {
  const host = hostFromUrl(domain) ?? domain;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`;
}

export function simpleIconUrl(slug: string, color = "1f6f5b"): string {
  return `https://cdn.simpleicons.org/${slug}/${color}`;
}
