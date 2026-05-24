import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type LandingSectionProps = HTMLAttributes<HTMLElement> & {
  id?: string;
};

export function LandingSection({ className, id, children, ...props }: LandingSectionProps) {
  return (
    <section id={id} className={cn("relative scroll-mt-24", className)} {...props}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
    </section>
  );
}

export function LandingSectionPad({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("relative py-20 sm:py-32", className)} {...props} />;
}
