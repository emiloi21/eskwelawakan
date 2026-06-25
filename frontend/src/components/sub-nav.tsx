import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface SubNavItem {
  to: string;
  label: string;
  end?: boolean;
}

export interface NavCategory {
  label: string;
  icon: React.ElementType;
  /** Direct-link route for standalone categories (no sub-items). */
  to?: string;
  /** If true, active only on exact path match. */
  end?: boolean;
  /** Sub-navigation items rendered in the topbar when this category is active. */
  items: SubNavItem[];
}

/**
 * Determine which category is currently active based on the URL.
 */
export function useActiveCategory(categories: NavCategory[]) {
  const { pathname } = useLocation();
  return categories.find((cat) =>
    cat.to
      ? cat.end
        ? pathname === cat.to
        : pathname.startsWith(cat.to)
      : cat.items.some(
          (item) => pathname === item.to || pathname.startsWith(item.to + '/'),
        ),
  );
}

/**
 * Horizontal tab bar rendered between the site header and page content.
 * Shows the sub-items of whichever category is currently active.
 */
export function SubNav({ categories }: { categories: NavCategory[] }) {
  const active = useActiveCategory(categories);
  if (!active || active.items.length === 0) return null;

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-0.5 overflow-x-auto px-4 lg:px-6">
        {active.items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap',
                isActive
                  ? 'border-primary text-foreground'
                  : 'border-transparent text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground',
              )
            }
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
