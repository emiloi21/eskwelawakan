import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { useThemeStore, type ThemeColor } from '@/stores/theme-store';
import { BadgeCheck } from 'lucide-react';

const colors: { value: ThemeColor; bg: string }[] = [
  { value: 'default', bg: 'bg-gray-500' },
  { value: 'blue', bg: 'bg-blue-500' },
];

export function ColorSwitcher() {
  const { color, setColor } = useThemeStore();
  return (
    <Popover>
      <PopoverTrigger className="flex h-7 w-7 items-center justify-center rounded-md border border-input bg-primary text-primary-foreground hover:opacity-80">
        <BadgeCheck className="h-4 w-4" />
      </PopoverTrigger>
      <PopoverContent className="w-fit p-2" align="end">
        <div className="grid grid-cols-2 gap-2">
          {colors.map((c) => (
            <Badge
              key={c.value}
              variant="outline"
              className={cn(
                c.bg,
                'flex h-8 w-8 cursor-pointer items-center justify-center',
              )}
              onClick={() => setColor(c.value)}
            >
              {color === c.value && <BadgeCheck className="h-4 w-4 text-white" />}
            </Badge>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
