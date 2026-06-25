import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { SlidersHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DataTableFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  onReset: () => void;
  activeCount?: number;
}

export function DataTableFilterSheet({
  open,
  onOpenChange,
  children,
  onReset,
  activeCount = 0,
}: DataTableFilterSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[320px] sm:max-w-[320px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Advanced Filters</SheetTitle>
          <SheetDescription>Narrow down table results</SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
          {children}
        </div>
        <SheetFooter className="border-t pt-4">
          <Button variant="outline" className="w-full" onClick={onReset}>
            Reset All Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Toolbar button that opens the filter sheet and shows active filter count */
export function DataTableFilterButton({
  onClick,
  activeCount = 0,
}: {
  onClick: () => void;
  activeCount?: number;
}) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="h-9">
      <SlidersHorizontal className="mr-2 h-4 w-4" />
      Filters
      {activeCount > 0 && (
        <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
          {activeCount}
        </Badge>
      )}
    </Button>
  );
}
