'use client';

import SearchInput from '@/components/ui/SearchInput';

export default function Home() {
  return (
    <div className="min-h-screen dot-grid flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-md w-full">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-4 h-4 bg-ink-0" />
          <span className="text-sm font-medium text-ink-0">nodemap</span>
        </div>

        <p className="text-sm text-ink-2 mb-8 leading-relaxed">
          Start with a word, an idea, an image.
          <br />
          Watch it branch into a web of connections.
        </p>

        <SearchInput />

        <p className="text-2xs font-mono uppercase tracking-wider text-ink-3 mt-8">
          wikipedia &middot; dictionary &middot; your captures
        </p>
      </div>
    </div>
  );
}
