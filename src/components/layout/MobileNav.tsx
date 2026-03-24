'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  CalendarDays,
  ShoppingCart,
  Package,
  Menu,
  Tag,
  BookOpen,
  Settings,
  History,
  UtensilsCrossed,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const bottomNavItems = [
  { href: '/', label: 'Home', icon: LayoutDashboard },
  { href: '/meal-plan', label: 'Meals', icon: CalendarDays },
  { href: '/shopping-list', label: 'Shop', icon: ShoppingCart },
  { href: '/pantry', label: 'Pantry', icon: Package },
];

const allNavItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/deals', label: 'Sale Items', icon: Tag },
  { href: '/meal-plan', label: 'Meal Planner', icon: CalendarDays },
  { href: '/recipes', label: 'Recipes', icon: BookOpen },
  { href: '/pantry', label: 'Pantry', icon: Package },
  { href: '/shopping-list', label: 'Shopping List', icon: ShoppingCart },
  { href: '/preferences', label: 'Preferences', icon: Settings },
  { href: '/history', label: 'History', icon: History },
];

export function MobileNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Top bar with hamburger menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between border-b bg-card px-4">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-primary" />
          <span className="font-semibold">Meal Planner</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" />}>
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-14 items-center gap-2 px-4 border-b">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              <span className="font-semibold">Meal Planner</span>
            </div>
            <nav className="py-4 px-2">
              <ul className="space-y-1">
                {allNavItems.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/' && pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setOpen(false)}
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
          </SheetContent>
        </Sheet>
      </div>

      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
        <ul className="flex justify-around py-2">
          {bottomNavItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex flex-col items-center gap-1 px-3 py-1 text-xs transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
