import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CalendarSearch, RotateCcw } from 'lucide-react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';
import { useLookups } from '@/hooks/use-lookups';
import { SEMESTERS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import type { User } from '@/types';

export function DataSourceSwitcher() {
  const { user, setUser, filterBySem, setFilterBySem } = useAuthStore();
  const { data: lookups } = useLookups();
  const [open, setOpen] = useState(false);
  const [sy, setSy] = useState(user?.selected_sy || '');
  const [sem, setSem] = useState(user?.selected_sem || '');

  const isOverridden = !!(user?.selected_sy || user?.selected_sem);
  const displaySy = user?.selected_sy || lookups?.active_school_year || '—';
  const displaySem = user?.selected_sem || lookups?.active_semester || '';
  const displayLabel = displaySem ? `${displaySem} S.Y. ${displaySy}` : `S.Y. ${displaySy}`;

  const mutation = useMutation({
    mutationFn: async (payload: { selected_sy: string; selected_sem: string }) => {
      const { data } = await api.put('/auth/profile', payload);
      return data.user as User;
    },
    onSuccess: (updated) => {
      setUser(updated);
      setOpen(false);
      toast.success('Data source updated');
    },
    onError: () => toast.error('Failed to update data source'),
  });

  const handleApply = () => {
    mutation.mutate({ selected_sy: sy, selected_sem: sem });
  };

  const handleReset = () => {
    mutation.mutate({ selected_sy: '', selected_sem: '' });
    setSy('');
    setSem('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="ghost" size="sm" className="gap-1.5 text-xs" />}>
        <CalendarSearch className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{displayLabel}</span>
        {isOverridden && (
          <Badge variant="secondary" className="ml-1 px-1 py-0 text-[10px] leading-tight">
            Override
          </Badge>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="space-y-3">
          <div className="text-sm font-medium">Data Source</div>
          <p className="text-xs text-muted-foreground">
            Override the school year and semester for viewing data. This only affects your session.
          </p>

          <div className="space-y-2">
            <Label className="text-xs">School Year</Label>
            <Select value={sy} onValueChange={(v) => setSy(v ?? '')}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={lookups?.active_school_year || 'Select SY'} />
              </SelectTrigger>
              <SelectContent>
                {lookups?.school_years.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                    {s === lookups.active_school_year && ' (Active)'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Semester</Label>
            <Select value={sem} onValueChange={(v) => setSem(v ?? '')}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder={lookups?.active_semester || 'Select Semester'} />
              </SelectTrigger>
              <SelectContent>
                {SEMESTERS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button size="sm" className="flex-1 h-8 text-xs" onClick={handleApply} disabled={mutation.isPending}>
              Apply
            </Button>
            {isOverridden && (
              <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={handleReset} disabled={mutation.isPending}>
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            )}
          </div>

          {displaySem && (
            <>
              <div className="border-t border-border" />
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="dss-filter-sem" className="text-xs cursor-pointer leading-snug">
                  Filter by semester
                  <span className="block text-[11px] text-muted-foreground font-normal">
                    Narrows counts to {displaySem} only.
                    Turn off for Nursery–G10 and SHS accounts.
                  </span>
                </Label>
                <Switch
                  id="dss-filter-sem"
                  size="sm"
                  checked={filterBySem}
                  onCheckedChange={setFilterBySem}
                />
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
