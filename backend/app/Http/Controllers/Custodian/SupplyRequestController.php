<?php

namespace App\Http\Controllers\Custodian;

use App\Http\Controllers\Controller;
use App\Models\ConsumableItem;
use App\Models\ConsumableTransaction;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\SupplyRequest;
use App\Models\SupplyRequestItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupplyRequestController extends Controller
{
    // ── All authenticated users ──────────────────────────────────────────────

    /** List the current user's own requests */
    public function myRequests(Request $request): JsonResponse
    {
        $requests = SupplyRequest::with(['items', 'reviewer:id,fname,lname'])
            ->where('requester_id', $request->user()->id)
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at')
            ->paginate(20);

        return response()->json($requests);
    }

    /** Create a new supply request */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'purpose'       => 'nullable|string|max:200',
            'notes'         => 'nullable|string',
            'items'         => 'required|array|min:1',
            'items.*.item_id'            => 'nullable|exists:consumable_items,id',
            'items.*.item_name'          => 'required|string|max:200',
            'items.*.unit'               => 'nullable|string|max:30',
            'items.*.quantity_requested' => 'required|integer|min:1',
            'items.*.remarks'            => 'nullable|string',
        ]);

        $supplyRequest = SupplyRequest::create([
            'requester_id' => $request->user()->id,
            'purpose'      => $data['purpose'] ?? null,
            'notes'        => $data['notes'] ?? null,
        ]);

        foreach ($data['items'] as $item) {
            $supplyRequest->items()->create([
                'item_id'            => $item['item_id'] ?? null,
                'item_name'          => $item['item_name'],
                'unit'               => $item['unit'] ?? 'pcs',
                'quantity_requested' => $item['quantity_requested'],
                'remarks'            => $item['remarks'] ?? null,
            ]);
        }

        return response()->json(['data' => $supplyRequest->load('items')], 201);
    }

    /** Cancel own request (only if still Pending) */
    public function cancel(Request $request, string $publicId): JsonResponse
    {
        $sr = SupplyRequest::findByPublicIdOrFail($publicId);

        if ($sr->requester_id !== $request->user()->id) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        if ($sr->status !== 'Pending') {
            return response()->json(['message' => 'Only pending requests can be cancelled.'], 422);
        }

        $sr->update(['status' => 'Cancelled']);
        return response()->json(['data' => $sr]);
    }

    // ── Custodian / Admin ────────────────────────────────────────────────────

    /** List all supply requests */
    public function allRequests(Request $request): JsonResponse
    {
        $requests = SupplyRequest::with(['requester:id,fname,lname', 'items', 'reviewer:id,fname,lname'])
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->orderByDesc('created_at')
            ->paginate(25);

        return response()->json($requests);
    }

    /** Approve a pending request */
    public function approve(Request $request, string $publicId): JsonResponse
    {
        $sr = SupplyRequest::findByPublicIdOrFail($publicId);

        if ($sr->status !== 'Pending') {
            return response()->json(['message' => 'Only pending requests can be approved.'], 422);
        }

        $data = $request->validate(['remarks' => 'nullable|string']);

        $sr->update([
            'status'           => 'Approved',
            'reviewed_by_id'   => $request->user()->id,
            'reviewer_remarks' => $data['remarks'] ?? null,
            'reviewed_at'      => now(),
        ]);

        return response()->json(['data' => $sr]);
    }

    /** Reject a pending request */
    public function reject(Request $request, string $publicId): JsonResponse
    {
        $sr = SupplyRequest::findByPublicIdOrFail($publicId);

        if ($sr->status !== 'Pending') {
            return response()->json(['message' => 'Only pending requests can be rejected.'], 422);
        }

        $data = $request->validate(['remarks' => 'required|string']);

        $sr->update([
            'status'           => 'Rejected',
            'reviewed_by_id'   => $request->user()->id,
            'reviewer_remarks' => $data['remarks'],
            'reviewed_at'      => now(),
        ]);

        return response()->json(['data' => $sr]);
    }

    /**
     * Fulfill an approved request.
     * Optionally deducts from consumable inventory if items are linked.
     */
    public function fulfill(Request $request, string $publicId): JsonResponse
    {
        $sr = SupplyRequest::findByPublicIdOrFail($publicId);

        if ($sr->status !== 'Approved') {
            return response()->json(['message' => 'Only approved requests can be fulfilled.'], 422);
        }

        $data = $request->validate([
            'items'                       => 'required|array',
            'items.*.id'                  => 'required|integer|exists:supply_request_items,id',
            'items.*.quantity_fulfilled'  => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($sr, $data, $request) {
            foreach ($data['items'] as $itemData) {
                /** @var SupplyRequestItem $requestItem */
                $requestItem = SupplyRequestItem::findOrFail($itemData['id']);
                $fulfilled   = min((int) $itemData['quantity_fulfilled'], $requestItem->quantity_requested);
                $requestItem->update(['quantity_fulfilled' => $fulfilled]);

                // If linked to a consumable item, deduct stock
                if ($requestItem->item_id && $fulfilled > 0) {
                    $consumable = ConsumableItem::with('category')->find($requestItem->item_id);
                    if ($consumable) {
                        if ($consumable->quantity_on_hand < $fulfilled) {
                            throw new \RuntimeException(
                                "Insufficient stock for {$consumable->name}. On hand: {$consumable->quantity_on_hand}."
                            );
                        }
                        ConsumableTransaction::create([
                            'item_id'      => $consumable->id,
                            'type'         => 'out',
                            'quantity'     => $fulfilled,
                            'reference_no' => "SR-{$sr->public_id}",
                            'remarks'      => "Fulfilled supply request",
                            'performed_by' => $request->user()->id,
                            'transacted_at' => now(),
                        ]);
                        $consumable->decrement('quantity_on_hand', $fulfilled);

                        // Auto-post GL journal entry if category has GL accounts and a unit cost
                        $category = $consumable->category;
                        if ($category?->gl_asset_account_id && $category?->gl_expense_account_id) {
                            $unitCost = (float) ($consumable->unit_cost ?? 0);
                            $amount   = $unitCost * $fulfilled;
                            if ($amount > 0) {
                                $this->postGlEntry(
                                    description:   "Supply issuance: {$consumable->name} x{$fulfilled} (SR-{$sr->public_id})",
                                    referenceType: 'supply_request',
                                    referenceId:   (string) $sr->id,
                                    schoolYear:    null,
                                    createdBy:     $request->user()->id,
                                    lines:         [
                                        ['coa_id' => $category->gl_expense_account_id, 'debit' => $amount, 'credit' => 0,       'memo' => "Supplies expense"],
                                        ['coa_id' => $category->gl_asset_account_id,   'debit' => 0,       'credit' => $amount, 'memo' => "Supplies inventory"],
                                    ]
                                );
                            }
                        }
                    }
                }
            }

            $sr->update(['status' => 'Fulfilled', 'fulfilled_at' => now()]);
        });

        return response()->json(['data' => $sr->load('items')]);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    /**
     * @param  array<int, array{coa_id: int, debit: float, credit: float, memo: string|null}>  $lines
     */
    private function postGlEntry(
        string  $description,
        string  $referenceType,
        string  $referenceId,
        ?string $schoolYear,
        int     $createdBy,
        array   $lines
    ): JournalEntry {
        $entryNo = 'JE-' . now()->format('Ymd') . '-' . str_pad(
            JournalEntry::whereDate('created_at', today())->count() + 1,
            4, '0', STR_PAD_LEFT
        );

        /** @var JournalEntry $entry */
        $entry = JournalEntry::create([
            'entry_no'       => $entryNo,
            'entry_date'     => now()->toDateString(),
            'description'    => $description,
            'reference_type' => $referenceType,
            'reference_id'   => $referenceId,
            'status'         => 'Posted',
            'schoolYear'     => $schoolYear,
            'created_by'     => $createdBy,
            'posted_by'      => $createdBy,
            'posted_at'      => now(),
        ]);

        foreach ($lines as $line) {
            JournalEntryLine::create([
                'je_id'  => $entry->je_id,
                'coa_id' => $line['coa_id'],
                'debit'  => $line['debit'],
                'credit' => $line['credit'],
                'memo'   => $line['memo'] ?? null,
            ]);
        }

        return $entry;
    }
}
