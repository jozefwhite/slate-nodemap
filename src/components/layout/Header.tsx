'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="h-12 border-b border-surface-2 bg-white flex items-center justify-between px-4">
      <Link href="/" className="flex items-center gap-2">
        <div className="w-3 h-3 bg-ink-0" />
        <span className="text-sm font-medium text-ink-0">nodemap</span>
      </Link>

      <nav className="flex items-center gap-6">
        <Link
          href="/explore"
          className={`text-xs font-mono uppercase tracking-wider transition-colors ${
            pathname === '/explore' ? 'text-ink-0' : 'text-ink-3 hover:text-ink-1'
          }`}
        >
          explore
        </Link>
        <Link
          href="/capture"
          className={`text-xs font-mono uppercase tracking-wider transition-colors ${
            pathname === '/capture' ? 'text-ink-0' : 'text-ink-3 hover:text-ink-1'
          }`}
        >
          capture
        </Link>
        <Link
          href="/saved"
          className={`text-xs font-mono uppercase tracking-wider transition-colors ${
            pathname === '/saved' ? 'text-ink-0' : 'text-ink-3 hover:text-ink-1'
          }`}
        >
          saved
        </Link>
      </nav>
    </header>
  );
}
