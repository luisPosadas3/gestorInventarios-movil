import { cn } from "@/lib/utils";

type Props = {
  name: string;
  filled?: boolean;
  className?: string;
  style?: React.CSSProperties;
};

export function Icon({ name, filled, className, style }: Props) {
  return (
    <span
      className={cn("material-symbols-outlined select-none", filled && "filled", className)}
      style={style}
      aria-hidden
    >
      {name}
    </span>
  );
}
