'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Tag,
  CalendarDays,
  BookOpen,
  Package,
  ShoppingCart,
  Settings,
  History,
  UtensilsCrossed,
} from 'lucide-react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/deals', label: 'Sale Items', icon: Tag },
  { href: '/meal-plan', label: 'Meal Planner', icon: CalendarDays },
  { href: '/recipes', label: 'Recipes', icon: BookOpen },
  { href: '/pantry', label: 'Pantry', icon: Package },
  { href: '/shopping-list', label: 'Shopping List', icon: ShoppingCart },
  { href: '/preferences', label: 'Preferences', icon: Settings },
  { href: '/history', label: 'History', icon: History },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r bg-card">
      <div className="flex h-14 items-center gap-2 px-4 border-b">
        <UtensilsCrossed className="h-5 w-5 text-primary" />
        <span className="font-semibold text-lg">Meal Planner</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
}
