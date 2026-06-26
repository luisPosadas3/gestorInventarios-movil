import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Icon } from "./Icon";
import { cn } from "@/lib/utils";

type ShellProps = {
  children: ReactNode;
  title?: string;
  back?: boolean;
  hideNav?: boolean;
};

const navItems = [
  { to: "/", label: "Inicio", icon: "dashboard" },
  { to: "/products", label: "Productos", icon: "inventory_2" },
  { to: "/sales", label: "Ventas", icon: "point_of_sale" },
  { to: "/movements", label: "Movimientos", icon: "swap_horiz" },
  { to: "/alerts", label: "Alertas", icon: "notifications" },
] as const;

export function AppShell({ children, title = "Gestor de Inventario", back, hideNav }: ShellProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-dvh bg-background text-on-background pb-24">
      <header className="fixed top-0 left-0 w-full z-40 flex justify-between items-center px-container-padding h-touch-target-min bg-surface border-b border-outline-variant">
        <div className="flex items-center gap-stack-gap min-w-0">
          {back ? (
            <Link
              to="/"
              onClick={(e) => {
                e.preventDefault();
                if (typeof window !== "undefined") window.history.back();
              }}
              className="p-2 -ml-2 rounded-full hover:bg-surface-container-low transition-colors"
              aria-label="Volver"
            >
              <Icon name="arrow_back" className="text-primary" />
            </Link>
          ) : (
            <Icon name="inventory_2" className="text-primary" />
          )}
          <h1 className="font-bold text-primary truncate" style={{ fontSize: 20, lineHeight: "28px" }}>
            {title}
          </h1>
        </div>
        <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant grid place-items-center text-on-surface-variant text-xs font-semibold shrink-0">
          AC
        </div>
      </header>

      <main className="pt-16 px-container-padding max-w-2xl mx-auto">{children}</main>

      {!hideNav && (
        <nav className="fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-2 py-item-gap bg-surface border-t border-outline-variant">
          {navItems.map((item) => {
            const active =
              item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex flex-col items-center justify-center px-3 py-1 rounded-full transition-all duration-150 active:scale-90",
                  active
                    ? "bg-primary-container text-on-primary-container"
                    : "text-on-surface-variant hover:bg-surface-container-high"
                )}
              >
                <Icon name={item.icon} filled={active} />
                <span className="text-[11px] font-medium leading-4">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
