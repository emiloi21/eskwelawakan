<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\ChartOfAccount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChartOfAccountController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ChartOfAccount::query();

        if ($request->has('account_type')) {
            $query->where('account_type', $request->query('account_type'));
        }

        if ($request->has('active_only')) {
            $query->where('is_active', true);
        }

        if ($request->has('flat')) {
            return response()->json([
                'data' => $query->orderBy('account_code')->get(),
            ]);
        }

        // Return hierarchical tree: top-level accounts with children
        $accounts = $query->whereNull('parent_id')
            ->with('children')
            ->orderBy('account_code')
            ->get();

        return response()->json(['data' => $accounts]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'account_code'  => ['required', 'string', 'max:20', 'unique:chart_of_accounts,account_code'],
            'account_name'  => ['required', 'string', 'max:150'],
            'account_type'  => ['required', 'in:Asset,Liability,Equity,Revenue,Expense'],
            'code_prefix'   => ['nullable', 'string', 'max:10'],
            'code_number'   => ['nullable', 'string', 'max:10'],
            'code_suffix'   => ['nullable', 'string', 'max:5'],
            'parent_id'     => ['nullable', 'integer', 'exists:chart_of_accounts,coa_id'],
            'description'   => ['nullable', 'string', 'max:255'],
            'is_header'     => ['boolean'],
        ]);

        $account = ChartOfAccount::create($validated);

        return response()->json(['data' => $account], 201);
    }

    public function show(string $id): JsonResponse
    {
        $account = ChartOfAccount::with('children')->where('public_id', $id)->firstOrFail();

        return response()->json(['data' => $account]);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $account = ChartOfAccount::findByPublicIdOrFail($id);

        if ($account->is_system) {
            return response()->json(['message' => 'System accounts cannot be edited.'], 422);
        }

        $validated = $request->validate([
            'account_code'  => ['sometimes', 'string', 'max:20', "unique:chart_of_accounts,account_code,{$account->coa_id},coa_id"],
            'account_name'  => ['sometimes', 'string', 'max:150'],
            'account_type'  => ['sometimes', 'in:Asset,Liability,Equity,Revenue,Expense'],
            'code_prefix'   => ['nullable', 'string', 'max:10'],
            'code_number'   => ['nullable', 'string', 'max:10'],
            'code_suffix'   => ['nullable', 'string', 'max:5'],
            'parent_id'     => ['nullable', 'integer', 'exists:chart_of_accounts,coa_id'],
            'description'   => ['nullable', 'string', 'max:255'],
            'is_active'     => ['boolean'],
            'is_header'     => ['boolean'],
        ]);

        $account->update($validated);

        return response()->json(['data' => $account->fresh()]);
    }

    public function destroy(string $id): JsonResponse
    {
        $account = ChartOfAccount::findByPublicIdOrFail($id);

        if ($account->is_system) {
            return response()->json(['message' => 'System accounts cannot be deleted.'], 422);
        }

        // Prevent deleting accounts that have journal entry lines
        if ($account->journalLines()->exists()) {
            return response()->json([
                'message' => 'Cannot delete account with existing journal entries.',
            ], 422);
        }

        // Prevent deleting parent accounts with children
        if ($account->children()->exists()) {
            return response()->json([
                'message' => 'Cannot delete account with sub-accounts. Remove children first.',
            ], 422);
        }

        $account->delete();

        return response()->json(['message' => 'Account deleted.']);
    }

    /**
     * Get trial balance: sum of debits & credits per account.
     */
    public function trialBalance(Request $request): JsonResponse
    {
        $request->validate([
            'as_of_date'  => ['nullable', 'date'],
            'schoolYear'  => ['nullable', 'string', 'max:15'],
        ]);

        $asOfDate = $request->query('as_of_date', now()->toDateString());

        $query = ChartOfAccount::query()
            ->where('is_header', false)
            ->where('is_active', true)
            ->orderBy('account_code');

        $accounts = $query->get()->map(function ($acct) use ($asOfDate, $request) {
            $lineQuery = $acct->journalLines()
                ->whereHas('journalEntry', function ($q) use ($asOfDate, $request) {
                    $q->where('status', 'Posted')
                      ->where('entry_date', '<=', $asOfDate);
                    if ($request->query('schoolYear')) {
                        $q->where('schoolYear', $request->query('schoolYear'));
                    }
                });

            $totals = $lineQuery->selectRaw('SUM(debit) as total_debit, SUM(credit) as total_credit')->first();

            return [
                'coa_id'       => $acct->coa_id,
                'account_code' => $acct->account_code,
                'account_name' => $acct->account_name,
                'account_type' => $acct->account_type,
                'total_debit'  => (float) ($totals->total_debit ?? 0),
                'total_credit' => (float) ($totals->total_credit ?? 0),
                'balance'      => (float) ($totals->total_debit ?? 0) - (float) ($totals->total_credit ?? 0),
            ];
        })->filter(fn ($a) => $a['total_debit'] != 0 || $a['total_credit'] != 0)->values();

        $totalDebit = $accounts->sum('total_debit');
        $totalCredit = $accounts->sum('total_credit');

        return response()->json([
            'data' => [
                'accounts'     => $accounts,
                'total_debit'  => $totalDebit,
                'total_credit' => $totalCredit,
                'is_balanced'  => abs($totalDebit - $totalCredit) < 0.01,
                'as_of_date'   => $asOfDate,
            ],
        ]);
    }

    /**
     * Financial Statements: Income Statement and Balance Sheet
     */
    public function financialStatements(Request $request): JsonResponse
    {
        $request->validate([
            'start_date' => ['required', 'date'],
            'end_date'   => ['required', 'date', 'after_or_equal:start_date'],
            'schoolYear' => ['nullable', 'string', 'max:15'],
        ]);

        $startDate = $request->query('start_date');
        $endDate = $request->query('end_date');
        $schoolYear = $request->query('schoolYear');

        $accounts = ChartOfAccount::where('is_header', false)
            ->where('is_active', true)
            ->orderBy('account_code')
            ->get()
            ->map(function ($acct) use ($startDate, $endDate, $schoolYear) {
                $lineQuery = $acct->journalLines()
                    ->whereHas('journalEntry', function ($q) use ($startDate, $endDate, $schoolYear) {
                        $q->where('status', 'Posted')
                          ->whereBetween('entry_date', [$startDate, $endDate]);
                        if ($schoolYear) {
                            $q->where('schoolYear', $schoolYear);
                        }
                    });

                $totals = $lineQuery->selectRaw('SUM(debit) as d, SUM(credit) as c')->first();

                return [
                    'coa_id'       => $acct->coa_id,
                    'account_code' => $acct->account_code,
                    'account_name' => $acct->account_name,
                    'account_type' => $acct->account_type,
                    'debit'        => (float) ($totals->d ?? 0),
                    'credit'       => (float) ($totals->c ?? 0),
                    'balance'      => (float) ($totals->d ?? 0) - (float) ($totals->c ?? 0),
                ];
            });

        // Income Statement
        $revenue = $accounts->where('account_type', 'Revenue');
        $expense = $accounts->where('account_type', 'Expense');
        $totalRevenue = $revenue->sum(fn ($a) => $a['credit'] - $a['debit']);
        $totalExpense = $expense->sum(fn ($a) => $a['debit'] - $a['credit']);
        $netIncome = $totalRevenue - $totalExpense;

        // Balance Sheet
        $assets = $accounts->where('account_type', 'Asset');
        $liabilities = $accounts->where('account_type', 'Liability');
        $equity = $accounts->where('account_type', 'Equity');
        $totalAssets = $assets->sum(fn ($a) => $a['debit'] - $a['credit']);
        $totalLiabilities = $liabilities->sum(fn ($a) => $a['credit'] - $a['debit']);
        $totalEquity = $equity->sum(fn ($a) => $a['credit'] - $a['debit']);

        return response()->json([
            'data' => [
                'income_statement' => [
                    'revenue'       => $revenue->filter(fn ($a) => $a['debit'] != 0 || $a['credit'] != 0)->values(),
                    'expenses'      => $expense->filter(fn ($a) => $a['debit'] != 0 || $a['credit'] != 0)->values(),
                    'total_revenue' => $totalRevenue,
                    'total_expense' => $totalExpense,
                    'net_income'    => $netIncome,
                ],
                'balance_sheet' => [
                    'assets'           => $assets->filter(fn ($a) => $a['debit'] != 0 || $a['credit'] != 0)->values(),
                    'liabilities'      => $liabilities->filter(fn ($a) => $a['debit'] != 0 || $a['credit'] != 0)->values(),
                    'equity'           => $equity->filter(fn ($a) => $a['debit'] != 0 || $a['credit'] != 0)->values(),
                    'total_assets'     => $totalAssets,
                    'total_liabilities' => $totalLiabilities,
                    'total_equity'     => $totalEquity,
                    'net_income'       => $netIncome,
                ],
                'period' => ['start' => $startDate, 'end' => $endDate],
            ],
        ]);
    }
}
