import { useStore } from '../store';
import { Search } from 'lucide-react';
import { useState } from 'react';

export default function Onboarding() {
  const setHasOnboarded = useStore((state) => state.setHasOnboarded);
  const setInitialQuery = useStore((state) => state.setInitialQuery);
  const [query, setQuery] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setIsStarting(true);
    setInitialQuery(query.trim());
    setHasOnboarded(true);
  };

  return (
    <div className="flex h-screen bg-my-bg text-my-ink font-sans items-center justify-center p-6 relative overflow-hidden">
      <div className="z-10 max-w-2xl w-full flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-tight mb-6 text-my-accent">
          COGNAPSE
        </h1>
        <p className="text-xl md:text-2xl font-light text-my-syn mb-2">
          I'm your personal research analyst.
        </p>
        <p className="text-my-muted mb-12 max-w-md">
          Ask me anything — I'll search the internet, synthesize what matters,
          and give you a structured report in seconds.
        </p>

        <form onSubmit={handleSubmit} className="w-full relative shadow-[0_4px_24px_rgba(42,67,101,0.1)]">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What would you like to research?"
            autoFocus
            className="w-full bg-white border border-my-border rounded-none py-4 pl-6 pr-14 text-my-ink focus:outline-none focus:border-my-accent transition-all text-lg"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="absolute right-2 top-2 bottom-2 aspect-square text-my-accent hover:text-my-ink flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search size={24} />
          </button>
        </form>
        <p className="mt-6 text-xs text-my-muted uppercase tracking-widest font-mono">
          No signup needed for your first search
        </p>
      </div>
    </div>
  );
}
