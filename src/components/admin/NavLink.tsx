import { NavLink as RouterNavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface NavLinkProps {
  to: string;
  end?: boolean;
  className?: string;
  activeClassName?: string;
  children: React.ReactNode;
  title?: string;
}

export default function NavLink({ to, end, className, activeClassName, children, title }: NavLinkProps) {
  return (
    <RouterNavLink
      to={to}
      end={end}
      title={title}
      className={({ isActive }) =>
        cn(
          className,
          isActive && activeClassName
        )
      }
    >
      {children}
    </RouterNavLink>
  );
}
