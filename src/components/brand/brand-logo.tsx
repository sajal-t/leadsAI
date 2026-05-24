import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

const ICON_SRC = "/leadforge-icon.png";

type BrandLogoProps = {
  /** Show wordmark next to the icon */
  showName?: boolean;
  /** Link wrapper href; omit for static logo */
  href?: string;
  className?: string;
  iconClassName?: string;
  nameClassName?: string;
  size?: "sm" | "md" | "lg";
};

const sizes = {
  sm: { icon: 28, text: "text-sm" },
  md: { icon: 36, text: "text-base sm:text-lg" },
  lg: { icon: 44, text: "text-lg sm:text-xl" },
} as const;

export function BrandLogo({
  showName = true,
  href,
  className,
  iconClassName,
  nameClassName,
  size = "md",
}: BrandLogoProps) {
  const s = sizes[size];

  const inner = (
    <>
      <Image
        src={ICON_SRC}
        alt=""
        width={s.icon}
        height={s.icon}
        className={cn("shrink-0 object-contain", iconClassName)}
        priority
      />
      {showName ? (
        <span className={cn("font-semibold tracking-tight text-foreground", s.text, nameClassName)}>
          Lead<span className="text-primary">Forge</span>
        </span>
      ) : null}
    </>
  );

  const classes = cn("inline-flex items-center gap-2.5", className);

  if (href) {
    return (
      <Link href={href} className={classes} aria-label="LeadForge home">
        {inner}
      </Link>
    );
  }

  return <div className={classes}>{inner}</div>;
}

/** Full horizontal logo image (auth / marketing hero) */
export function BrandLogoFull({ className }: { className?: string }) {
  return (
    <Image
      src="/leadforge-logo.png"
      alt="LeadForge"
      width={220}
      height={56}
      className={cn("h-12 w-auto object-contain object-left sm:h-14", className)}
      priority
    />
  );
}
