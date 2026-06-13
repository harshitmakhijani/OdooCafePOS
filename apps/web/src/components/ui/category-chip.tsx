import { cn } from '@/lib/utils';

interface CategoryChipProps {
  name: string;
  /** Hex color from the category data — never hardcoded. */
  color: string;
  className?: string;
  onClick?: () => void;
  active?: boolean;
}

/** Category badge — reads color from data, renders a color swatch + name. */
export function CategoryChip({ name, color, className, onClick, active }: CategoryChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border-[1.5px] border-cafe-text whitespace-nowrap transition-all duration-100',
        active
          ? 'shadow-none translate-x-[1px] translate-y-[1px]'
          : 'shadow-neo-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none',
        className,
      )}
      style={{
        backgroundColor: active ? color : 'var(--surface)',
        color: active ? '#fff' : 'var(--text)',
      }}
    >
      <span
        className="inline-block h-2.5 w-2.5 rounded-full border border-cafe-text shrink-0"
        style={{ backgroundColor: color }}
      />
      {name}
    </button>
  );
}
