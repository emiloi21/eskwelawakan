<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\JournalEntry;
use App\Models\JournalEntryLine;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class JournalEntryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = JournalEntry::with([
            'creator:id,fname,lname',
            'lines:jel_id,je_id,coa_id,debit,credit,memo',
            'lines.account:coa_id,account_code,account_name,account_type',
        ]);

        if ($request->has('status')) {
            $query->where('status', $request->query('status'));
        }

        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('entry_date', [
                $request->query('start_date'),
                $request->query('end_date'),
            ]);
        }

        if ($request->has('schoolYear')) {
            $query->where('schoolYear', $request->query('schoolYear'));
        }

        $entries = $query->orderByDesc('entry_date')
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 25));

        return response()->json($entries);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'entry_date'     => ['required', 'date'],
            'description'    => ['required', 'string', 'max:255'],
            'reference_type' => ['nullable', 'string', 'in:payment,refund,adjustment,manual'],
            'reference_id'   => ['nullable', 'string', 'max:50'],
            'schoolYear'     => ['nullable', 'string', 'max:15'],
            'lines'          => ['required', 'array', 'min:2'],
            'lines.*.coa_id' => ['required', 'integer', 'exists:chart_of_accounts,coa_id'],
            'lines.*.debit'  => ['required', 'numeric', 'min:0'],
            'lines.*.credit' => ['required', 'numeric', 'min:0'],
            'lines.*.memo'   => ['nullable', 'string', 'max:255'],
        ]);

        // Validate debits == credits
        $totalDebit = collect($validated['lines'])->sum('debit');
        $totalCredit = collect($validated['lines'])->sum('credit');

        if (abs($totalDebit - $totalCredit) > 0.009) {
            return response()->json([
                'message' => 'Total debits must equal total credits.',
                'total_debit' => $totalDebit,
                'total_credit' => $totalCredit,
            ], 422);
        }

        // Validate each line has either debit or credit (not both, not neither)
        foreach ($validated['lines'] as $i => $line) {
            if ($line['debit'] == 0 && $line['credit'] == 0) {
                return response()->json([
                    'message' => "Line {$i}: must have a debit or credit amount.",
                ], 422);
            }
        }

        return DB::transaction(function () use ($validated, $request) {
            $entryNo = 'JE-' . now()->format('Ymd') . '-' . str_pad(
                JournalEntry::whereDate('created_at', today())->count() + 1,
                4, '0', STR_PAD_LEFT
            );

            $entry = JournalEntry::create([
                'entry_no'       => $entryNo,
                'entry_date'     => $validated['entry_date'],
                'description'    => $validated['description'],
                'reference_type' => $validated['reference_type'] ?? 'manual',
                'reference_id'   => $validated['reference_id'] ?? null,
                'status'         => 'Draft',
                'schoolYear'     => $validated['schoolYear'] ?? null,
                'created_by'     => $request->user()->id,
            ]);

            foreach ($validated['lines'] as $line) {
                JournalEntryLine::create([
                    'je_id'  => $entry->je_id,
                    'coa_id' => $line['coa_id'],
                    'debit'  => $line['debit'],
                    'credit' => $line['credit'],
                    'memo'   => $line['memo'] ?? null,
                ]);
            }

            return response()->json([
                'data' => $entry->load('lines.account'),
            ], 201);
        });
    }

    public function show(string $id): JsonResponse
    {
        $entry = JournalEntry::with(['lines.account', 'creator:id,fname,lname'])
            ->where('public_id', $id)->firstOrFail();

        return response()->json(['data' => $entry]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $entry = JournalEntry::findByPublicIdOrFail($id);

        if ($entry->status !== 'Draft') {
            return response()->json([
                'message' => 'Only draft entries can be edited.',
            ], 422);
        }

        $validated = $request->validate([
            'entry_date'     => ['sometimes', 'date'],
            'description'    => ['sometimes', 'string', 'max:255'],
            'reference_type' => ['nullable', 'string', 'in:payment,refund,adjustment,manual'],
            'reference_id'   => ['nullable', 'string', 'max:50'],
            'lines'          => ['sometimes', 'array', 'min:2'],
            'lines.*.coa_id' => ['required_with:lines', 'integer', 'exists:chart_of_accounts,coa_id'],
            'lines.*.debit'  => ['required_with:lines', 'numeric', 'min:0'],
            'lines.*.credit' => ['required_with:lines', 'numeric', 'min:0'],
            'lines.*.memo'   => ['nullable', 'string', 'max:255'],
        ]);

        if (isset($validated['lines'])) {
            $totalDebit = collect($validated['lines'])->sum('debit');
            $totalCredit = collect($validated['lines'])->sum('credit');

            if (abs($totalDebit - $totalCredit) > 0.009) {
                return response()->json([
                    'message' => 'Total debits must equal total credits.',
                ], 422);
            }
        }

        return DB::transaction(function () use ($entry, $validated) {
            $entry->update(collect($validated)->except('lines')->toArray());

            if (isset($validated['lines'])) {
                $entry->lines()->delete();
                foreach ($validated['lines'] as $line) {
                    JournalEntryLine::create([
                        'je_id'  => $entry->je_id,
                        'coa_id' => $line['coa_id'],
                        'debit'  => $line['debit'],
                        'credit' => $line['credit'],
                        'memo'   => $line['memo'] ?? null,
                    ]);
                }
            }

            return response()->json(['data' => $entry->fresh()->load('lines.account')]);
        });
    }

    /**
     * Post a draft entry — makes it count in GL/reports.
     */
    public function post(Request $request, string $id): JsonResponse
    {
        $entry = JournalEntry::findByPublicIdOrFail($id);

        if ($entry->status !== 'Draft') {
            return response()->json(['message' => 'Only draft entries can be posted.'], 422);
        }

        $entry->update([
            'status'    => 'Posted',
            'posted_by' => $request->user()->id,
            'posted_at' => now(),
        ]);

        return response()->json(['data' => $entry->fresh()]);
    }

    /**
     * Void a posted entry.
     */
    public function void(Request $request, string $id): JsonResponse
    {
        $entry = JournalEntry::findByPublicIdOrFail($id);

        if ($entry->status !== 'Posted') {
            return response()->json(['message' => 'Only posted entries can be voided.'], 422);
        }

        $entry->update(['status' => 'Voided']);

        return response()->json(['data' => $entry->fresh()]);
    }

    public function destroy(string $id): JsonResponse
    {
        $entry = JournalEntry::findByPublicIdOrFail($id);

        if ($entry->status !== 'Draft') {
            return response()->json([
                'message' => 'Only draft entries can be deleted.',
            ], 422);
        }

        $entry->delete();

        return response()->json(['message' => 'Journal entry deleted.']);
    }
}
