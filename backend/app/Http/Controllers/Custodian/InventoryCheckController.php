<?php

namespace App\Http\Controllers\Custodian;

use App\Http\Controllers\Controller;
use App\Models\InventoryCheck;
use App\Models\InventoryCheckItem;
use App\Models\PropertyItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InventoryCheckController extends Controller
{
    // ── Custodian / Admin ────────────────────────────────────────────────────

    /** List all inventory checks */
    public function index(Request $request): JsonResponse
    {
        $checks = InventoryCheck::with(['assignee:id,fname,lname', 'reviewer:id,fname,lname'])
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->school_year, fn($q, $sy) => $q->where('school_year', $sy))
            ->orderByDesc('created_at')
            ->paginate(25);

        return response()->json($checks);
    }

    /** Create an inventory check and optionally auto-populate with property items at location */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'          => 'required|string|max:200',
            'school_year'    => 'required|string|max:20',
            'location'       => 'required|string|max:150',
            'assigned_to_id' => 'required|integer|exists:users,id',
            'due_date'       => 'nullable|date',
            'auto_populate'  => 'nullable|boolean',
        ]);

        $check = InventoryCheck::create([
            'title'          => $data['title'],
            'school_year'    => $data['school_year'],
            'location'       => $data['location'],
            'assigned_to_id' => $data['assigned_to_id'],
            'due_date'       => $data['due_date'] ?? null,
        ]);

        // Auto-populate items from property items at the given location
        if ($data['auto_populate'] ?? false) {
            $propertyItems = PropertyItem::where('location', 'like', '%' . $data['location'] . '%')
                ->whereIn('status', ['Active', 'In Repair'])
                ->get(['id', 'name', 'property_no']);

            foreach ($propertyItems as $item) {
                InventoryCheckItem::create([
                    'check_id'          => $check->id,
                    'item_id'           => $item->id,
                    'item_name'         => $item->name,
                    'property_no'       => $item->property_no,
                    'expected_quantity' => 1,
                ]);
            }
        }

        return response()->json(['data' => $check->load('checkItems')], 201);
    }

    /** View a single check with all items */
    public function show(string $publicId): JsonResponse
    {
        $check = InventoryCheck::with([
            'assignee:id,fname,lname',
            'reviewer:id,fname,lname',
            'checkItems',
        ])->where('public_id', $publicId)->firstOrFail();

        return response()->json(['data' => $check]);
    }

    /** Update check metadata (custodian) */
    public function update(Request $request, string $publicId): JsonResponse
    {
        $check = InventoryCheck::findByPublicIdOrFail($publicId);
        $data  = $request->validate([
            'title'          => 'sometimes|string|max:200',
            'due_date'       => 'nullable|date',
            'assigned_to_id' => 'sometimes|integer|exists:users,id',
        ]);
        $check->update($data);
        return response()->json(['data' => $check]);
    }

    /** Delete a check (only Pending) */
    public function destroy(string $publicId): JsonResponse
    {
        $check = InventoryCheck::findByPublicIdOrFail($publicId);
        if ($check->status !== 'Pending') {
            return response()->json(['message' => 'Only pending checks can be deleted.'], 422);
        }
        $check->delete();
        return response()->json(null, 204);
    }

    /** Add an item manually to a check */
    public function addItem(Request $request, string $publicId): JsonResponse
    {
        $check = InventoryCheck::findByPublicIdOrFail($publicId);
        $data  = $request->validate([
            'item_id'           => 'nullable|exists:property_items,id',
            'item_name'         => 'required|string|max:200',
            'property_no'       => 'nullable|string|max:60',
            'expected_quantity' => 'nullable|integer|min:1',
        ]);

        $item = InventoryCheckItem::create(array_merge($data, [
            'check_id'          => $check->id,
            'expected_quantity' => $data['expected_quantity'] ?? 1,
        ]));

        return response()->json(['data' => $item], 201);
    }

    /** Remove an item from a check */
    public function removeItem(string $publicId, int $itemId): JsonResponse
    {
        $check = InventoryCheck::findByPublicIdOrFail($publicId);
        InventoryCheckItem::where('check_id', $check->id)->findOrFail($itemId)->delete();
        return response()->json(null, 204);
    }

    /** Custodian reviews a submitted check */
    public function review(Request $request, string $publicId): JsonResponse
    {
        $check = InventoryCheck::findByPublicIdOrFail($publicId);

        if ($check->status !== 'Submitted') {
            return response()->json(['message' => 'Only submitted checks can be reviewed.'], 422);
        }

        $data = $request->validate(['remarks' => 'nullable|string']);

        $check->update([
            'status'             => 'Reviewed',
            'reviewed_by_id'     => $request->user()->id,
            'reviewed_at'        => now(),
            'custodian_remarks'  => $data['remarks'] ?? null,
        ]);

        return response()->json(['data' => $check]);
    }

    // ── Assignee (any authenticated user) ───────────────────────────────────

    /** List inventory tasks assigned to the current user */
    public function myTasks(Request $request): JsonResponse
    {
        $tasks = InventoryCheck::where('assigned_to_id', $request->user()->id)
            ->withCount('checkItems')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $tasks]);
    }

    /** Assignee: view their task detail */
    public function showTask(Request $request, string $publicId): JsonResponse
    {
        $check = InventoryCheck::with('checkItems')
            ->where('public_id', $publicId)
            ->where('assigned_to_id', $request->user()->id)
            ->firstOrFail();

        return response()->json(['data' => $check]);
    }

    /** Assignee submits their inventory count */
    public function submitCount(Request $request, string $publicId): JsonResponse
    {
        $check = InventoryCheck::where('public_id', $publicId)
            ->where('assigned_to_id', $request->user()->id)
            ->firstOrFail();

        if (!in_array($check->status, ['Pending', 'In Progress'])) {
            return response()->json(['message' => 'This inventory check cannot be edited.'], 422);
        }

        $data = $request->validate([
            'items'                     => 'required|array',
            'items.*.id'                => 'required|integer',
            'items.*.counted_quantity'  => 'required|integer|min:0',
            'items.*.condition_found'   => 'required|in:Good,Fair,Poor,Missing',
            'items.*.remarks'           => 'nullable|string',
            'assignee_remarks'          => 'nullable|string',
            'submit'                    => 'nullable|boolean',
        ]);

        foreach ($data['items'] as $itemData) {
            InventoryCheckItem::where('check_id', $check->id)
                ->where('id', $itemData['id'])
                ->update([
                    'counted_quantity' => $itemData['counted_quantity'],
                    'condition_found'  => $itemData['condition_found'],
                    'remarks'          => $itemData['remarks'] ?? null,
                ]);
        }

        $newStatus = ($data['submit'] ?? false) ? 'Submitted' : 'In Progress';

        $check->update([
            'status'             => $newStatus,
            'assignee_remarks'   => $data['assignee_remarks'] ?? null,
            'submitted_at'       => ($data['submit'] ?? false) ? now() : null,
        ]);

        return response()->json(['data' => $check->load('checkItems')]);
    }
}
