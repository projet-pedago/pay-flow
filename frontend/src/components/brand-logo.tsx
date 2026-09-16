import { useState } from "react";
import { companyLogoUrl, simpleIconUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

export function BrandLogo({
  name,
  domain,
  className,
}: {
  name: string;
  domain?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();

  if (domain && !failed) {
    return (
      <img
        src={companyLogoUrl(domain)}
        alt=""
        className={cn("h-8 w-8 rounded-lg bg-white object-contain p-0.5", className)}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg bg-sage-dark text-[10px] font-semibold text-white",
        className,
      )}
      aria-hidden
    >
      {initials}
    </div>
  );
}

export function TechIcon({
  name,
  slug,
  color = "ffffff",
  className,
}: {
  name: string;
  slug: string;
  color?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return <span className={cn("text-[10px] font-medium text-white/80", className)}>{name}</span>;
  }
  return (
    <img
      src={simpleIconUrl(slug, color)}
      alt=""
      title={name}
      className={cn("h-5 w-5 object-contain", className)}
      onError={() => setFailed(true)}
    />
  );
}
