import { cn } from '@/lib/utils';

interface SectionBadgeProps {
  title: string;
  className?: string;
}

export function SectionBadge({ title, className }: SectionBadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full border border-border/60 bg-background/60 px-4 py-1.5 text-sm font-medium backdrop-blur-sm',
        className,
      )}
    >
      {title}
    </div>
  );
}
