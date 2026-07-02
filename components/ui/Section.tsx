import { cn } from "@/lib/utils";
import Container from "./Container";

/**
 * Section wrapper — consistent vertical rhythm for every future section.
 * `contain` wraps children in a Container; set `overflow` off if the section
 * uses a GSAP-pinned child (overflow-hidden breaks pinning).
 */
export default function Section({
  id,
  children,
  className,
  contain = true,
  narrow = false,
  overflowHidden = false,
}: {
  id?: string;
  children: React.ReactNode;
  className?: string;
  contain?: boolean;
  narrow?: boolean;
  overflowHidden?: boolean;
}) {
  return (
    <section
      id={id}
      className={cn(
        "section-padding relative",
        overflowHidden && "overflow-hidden",
        className
      )}
    >
      {contain ? <Container narrow={narrow}>{children}</Container> : children}
    </section>
  );
}
