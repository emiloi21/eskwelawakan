<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AccountsParticular;
use App\Models\SchoolPreference;
use App\Models\StudentPayment;
use App\Models\StudentPaymentData;
use App\Services\ReceiptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NsfPaymentController extends Controller
{
    /**
     * List Non-Assessment Account particulars for NSF cashiering.
     */
    public function loadParticulars(): JsonResponse
    {
        $items = AccountsParticular::where('par_acct_class', 'Non-Assessment Account')
            ->where('status', 'Active')
            ->orderBy('description')
            ->get(['particular_id', 'description', 'account_code', 'account_group', 'amount']);

        return response()->json(['data' => $items]);
    }

    /**
     * Process a non-student fee payment.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'lname'              => ['required', 'string', 'max:100'],
            'fname'              => ['required', 'string', 'max:100'],
            'items'              => ['required', 'array', 'min:1'],
            'items.*.particular_id' => ['required', 'string', 'exists:accounts_particulars,public_id'],
            'items.*.amt_paid'   => ['required', 'numeric', 'min:0.01'],
            'amt_tend'           => ['required', 'numeric', 'min:0.01'],
            'trans_payment_type' => ['nullable', 'string', 'max:55'],
            'remarks'            => ['nullable', 'string', 'max:255'],
        ]);

        $netPayable = collect($validated['items'])->sum('amt_paid');
        if ($validated['amt_tend'] < $netPayable) {
            return response()->json(['message' => 'Amount tendered is less than total.'], 422);
        }

        $user = $request->user();

        return DB::transaction(function () use ($validated, $netPayable, $user) {
            $receiptNum = ReceiptService::generateReceiptNumber();
            $now = now();

            // Create payment data header
            $paymentData = StudentPaymentData::create([
                'reg_id'             => 0,
                'receipt_num'        => $receiptNum,
                'schoolYear'         => '-',
                'semester'           => '-',
                'trans_payment_type' => $validated['trans_payment_type'] ?? 'Cash',
                'cv_payee'           => "{$validated['lname']}, {$validated['fname']}",
                'net_amt_payable'    => $netPayable,
                'amt_tend'           => $validated['amt_tend'],
                'remarks'            => $validated['remarks'] ?? '',
                'personnel_user_id'  => $user->id,
                'entry_date'         => $now->toDateString(),
                'trans_time'         => $now,
                'status'             => 'Completed',
            ]);

            // Create payment line items
            foreach ($validated['items'] as $item) {
                $particular = AccountsParticular::where('public_id', $item['particular_id'])->firstOrFail();
                StudentPayment::create([
                    'reg_id'            => 0,
                    'lname'             => $validated['lname'],
                    'fname'             => $validated['fname'],
                    'receipt_num'       => $receiptNum,
                    'schoolYear'        => '-',
                    'semester'          => '-',
                    'payment_type'      => 'Non-Student Fee',
                    'category_id'       => 0,
                    'particular_id'     => $particular->particular_id,
                    'amt_payable'       => $item['amt_paid'],
                    'amt_paid'          => $item['amt_paid'],
                    'trans_date'        => $now->toDateString(),
                    'trans_time'        => $now,
                    'status'            => '-',
                    'personnel_user_id' => $user->id,
                ]);
            }

            $change = $validated['amt_tend'] - $netPayable;

            return response()->json([
                'data' => [
                    'receipt_num'  => $receiptNum,
                    'payee'        => "{$validated['lname']}, {$validated['fname']}",
                    'net_payable'  => $netPayable,
                    'amt_tendered' => $validated['amt_tend'],
                    'change'       => $change,
                    'pay_data_id'  => $paymentData->pay_data_id,
                ],
            ]);
        });
    }

    /**
     * Get NSF receipt data.
     */
    public function receipt(string $receiptNum): JsonResponse
    {
        $paymentData = StudentPaymentData::where('receipt_num', $receiptNum)->firstOrFail();

        $payments = StudentPayment::where('receipt_num', $receiptNum)
            ->where('status', '!=', 'Voided')
            ->get();

        $school = SchoolPreference::first();

        return response()->json([
            'data' => [
                'transaction' => $paymentData,
                'items'       => $payments,
                'school'      => $school ? $school->only(['schoolName', 'address', 'contactNumber', 'emailAddress', 'logo']) : null,
            ],
        ]);
    }

    /**
     * List NSF transactions.
     */
    public function index(Request $request): JsonResponse
    {
        $query = StudentPaymentData::where('reg_id', 0)
            ->orWhereHas('payments', fn ($q) => $q->where('payment_type', 'Non-Student Fee'));

        if ($dateFrom = $request->query('date_from')) {
            $query->where('entry_date', '>=', $dateFrom);
        }
        if ($dateTo = $request->query('date_to')) {
            $query->where('entry_date', '<=', $dateTo);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        $transactions = $query->orderByDesc('pay_data_id')
            ->paginate($request->query('per_page', 50));

        return response()->json($transactions);
    }

    private function generateReceiptNumber(): string
    {
        return ReceiptService::generateReceiptNumber();
    }
}
