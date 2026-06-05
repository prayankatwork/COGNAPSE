import './CognapseLoader.css';
import clsx from 'clsx';

interface CognapseLoaderProps {
  variant?: 'normal' | 'deep';
  stage?: number;
  progress?: string;
}

export default function CognapseLoader({ variant = 'normal', stage, progress }: CognapseLoaderProps) {
  const slices = Array.from({ length: 9 }, (_, i) => i + 1);

  return (
    <div className="flex flex-col items-center justify-center py-12 mt-16 animate-in fade-in duration-500">
      <div className={clsx('cognapse-loader', variant === 'deep' && 'mb-4')}>
        <div className="cognapse-loader__inner">
          {slices.map((i) => (
            <div key={i} className="cognapse-loader__text">
              <span>COGNAPSE</span>
            </div>
          ))}
          <div className="cognapse-loader__line" />
        </div>
      </div>

      {variant === 'deep' && stage && (
        <div className="flex flex-col items-center gap-1 mt-2">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={clsx(
                  'w-1.5 h-1.5 rounded-full transition-all duration-500',
                  s <= stage
                    ? 'bg-my-accent shadow-[0_0_6px_rgba(var(--accent-rgb),0.3)]'
                    : 'bg-my-border',
                )}
              />
            ))}
          </div>
          {progress && (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-my-muted mt-1 animate-pulse">
              {progress}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
