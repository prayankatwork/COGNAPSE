import './CognapseLoader.css';
import clsx from 'clsx';
import BrandLogo from './BrandLogo';

interface CognapseLoaderProps {
  variant?: 'normal' | 'deep';
  stage?: number;
  progress?: string;
}

export default function CognapseLoader({ variant = 'normal', stage, progress }: CognapseLoaderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 mt-8 animate-in fade-in duration-500">
      {/* Brand logo + text */}
      <div className="cognapse-loader__brand">
        <BrandLogo size={36} />
        <div className="cognapse-loader__brand-text">
          COGNAPSE
          <span className="cognapse-loader__cursor" />
        </div>
        <div className="cognapse-loader__scan" />
      </div>

      {/* Progress bar */}
      <div className="cognapse-loader__bar">
        <div className="cognapse-loader__bar-fill" />
      </div>

      {/* Deep research stages */}
      {variant === 'deep' && stage && (
        <div className="flex flex-col items-center">
          <div className="cognapse-loader__stages">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={clsx(
                  'cognapse-loader__stage-dot',
                  s <= stage && 'cognapse-loader__stage-dot--active',
                )}
              />
            ))}
          </div>
          {progress && (
            <p className="cognapse-loader__stage-label">{progress}</p>
          )}
        </div>
      )}
    </div>
  );
}
