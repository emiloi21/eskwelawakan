<?php

namespace App\Http\Controllers\Custodian;

use App\Http\Controllers\Controller;
use App\Models\ConsumableCategory;
use App\Models\ConsumableItem;
use App\Models\ConsumableTransaction;
use App\Models\FacilityBooking;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use App\Models\PropertyCategory;
use App\Models\PropertyItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CustodianController extends Controller
{
    // ── Dashboard ────────────────────────────────────────────────────────────

    public function dashboard(): JsonResponse
    {
        $totalProperty  = PropertyItem::whereIn('status', ['Active', 'In Repair'])->count();
        $condemned      = PropertyItem::where('status', 'Condemned')->orWhere('condition', 'Condemned')->count();
        $lowStock       = ConsumableItem::whereColumn('quantity_on_hand', '<=', 'reorder_point')->count();
        $pendingBookings = FacilityBooking::where('status', 'Pending')->count();

        // Low stock items (top 5)
        $lowStockItems = ConsumableItem::with('category:id,name')
            ->whereColumn('quantity_on_hand', '<=', 'reorder_point')
            ->orderBy('quantity_on_hand')
            ->limit(5)
            ->get(['id', 'public_id', 'name', 'unit', 'quantity_on_hand', 'reorder_point', 'category_id']);

        // Property breakdown by condition
        $conditionBreakdown = PropertyItem::select('condition', DB::raw('count(*) as total'))
            ->whereIn('status', ['Active', 'In Repair'])
            ->groupBy('condition')
            ->pluck('total', 'condition');

        // Today's approved bookings
        $todayBookings = FacilityBooking::with('facility:id,name')
            ->where('status', 'Approved')
            ->where('event_date', now()->toDateString())
            ->orderBy('start_time')
            ->get(['id', 'public_id', 'title', 'facility_id', 'start_time', 'end_time', 'attendee_count']);

        return response()->json([
            'data' => compact(
                'totalProperty', 'condemned', 'lowStock', 'pendingBookings',
                'lowStockItems', 'conditionBreakdown', 'todayBookings'
            ),
        ]);
    }

    // ── Property Categories ──────────────────────────────────────────────────

    public function propertyCategories(): JsonResponse
    {
        $cats = PropertyCategory::withCount('items')->orderBy('name')->get();
        return response()->json(['data' => $cats]);
    }

    public function storePropertyCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                       => 'required|string|max:100|unique:property_categories,name',
            'description'                => 'nullable|string',
            'gl_asset_account_id'        => 'nullable|integer|exists:chart_of_accounts,coa_id',
            'gl_accum_depr_account_id'   => 'nullable|integer|exists:chart_of_accounts,coa_id',
            'gl_depr_expense_account_id' => 'nullable|integer|exists:chart_of_accounts,coa_id',
        ]);
        return response()->json(['data' => PropertyCategory::create($data)], 201);
    }

    public function updatePropertyCategory(Request $request, string $publicId): JsonResponse
    {
        $cat  = PropertyCategory::findByPublicIdOrFail($publicId);
        $data = $request->validate([
            'name'                       => 'required|string|max:100|unique:property_categories,name,' . $cat->id,
            'description'                => 'nullable|string',
            'gl_asset_account_id'        => 'nullable|integer|exists:chart_of_accounts,coa_id',
            'gl_accum_depr_account_id'   => 'nullable|integer|exists:chart_of_accounts,coa_id',
            'gl_depr_expense_account_id' => 'nullable|integer|exists:chart_of_accounts,coa_id',
        ]);
        $cat->update($data);
        return response()->json(['data' => $cat]);
    }

    public function destroyPropertyCategory(string $publicId): JsonResponse
    {
        $cat = PropertyCategory::findByPublicIdOrFail($publicId);
        if ($cat->items()->exists()) {
            return response()->json(['message' => 'Category has existing property items.'], 422);
        }
        $cat->delete();
        return response()->json(null, 204);
    }

    // ── Property Items ───────────────────────────────────────────────────────

    public function propertyItems(Request $request): JsonResponse
    {
        $q = PropertyItem::with('category:id,name')
            ->when($request->search, fn($q, $s) =>
                $q->where('name', 'like', "%$s%")
                  ->orWhere('property_no', 'like', "%$s%")
                  ->orWhere('brand', 'like', "%$s%")
            )
            ->when($request->category_id, fn($q, $id) => $q->where('category_id', $id))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->condition, fn($q, $c) => $q->where('condition', $c))
            ->orderBy('name');

        return response()->json($q->paginate((int) ($request->per_page ?? 30)));
    }

    public function showPropertyItem(string $publicId): JsonResponse
    {
        $item = PropertyItem::with('category:id,name')->findByPublicIdOrFail($publicId);
        return response()->json(['data' => $item]);
    }

    public function storePropertyItem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'property_no'          => 'required|string|max:60|unique:property_items,property_no',
            'name'                 => 'required|string|max:150',
            'category_id'          => 'nullable|integer|exists:property_categories,id',
            'brand'                => 'nullable|string|max:80',
            'model'                => 'nullable|string|max:80',
            'serial_no'            => 'nullable|string|max:100',
            'condition'            => 'nullable|in:Good,Fair,Poor,Condemned',
            'status'               => 'nullable|in:Active,In Repair,Disposed,Lost',
            'location'             => 'nullable|string|max:150',
            'date_acquired'        => 'nullable|date',
            'acquisition_cost'     => 'nullable|numeric|min:0',
            'useful_life_years'    => 'nullable|integer|min:1',
            'depreciation_method'  => 'nullable|in:Straight-Line,Double-Declining,None',
            'salvage_value'        => 'nullable|numeric|min:0',
            'assigned_to'          => 'nullable|string|max:150',
            'remarks'              => 'nullable|string',
        ]);

        $item = DB::transaction(function () use ($data, $request) {
            $item = PropertyItem::create($data);

            // Auto-post acquisition JE if category has a GL asset account
            if ($item->category_id && $item->acquisition_cost > 0) {
                $category = PropertyCategory::find($item->category_id);
                if ($category?->gl_asset_account_id) {
                    $this->postGlEntry(
                        description:   "Property acquisition: {$item->name} ({$item->property_no})",
                        referenceType: 'property_acquisition',
                        referenceId:   (string) $item->id,
                        schoolYear:    null,
                        createdBy:     $request->user()->id,
                        lines:         [
                            // Debit: Asset account
                            ['coa_id' => $category->gl_asset_account_id, 'debit' => $item->acquisition_cost, 'credit' => 0, 'memo' => $item->property_no],
                            // Credit: Unspecified payable placeholder (contra — no GL payable configured on category)
                            // If school has a default AP account in preferences it can be wired later
                        ]
                    );
                }
            }

            return $item;
        });

        return response()->json(['data' => $item->load('category:id,name')], 201);
    }

    public function updatePropertyItem(Request $request, string $publicId): JsonResponse
    {
        $item = PropertyItem::findByPublicIdOrFail($publicId);
        $data = $request->validate([
            'property_no'         => 'required|string|max:60|unique:property_items,property_no,' . $item->id,
            'name'                => 'required|string|max:150',
            'category_id'         => 'nullable|integer|exists:property_categories,id',
            'brand'               => 'nullable|string|max:80',
            'model'               => 'nullable|string|max:80',
            'serial_no'           => 'nullable|string|max:100',
            'condition'           => 'nullable|in:Good,Fair,Poor,Condemned',
            'status'              => 'nullable|in:Active,In Repair,Disposed,Lost',
            'location'            => 'nullable|string|max:150',
            'date_acquired'       => 'nullable|date',
            'acquisition_cost'    => 'nullable|numeric|min:0',
            'useful_life_years'   => 'nullable|integer|min:1',
            'depreciation_method' => 'nullable|in:Straight-Line,Double-Declining,None',
            'salvage_value'       => 'nullable|numeric|min:0',
            'assigned_to'         => 'nullable|string|max:150',
            'remarks'             => 'nullable|string',
        ]);
        $item->update($data);
        return response()->json(['data' => $item->load('category:id,name')]);
    }

    /**
     * Post one period of depreciation for a property item.
     * Computes monthly straight-line or double-declining charge and posts a GL journal entry.
     */
    public function depreciate(Request $request, string $publicId): JsonResponse
    {
        $item = PropertyItem::with('category')->findByPublicIdOrFail($publicId);

        if ($item->depreciation_method === 'None' || ! $item->category?->gl_accum_depr_account_id) {
            return response()->json([
                'message' => 'Depreciation not configured for this item (method is None or GL accounts are missing).'
            ], 422);
        }

        $cost        = (float) ($item->acquisition_cost ?? 0);
        $salvage     = (float) ($item->salvage_value ?? 0);
        $life        = (int)   ($item->useful_life_years ?? 0);
        $accumulated = (float) ($item->accumulated_depreciation ?? 0);

        if ($life <= 0 || $cost <= 0) {
            return response()->json(['message' => 'Item must have acquisition_cost and useful_life_years.'], 422);
        }

        // Compute one-month depreciation
        if ($item->depreciation_method === 'Double-Declining') {
            $bookValue   = $cost - $accumulated;
            $annualRate  = 2 / $life;
            $monthlyCharge = ($bookValue * $annualRate) / 12;
        } else {
            // Straight-Line
            $monthlyCharge = ($cost - $salvage) / ($life * 12);
        }

        $monthlyCharge = max(0, $monthlyCharge);
        $remaining     = max(0, ($cost - $salvage) - $accumulated);
        $monthlyCharge = min($monthlyCharge, $remaining);

        if ($monthlyCharge <= 0) {
            return response()->json(['message' => 'Asset is fully depreciated.'], 422);
        }

        DB::transaction(function () use ($item, $monthlyCharge, $request) {
            $category = $item->category;

            $this->postGlEntry(
                description:   "Depreciation: {$item->name} ({$item->property_no})",
                referenceType: 'property_depreciation',
                referenceId:   (string) $item->id,
                schoolYear:    null,
                createdBy:     $request->user()->id,
                lines:         [
                    ['coa_id' => $category->gl_depr_expense_account_id, 'debit' => $monthlyCharge, 'credit' => 0,              'memo' => 'Depreciation expense'],
                    ['coa_id' => $category->gl_accum_depr_account_id,   'debit' => 0,              'credit' => $monthlyCharge, 'memo' => 'Accumulated depreciation'],
                ]
            );

            $item->increment('accumulated_depreciation', $monthlyCharge);
            $item->update(['last_depreciation_date' => now()->toDateString()]);
        });

        return response()->json([
            'data'    => $item->fresh(),
            'charged' => round($monthlyCharge, 2),
        ]);
    }

    public function destroyPropertyItem(string $publicId): JsonResponse
    {
        PropertyItem::findByPublicIdOrFail($publicId)->delete(); // soft delete
        return response()->json(null, 204);
    }

    // ── Consumable Categories ────────────────────────────────────────────────

    public function consumableCategories(): JsonResponse
    {
        $cats = ConsumableCategory::withCount('items')->orderBy('name')->get();
        return response()->json(['data' => $cats]);
    }

    public function storeConsumableCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'                => 'required|string|max:100|unique:consumable_categories,name',
            'default_unit'        => 'nullable|string|max:30',
            'description'         => 'nullable|string',
            'gl_asset_account_id' => 'nullable|integer|exists:chart_of_accounts,coa_id',
            'gl_expense_account_id' => 'nullable|integer|exists:chart_of_accounts,coa_id',
        ]);
        return response()->json(['data' => ConsumableCategory::create($data)], 201);
    }

    public function updateConsumableCategory(Request $request, string $publicId): JsonResponse
    {
        $cat  = ConsumableCategory::findByPublicIdOrFail($publicId);
        $data = $request->validate([
            'name'                  => 'required|string|max:100|unique:consumable_categories,name,' . $cat->id,
            'default_unit'          => 'nullable|string|max:30',
            'description'           => 'nullable|string',
            'gl_asset_account_id'   => 'nullable|integer|exists:chart_of_accounts,coa_id',
            'gl_expense_account_id' => 'nullable|integer|exists:chart_of_accounts,coa_id',
        ]);
        $cat->update($data);
        return response()->json(['data' => $cat]);
    }

    public function destroyConsumableCategory(string $publicId): JsonResponse
    {
        $cat = ConsumableCategory::findByPublicIdOrFail($publicId);
        if ($cat->items()->exists()) {
            return response()->json(['message' => 'Category has existing consumable items.'], 422);
        }
        $cat->delete();
        return response()->json(null, 204);
    }

    // ── Consumable Items ─────────────────────────────────────────────────────

    public function consumableItems(Request $request): JsonResponse
    {
        $q = ConsumableItem::with('category:id,name')
            ->when($request->search, fn($q, $s) => $q->where('name', 'like', "%$s%"))
            ->when($request->category_id, fn($q, $id) => $q->where('category_id', $id))
            ->when($request->low_stock, fn($q) => $q->whereColumn('quantity_on_hand', '<=', 'reorder_point'))
            ->orderBy('name');

        return response()->json($q->paginate((int) ($request->per_page ?? 50)));
    }

    public function storeConsumableItem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'             => 'required|string|max:150',
            'category_id'      => 'nullable|integer|exists:consumable_categories,id',
            'unit'             => 'nullable|string|max:30',
            'quantity_on_hand' => 'nullable|integer|min:0',
            'reorder_point'    => 'nullable|integer|min:0',
            'location'         => 'nullable|string|max:150',
            'description'      => 'nullable|string',
        ]);
        return response()->json(['data' => ConsumableItem::create($data)->load('category:id,name')], 201);
    }

    public function updateConsumableItem(Request $request, string $publicId): JsonResponse
    {
        $item = ConsumableItem::findByPublicIdOrFail($publicId);
        $data = $request->validate([
            'name'          => 'required|string|max:150',
            'category_id'   => 'nullable|integer|exists:consumable_categories,id',
            'unit'          => 'nullable|string|max:30',
            'reorder_point' => 'nullable|integer|min:0',
            'location'      => 'nullable|string|max:150',
            'description'   => 'nullable|string',
        ]);
        $item->update($data);
        return response()->json(['data' => $item->load('category:id,name')]);
    }

    public function destroyConsumableItem(string $publicId): JsonResponse
    {
        ConsumableItem::findByPublicIdOrFail($publicId)->delete();
        return response()->json(null, 204);
    }

    // ── Stock Transactions ───────────────────────────────────────────────────

    public function stockIn(Request $request, string $publicId): JsonResponse
    {
        $item = ConsumableItem::findByPublicIdOrFail($publicId);
        $data = $request->validate([
            'quantity'     => 'required|integer|min:1',
            'reference_no' => 'nullable|string|max:80',
            'remarks'      => 'nullable|string',
        ]);

        DB::transaction(function () use ($item, $data, $request) {
            ConsumableTransaction::create([
                'item_id'      => $item->id,
                'type'         => 'in',
                'quantity'     => $data['quantity'],
                'reference_no' => $data['reference_no'] ?? null,
                'remarks'      => $data['remarks'] ?? null,
                'performed_by' => $request->user()->id,
                'transacted_at' => now(),
            ]);
            $item->increment('quantity_on_hand', $data['quantity']);
        });

        return response()->json(['data' => $item->fresh()]);
    }

    public function stockOut(Request $request, string $publicId): JsonResponse
    {
        $item = ConsumableItem::findByPublicIdOrFail($publicId);
        $data = $request->validate([
            'quantity'     => 'required|integer|min:1',
            'reference_no' => 'nullable|string|max:80',
            'remarks'      => 'nullable|string',
        ]);

        if ($item->quantity_on_hand < $data['quantity']) {
            return response()->json(['message' => 'Insufficient stock.'], 422);
        }

        DB::transaction(function () use ($item, $data, $request) {
            ConsumableTransaction::create([
                'item_id'      => $item->id,
                'type'         => 'out',
                'quantity'     => $data['quantity'],
                'reference_no' => $data['reference_no'] ?? null,
                'remarks'      => $data['remarks'] ?? null,
                'performed_by' => $request->user()->id,
                'transacted_at' => now(),
            ]);
            $item->decrement('quantity_on_hand', $data['quantity']);
        });

        return response()->json(['data' => $item->fresh()]);
    }

    public function stockTransactions(Request $request, string $publicId): JsonResponse
    {
        $item = ConsumableItem::findByPublicIdOrFail($publicId);
        $txns = ConsumableTransaction::with('performer:id,fname,lname')
            ->where('item_id', $item->id)
            ->orderByDesc('transacted_at')
            ->paginate(20);

        return response()->json($txns);
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    /**
     * Create and immediately post a GL journal entry.
     *
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
