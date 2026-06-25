<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\BankEwalletAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class BankAccountController extends Controller
{
    // ── Admin: list all accounts ───────────────────────────────────────────────

    public function index(): JsonResponse
    {
        $accounts = BankEwalletAccount::orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn($a) => $this->format($a));

        return response()->json($accounts);
    }

    // ── Admin: create ──────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'account_type'   => 'required|in:bank,ewallet',
            'provider_name'  => 'required|string|max:100',
            'account_name'   => 'required|string|max:200',
            'account_number' => 'required|string|max:100',
            'branch'         => 'nullable|string|max:200',
            'instructions'   => 'nullable|string|max:2000',
            'is_active'      => 'boolean',
            'sort_order'     => 'integer|min:0',
        ]);

        $account = BankEwalletAccount::create($data);

        return response()->json($this->format($account), 201);
    }

    // ── Admin: update ──────────────────────────────────────────────────────────

    public function update(Request $request, BankEwalletAccount $bankAccount): JsonResponse
    {
        $data = $request->validate([
            'account_type'   => 'sometimes|in:bank,ewallet',
            'provider_name'  => 'sometimes|string|max:100',
            'account_name'   => 'sometimes|string|max:200',
            'account_number' => 'sometimes|string|max:100',
            'branch'         => 'nullable|string|max:200',
            'instructions'   => 'nullable|string|max:2000',
            'is_active'      => 'boolean',
            'sort_order'     => 'integer|min:0',
        ]);

        $bankAccount->update($data);

        return response()->json($this->format($bankAccount->fresh()));
    }

    // ── Admin: delete ──────────────────────────────────────────────────────────

    public function destroy(BankEwalletAccount $bankAccount): JsonResponse
    {
        if ($bankAccount->transferRequests()->where('status', 'pending')->exists()) {
            return response()->json([
                'message' => 'Cannot delete: there are pending transfer requests for this channel.',
            ], 422);
        }

        if ($bankAccount->qr_code_image) {
            Storage::disk('public')->delete($bankAccount->qr_code_image);
        }

        $bankAccount->delete();

        return response()->json(['deleted' => true]);
    }

    // ── Admin: upload / replace QR code ───────────────────────────────────────

    public function uploadQr(Request $request, BankEwalletAccount $bankAccount): JsonResponse
    {
        $request->validate([
            'qr' => 'required|image|mimes:png,jpg,jpeg|max:2048',
        ]);

        if ($bankAccount->qr_code_image) {
            Storage::disk('public')->delete($bankAccount->qr_code_image);
        }

        $path = $request->file('qr')->store('bank-qr', 'public');
        $bankAccount->update(['qr_code_image' => $path]);

        return response()->json([
            'qr_code_url' => asset('storage/' . $path),
        ]);
    }

    // ── Admin: remove QR code ─────────────────────────────────────────────────

    public function removeQr(BankEwalletAccount $bankAccount): JsonResponse
    {
        if ($bankAccount->qr_code_image) {
            Storage::disk('public')->delete($bankAccount->qr_code_image);
            $bankAccount->update(['qr_code_image' => null]);
        }

        return response()->json(['removed' => true]);
    }

    // ── Shared format helper ───────────────────────────────────────────────────

    private function format(BankEwalletAccount $a): array
    {
        return [
            'id'             => $a->id,
            'public_id'      => $a->public_id,
            'account_type'   => $a->account_type,
            'provider_name'  => $a->provider_name,
            'account_name'   => $a->account_name,
            'account_number' => $a->account_number,
            'branch'         => $a->branch,
            'instructions'   => $a->instructions,
            'is_active'      => $a->is_active,
            'sort_order'     => $a->sort_order,
            'qr_code_url'    => $a->qr_code_image
                ? asset('storage/' . $a->qr_code_image)
                : null,
        ];
    }
}
