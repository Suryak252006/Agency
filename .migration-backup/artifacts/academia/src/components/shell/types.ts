import type { ReactNode } from 'react';
import {
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  History,
  LayoutDashboard,
  LayoutGrid,
  Settings2,
  Users,
} from 'lucide-react';

export const ICONS = {
  dashboard: LayoutDashboard,
  classes: BookOpen,
  students: Users,
  requests: ClipboardList,
  logs: History,
  faculty: LayoutGrid,
  'academic-years': CalendarDays,
  grades: GraduationCap,
  setup: Settings2,
} as const;

export type AppShellNavItem = {
  label: string;
  href: string;
  icon: keyof typeof ICONS;
  exact?: boolean;
};

export type AppShellProps = {
  brand: string;
  title: string;
  description: string;
  navItems: AppShellNavItem[];
  primaryAction?: {
    label: string;
    href: string;
  };
  children: ReactNode;
};
