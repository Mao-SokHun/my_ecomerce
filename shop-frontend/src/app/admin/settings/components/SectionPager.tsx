'use client';

interface SectionPagerProps {
  previousLabel: string;
  nextLabel: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

export default function SectionPager({
  previousLabel,
  nextLabel,
  canGoPrevious,
  canGoNext,
  onPrevious,
  onNext,
}: SectionPagerProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canGoPrevious}
        className="btn-secondary px-4 py-2 rounded-lg disabled:opacity-40"
      >
        {previousLabel}
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={!canGoNext}
        className="btn-secondary px-4 py-2 rounded-lg disabled:opacity-40"
      >
        {nextLabel}
      </button>
    </div>
  );
}
