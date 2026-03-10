'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/useIsMobile';

const navLinks = [
  { href: '/explore', label: 'explore' },
  { href: '/capture', label: 'capture' },
  { href: '/saved', label: 'saved' },
];

export default function Header() {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-30">
      <div className="h-12 border-b border-surface-2 bg-white flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-3 h-3 bg-ink-0" />
          <span className="text-sm font-medium text-ink-0">nodemap</span>
        </Link>

        {/* Desktop nav */}
        {!isMobile && (
          <nav className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs font-mono uppercase tracking-wider transition-colors ${
                  pathname === link.href ? 'text-ink-0' : 'text-ink-3 hover:text-ink-1'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Mobile hamburger */}
        {isMobile && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-ink-2"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
      </div>

      {/* Mobile dropdown menu */}
      {isMobile && menuOpen && (
        <>
          <div
            className="fixed inset-0 top-12 z-20"
            onClick={() => setMenuOpen(false)}
          />
          <nav className="absolute top-12 left-0 right-0 bg-white border-b border-surface-2 z-30 animate-slide-up">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-4 py-3 min-h-[44px] flex items-center text-xs font-mono uppercase tracking-wider transition-colors border-b border-surface-1 ${
                  pathname === link.href
                    ? 'text-ink-0 bg-surface-0'
                    : 'text-ink-3 active:bg-surface-0'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </header>
  );
}
