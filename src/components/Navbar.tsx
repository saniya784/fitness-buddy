"use client";

import { useState } from "react";
import { SignInButton, SignUpButton, UserButton, useUser } from "@clerk/nextjs";
import {
  DumbbellIcon,
  HomeIcon,
  MenuIcon,
  SettingsIcon,
  UserIcon,
  XIcon,
  ZapIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "./ui/button";

const links = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/generate-program", label: "Generate", icon: DumbbellIcon },
  { href: "/profile", label: "Profile", icon: UserIcon },
  { href: "/settings", label: "Settings", icon: SettingsIcon },
];

function isActivePath(pathname: string, href: string) {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

const Navbar = () => {
  const { isSignedIn } = useUser();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const visibleLinks = isSignedIn ? links : links.slice(0, 1);

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border bg-background/90 py-3 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-sm"
          onClick={() => setMobileOpen(false)}
        >
          <span className="rounded bg-primary/10 p-1">
            <ZapIcon className="size-4 text-primary" aria-hidden="true" />
          </span>
          <span className="font-mono text-xl font-bold">
            FITNESS<span className="text-primary">BUDDY</span>.AI
          </span>
        </Link>

        <nav aria-label="Main navigation" className="hidden items-center gap-5 md:flex">
          {visibleLinks.map(({ href, label, icon: Icon }) => {
            const active = isActivePath(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-sm text-sm transition-colors hover:text-primary ${
                  active ? "font-semibold text-primary" : "text-foreground"
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            );
          })}
          {isSignedIn ? (
            <UserButton />
          ) : (
            <>
              <SignInButton>
                <Button variant="outline">Sign In</Button>
              </SignInButton>
              <SignUpButton>
                <Button>Sign Up</Button>
              </SignUpButton>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3 md:hidden">
          {isSignedIn && <UserButton />}
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <XIcon aria-hidden="true" /> : <MenuIcon aria-hidden="true" />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="absolute left-0 right-0 top-full border-b border-border bg-background p-4 shadow-lg md:hidden"
        >
          <div className="container mx-auto grid gap-2">
            {visibleLinks.map(({ href, label, icon: Icon }) => {
              const active = isActivePath(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 rounded px-3 py-3 text-sm ${
                    active
                      ? "bg-primary/10 font-semibold text-primary"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon size={18} aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
            {!isSignedIn && (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <SignInButton>
                  <Button variant="outline">Sign In</Button>
                </SignInButton>
                <SignUpButton>
                  <Button>Sign Up</Button>
                </SignUpButton>
              </div>
            )}
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
