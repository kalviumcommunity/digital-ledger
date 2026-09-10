"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpenText, LogOut, Layers, Users } from "lucide-react";
import { logout } from "@/app/actions/auth";
import { getInitials } from "@/lib/format";
import type { CurrentUser } from "@/lib/types";

interface AppHeaderProps {
  user: CurrentUser;
}

const navItems = [
  { href: "/transactions", label: "Transactions", icon: Layers },
  { href: "/customers", label: "Customers", icon: Users },
];

export function AppHeader({ user }: AppHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
    router.refresh();
  };

  return (
    <header className="bg-white/90 backdrop-blur border-b border-slate-200/80 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-8">
          <Link href="/transactions" className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center">
              <BookOpenText className="w-4 h-4" />
            </div>
            <span className="text-base font-black text-slate-900 tracking-tight">
              KhataBook
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active =
                pathname === item.href ||
                (item.href === "/customers" && pathname.startsWith("/customers"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                    active
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
              {getInitials(user.name)}
            </div>
            <div className="hidden sm:block text-right leading-tight">
              <p className="text-xs font-semibold text-slate-900">{user.name}</p>
              <p className="text-[10px] text-slate-500 capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}