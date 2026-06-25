import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, QrCode, Building2, Wallet, ImageOff, X } from 'lucide-react';

interface BankAccount {
  id: number;
  public_id: string;
  account_type: 'bank' | 'ewallet';
  provider_name: string;
  account_name: string;
  account_number: string;
  branch: string | null;
  instructions: string | null;
  is_active: boolean;
  sort_order: number;
  qr_code_url: string | null;
}

const EWALLET_PROVIDERS = ['GCash', 'Maya', 'GrabPay', 'ShopeePay', 'PayMaya', 'Other'];
const BANK_PROVIDERS = [
  'BDO', 'BPI', 'Metrobank', 'UnionBank', 'Security Bank', 'Chinabank',
  'PNB', 'Landbank', 'DBP', 'RCBC', 'EastWest Bank', 'Other',
];

type FormData = {
  account_type: 'bank' | 'ewallet';
  provider_name: string;
  account_name: string;
  account_number: string;
  branch: string;
  instructions: string;
  is_active: boolean;
  sort_order: string;
};

const EMPTY_FORM: FormData = {
  account_type: 'bank',
  provider_name: '',
  account_name: '',
  account_number: '',
  branch: '',
  instructions: '',
  is_active: true,
  sort_order: '0',
};

export default function BankAccountsPage() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<BankAccount | null>(null);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const { data: accounts = [], isLoading } = useQuery<BankAccount[]>({
    queryKey: ['admin-bank-accounts'],
    queryFn: async () => {
      const { data } = await api.get('/admin/bank-accounts');
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: FormData) => {
      const body = {
        ...payload,
        sort_order: Number(payload.sort_order) || 0,
      };
      if (editTarget) {
        const { data } = await api.put(`/admin/bank-accounts/${editTarget.public_id}`, body);
        return data;
      }
      const { data } = await api.post('/admin/bank-accounts', body);
      return data;
    },
    onSuccess: () => {
      toast.success(editTarget ? 'Account updated.' : 'Account created.');
      qc.invalidateQueries({ queryKey: ['admin-bank-accounts'] });
      setDialogOpen(false);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Failed to save account.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (account: BankAccount) => {
      await api.delete(`/admin/bank-accounts/${account.public_id}`);
    },
    onSuccess: () => {
      toast.success('Account deleted.');
      qc.invalidateQueries({ queryKey: ['admin-bank-accounts'] });
      setDeleteTarget(null);
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e.response?.data?.message ?? 'Cannot delete this account.');
    },
  });

  const qrMutation = useMutation({
    mutationFn: async ({ account, file }: { account: BankAccount; file: File }) => {
      const fd = new FormData();
      fd.append('qr', file);
      const { data } = await api.post(`/admin/bank-accounts/${account.public_id}/qr`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return data;
    },
    onSuccess: () => {
      toast.success('QR code uploaded.');
      qc.invalidateQueries({ queryKey: ['admin-bank-accounts'] });
    },
    onError: () => toast.error('QR upload failed.'),
  });

  const removeQrMutation = useMutation({
    mutationFn: async (account: BankAccount) => {
      await api.delete(`/admin/bank-accounts/${account.public_id}/qr`);
    },
    onSuccess: () => {
      toast.success('QR code removed.');
      qc.invalidateQueries({ queryKey: ['admin-bank-accounts'] });
    },
    onError: () => toast.error('Failed to remove QR code.'),
  });

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  }

  function openEdit(a: BankAccount) {
    setEditTarget(a);
    setForm({
      account_type: a.account_type,
      provider_name: a.provider_name,
      account_name: a.account_name,
      account_number: a.account_number,
      branch: a.branch ?? '',
      instructions: a.instructions ?? '',
      is_active: a.is_active,
      sort_order: String(a.sort_order),
    });
    setDialogOpen(true);
  }

  function triggerQrUpload(account: BankAccount) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) qrMutation.mutate({ account, file });
    };
    input.click();
  }

  const providerOptions =
    form.account_type === 'bank' ? BANK_PROVIDERS : EWALLET_PROVIDERS;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payment Channels</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Bank accounts and e-wallets students / parents can transfer to. The QR
            code and account details are shown to students on their ledger page.
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Channel
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-12 justify-center">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : accounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No payment channels configured</p>
            <p className="text-sm mt-1">Add your school's bank or e-wallet accounts so students can see where to transfer payments.</p>
            <Button className="mt-4" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" /> Add First Channel
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <Card key={a.id} className={a.is_active ? '' : 'opacity-60'}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {a.account_type === 'bank' ? (
                      <Building2 className="h-5 w-5 text-primary flex-shrink-0" />
                    ) : (
                      <Wallet className="h-5 w-5 text-primary flex-shrink-0" />
                    )}
                    <CardTitle className="text-base leading-tight">{a.provider_name}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant={a.account_type === 'bank' ? 'secondary' : 'outline'} className="text-xs">
                      {a.account_type === 'bank' ? 'Bank' : 'E-Wallet'}
                    </Badge>
                    {a.is_active ? (
                      <Badge variant="default" className="text-xs bg-green-600">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-muted-foreground">Inactive</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <p className="font-medium text-sm">{a.account_name}</p>
                  <p className="font-mono text-sm text-muted-foreground">{a.account_number}</p>
                  {a.branch && <p className="text-xs text-muted-foreground">{a.branch}</p>}
                  {a.instructions && (
                    <p className="text-xs text-muted-foreground italic mt-1 line-clamp-2">{a.instructions}</p>
                  )}
                </div>

                {/* QR code display */}
                {a.qr_code_url ? (
                  <div className="relative group">
                    <img
                      src={a.qr_code_url}
                      alt="QR Code"
                      className="w-full max-w-[140px] rounded-md border mx-auto"
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeQrMutation.mutate(a)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ImageOff className="h-3.5 w-3.5" />
                    No QR code
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(a)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => triggerQrUpload(a)}>
                    <QrCode className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeleteTarget(a)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTarget ? 'Edit Payment Channel' : 'Add Payment Channel'}</DialogTitle>
            <DialogDescription>
              Configure account details visible to students and parents on their ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Account Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Account Type *</Label>
                <Select
                  value={form.account_type}
                  onValueChange={(v) => setForm(f => ({
                    ...f,
                    account_type: v as 'bank' | 'ewallet',
                    provider_name: '',
                  }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank">Bank Account</SelectItem>
                    <SelectItem value="ewallet">E-Wallet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Provider *</Label>
                <Select
                  value={form.provider_name}
                  onValueChange={(v) => setForm(f => ({ ...f, provider_name: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    {providerOptions.map(p => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.provider_name === 'Other' && (
                  <Input
                    placeholder="Enter provider name"
                    value={form.provider_name === 'Other' ? '' : form.provider_name}
                    onChange={(e) => setForm(f => ({ ...f, provider_name: e.target.value }))}
                    className="mt-1.5"
                  />
                )}
              </div>
            </div>

            {/* Account Name */}
            <div className="space-y-1.5">
              <Label>Account Name *</Label>
              <Input
                placeholder="e.g. SVHS School Fund"
                value={form.account_name}
                onChange={(e) => setForm(f => ({ ...f, account_name: e.target.value }))}
              />
            </div>

            {/* Account Number */}
            <div className="space-y-1.5">
              <Label>{form.account_type === 'bank' ? 'Account Number *' : 'Mobile Number / Account *'}</Label>
              <Input
                placeholder={form.account_type === 'bank' ? '1234-5678-9012' : '09XX-XXX-XXXX'}
                value={form.account_number}
                onChange={(e) => setForm(f => ({ ...f, account_number: e.target.value }))}
              />
            </div>

            {/* Branch (bank only) */}
            {form.account_type === 'bank' && (
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <Input
                  placeholder="e.g. Main Branch, Quezon City"
                  value={form.branch}
                  onChange={(e) => setForm(f => ({ ...f, branch: e.target.value }))}
                />
              </div>
            )}

            {/* Instructions */}
            <div className="space-y-1.5">
              <Label>Student Instructions</Label>
              <Textarea
                placeholder="e.g. Use student ID as reference. Send screenshot to registrar after transfer."
                value={form.instructions}
                onChange={(e) => setForm(f => ({ ...f, instructions: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Sort order + Active */}
            <div className="grid grid-cols-2 gap-3 items-end">
              <div className="space-y-1.5">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.sort_order}
                  onChange={(e) => setForm(f => ({ ...f, sort_order: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2 pb-2">
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))}
                />
                <Label>Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending || !form.provider_name || !form.account_name || !form.account_number}
            >
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {editTarget ? 'Save Changes' : 'Create Channel'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Payment Channel</DialogTitle>
            <DialogDescription>
              Delete <strong>{deleteTarget?.provider_name}</strong> — {deleteTarget?.account_name}?
              This cannot be undone. Channels with pending transfer requests cannot be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <input ref={qrInputRef} type="file" accept="image/*" className="hidden" />
    </div>
  );
}
