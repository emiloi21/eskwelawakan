<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AccountsCategory;
use App\Models\AccountsParticular;
use App\Models\ReceiptGen;
use App\Models\SchoolPreference;
use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\StudentPayment;
use App\Services\CacheService;
use App\Services\GlJournalService;
use App\Services\ReceiptService;
use App\Models\StudentPaymentData;
use App\Models\StudentPaymentDummy;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentController extends Controller
{
    /**
     * List transactions (payment data headers).
     */
    public function index(Request $request): JsonResponse
    {
        $query = StudentPaymentData::with('student:reg_id,lname,fname,mname');

        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }
        if ($regId = $request->query('reg_id')) {
            $query->where('reg_id', $regId);
        }
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

    /**
     * Get transaction details including line items.
     */
    public function show(string $id): JsonResponse
    {
        $txn = StudentPaymentData::with([
            'student:reg_id,lname,fname,mname,student_id',
            'payments',
        ])->where('public_id', $id)->firstOrFail();

        return response()->json(['data' => $txn]);
    }

    /**
     * Load unpaid items for a student into the dummy table (staging).
     */
    public function loadParticulars(Request $request): JsonResponse
    {
        $request->validate([
            'public_id' => ['required', 'string'],
        ]);

        $identifier = $request->input('public_id');

        // Accept either a public_id (hash) or a plain student_id number
        $student = Student::where('public_id', $identifier)
            ->orWhere('student_id', $identifier)
            ->firstOrFail();
        $regId = $student->reg_id;

        // Clear any existing staging for this user (dummy records + staging headers)
        $user = $request->user();
        StudentPaymentDummy::where('personnel_user_id', $user->id)->delete();
        StudentPaymentData::where('personnel_user_id', $user->id)
            ->where('status', 'Staging')
            ->delete();

        // Load unpaid assessment items
        $items = StudentAssessment::where('reg_id', $regId)
            ->where('par_stat', 'Active')
            ->where('total_amt_bal', '>', 0)
            ->get();

        // Also include tuition items even if balance <= 0
        $tuitionItems = StudentAssessment::where('reg_id', $regId)
            ->where('par_stat', 'Active')
            ->where('total_amt_bal', '<=', 0)
            ->whereHas('category', function ($q) {
                $q->where('description', 'LIKE', '%Tuition%');
            })
            ->get();

        $allItems = $items->merge($tuitionItems)->unique('stud_assess_id');

        // Generate a temporary receipt number for staging
        $tempReceipt = 'TEMP-' . $regId . '-' . time();

        // Create payment data header (staging)
        $paymentData = StudentPaymentData::create([
            'reg_id'             => $regId,
            'receipt_num'        => $tempReceipt,
            'schoolYear'         => $student->schoolYear,
            'semester'           => $student->sem ?? '-',
            'trans_payment_type' => 'Cash',
            'cv_payee'           => '',
            'cv_bank_office'     => '',
            'cv_number'          => '',
            'remarks'            => '',
            'entry_date'         => now()->format('Y-m-d'),
            'personnel_user_id'  => $user->id,
            'status'             => 'Staging',
        ]);

        // Insert into dummy table
        foreach ($allItems as $sa) {
            StudentPaymentDummy::create([
                'reg_id'            => $regId,
                'lname'             => $student->lname,
                'fname'             => $student->fname,
                'receipt_num'       => $tempReceipt,
                'schoolYear'        => $student->schoolYear,
                'semester'          => $student->sem ?? '-',
                'payment_type'      => 'Student Fee',
                'assessment_id'     => $sa->assessment_id,
                'category_id'       => $sa->category_id,
                'particular_id'     => $sa->particular_id,
                'amt_payable'       => $sa->total_amt_bal,
                'amt_paid'          => 0,
                'personnel_user_id' => $user->id,
            ]);
        }

        $dummyItems = StudentPaymentDummy::with([
                'particular:particular_id,description',
                'category:category_id,description',
            ])
            ->where('receipt_num', $tempReceipt)
            ->get();

        return response()->json([
            'data' => [
                'student'      => $student,
                'receipt_num'  => $tempReceipt,
                'items'        => $dummyItems,
                'pay_data_id'  => $paymentData->pay_data_id,
            ],
        ]);
    }

    /**
     * Save/finalize a payment transaction.
     */
    public function complete(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'receipt_num'        => ['required', 'string'],
            'amt_tend'           => ['required', 'numeric', 'min:0.01'],
            'trans_payment_type' => ['nullable', 'string', 'max:55'],
            'entry_date'         => ['nullable', 'date_format:Y-m-d'],
            'cv_payee'           => ['nullable', 'string', 'max:255'],
            'cv_bank_office'     => ['nullable', 'string', 'max:255'],
            'cv_number'          => ['nullable', 'string', 'max:25'],
            'remarks'            => ['nullable', 'string', 'max:255'],
            'items'              => ['required', 'array', 'min:1'],
            'items.*.payment_id' => ['required', 'integer'],
            'items.*.amt_paid'   => ['required', 'numeric', 'min:0'],
        ]);

        $tempReceipt = $validated['receipt_num'];
        $user = $request->user();

        // Validate staging exists
        $paymentData = StudentPaymentData::where('receipt_num', $tempReceipt)
            ->where('status', 'Staging')
            ->firstOrFail();

        $dummyItems = StudentPaymentDummy::where('receipt_num', $tempReceipt)
            ->where('personnel_user_id', $user->id)
            ->get();

        if ($dummyItems->isEmpty()) {
            return response()->json(['message' => 'No staged items found.'], 422);
        }

        // Calculate net payable from user-specified amounts
        $netPayable = 0;
        $itemAmounts = collect($validated['items'])->keyBy('payment_id');
        foreach ($dummyItems as $dummy) {
            $amt = $itemAmounts->get($dummy->payment_id);
            if ($amt && $amt['amt_paid'] > 0) {
                $netPayable += $amt['amt_paid'];
            }
        }

        if ($netPayable <= 0) {
            return response()->json(['message' => 'Total payment must be greater than zero.'], 422);
        }

        if ($validated['amt_tend'] < $netPayable) {
            return response()->json(['message' => 'Amount tendered is less than total payment.'], 422);
        }

        return DB::transaction(function () use ($validated, $paymentData, $dummyItems, $itemAmounts, $netPayable, $user) {
            // Generate official receipt number
            $receiptNum = ReceiptService::generateReceiptNumber();

            $student = Student::where('reg_id', $paymentData->reg_id)->first();
            $now = now();
            $transDate = $validated['entry_date'] ?? $now->toDateString();

            // Process each line item
            foreach ($dummyItems as $dummy) {
                $amt = $itemAmounts->get($dummy->payment_id);
                $amtPaid = $amt ? (float) $amt['amt_paid'] : 0;

                if ($amtPaid <= 0) {
                    continue;
                }

                // Insert permanent payment record
                StudentPayment::create([
                    'reg_id'            => $dummy->reg_id,
                    'lname'             => $dummy->lname,
                    'fname'             => $dummy->fname,
                    'receipt_num'       => $receiptNum,
                    'schoolYear'        => $dummy->schoolYear,
                    'semester'          => $dummy->semester,
                    'payment_type'      => $dummy->payment_type,
                    'category_id'       => $dummy->category_id,
                    'particular_id'     => $dummy->particular_id,
                    'amt_payable'       => $dummy->amt_payable,
                    'amt_paid'          => $amtPaid,
                    'trans_date'        => $transDate,
                    'trans_time'        => $now,
                    'status'            => '-',
                    'personnel_user_id' => $user->id,
                ]);

                // Update student assessment balance
                $sa = StudentAssessment::where('reg_id', $dummy->reg_id)
                    ->where('category_id', $dummy->category_id)
                    ->where('particular_id', $dummy->particular_id)
                    ->first();

                if ($sa) {
                    $newPaid = (float) $sa->total_amt_paid + $amtPaid;
                    $newBal = (float) $sa->total_amt_payable - ((float) $sa->total_amt_discount + $newPaid);
                    $sa->update([
                        'total_amt_paid' => $newPaid,
                        'total_amt_bal'  => $newBal,
                    ]);
                }
            }

            // Update payment data header
            $paymentData->update([
                'receipt_num'        => $receiptNum,
                'net_amt_payable'    => $netPayable,
                'amt_tend'           => $validated['amt_tend'],
                'trans_payment_type' => $validated['trans_payment_type'] ?? 'Cash',
                'cv_payee'           => $validated['cv_payee'] ?? '',
                'cv_bank_office'     => $validated['cv_bank_office'] ?? '',
                'cv_number'          => $validated['cv_number'] ?? '',
                'remarks'            => $validated['remarks'] ?? '',
                'entry_date'         => $transDate,
                'trans_time'         => $now,
                'status'             => 'Completed',
            ]);

            // Clean up dummy records
            StudentPaymentDummy::where('receipt_num', $validated['receipt_num'])->delete();

            // Transition student status
            if ($student && $student->status === 'For Payment') {
                $student->update(['status' => 'Enrolled']);
            }

            // GL: record cash receipt journal entry (non-blocking)
            try {
                $completedPayments = StudentPayment::where('receipt_num', $receiptNum)->get();
                app(GlJournalService::class)->recordPayment($paymentData->fresh(), $completedPayments, $user->id);
            } catch (\Throwable $glEx) {
                Log::warning('GL journal entry failed for O.R. #' . $receiptNum . ': ' . $glEx->getMessage());
            }

            $change = $validated['amt_tend'] - $netPayable;

            CacheService::bustPaymentStats();

            return response()->json([
                'data' => [
                    'receipt_num'   => $receiptNum,
                    'student_name'  => $student ? "{$student->lname}, {$student->fname}" : '',
                    'net_payable'   => $netPayable,
                    'amt_tendered'  => $validated['amt_tend'],
                    'change'        => $change,
                    'pay_data_id'   => $paymentData->pay_data_id,
                ],
            ]);
        });
    }

    /**
     * Reset (discard) a staging transaction.
     */
    public function reset(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'receipt_num' => ['required', 'string'],
        ]);

        $user = $request->user();

        $paymentData = StudentPaymentData::where('receipt_num', $validated['receipt_num'])
            ->where('personnel_user_id', $user->id)
            ->where('status', 'Staging')
            ->firstOrFail();

        DB::transaction(function () use ($paymentData, $validated) {
            StudentPaymentDummy::where('receipt_num', $validated['receipt_num'])->delete();
            $paymentData->delete();
        });

        return response()->json(['message' => 'Transaction reset successfully.']);
    }

    /**
     * Get receipt data for printing.
     */
    public function receipt(string $receiptNum): JsonResponse
    {
        $paymentData = StudentPaymentData::with('student:reg_id,lname,fname,mname,student_id,gradeLevel,strand,dept,section')
            ->where('receipt_num', $receiptNum)
            ->firstOrFail();

        $payments = StudentPayment::where('receipt_num', $receiptNum)
            ->where('status', '!=', 'Voided')
            ->get();

        $school = SchoolPreference::first();

        // Build category & particular name maps for receipt display
        $catIds = $payments->pluck('category_id')->unique()->filter()->values();
        $parIds = $payments->pluck('particular_id')->unique()->filter()->values();

        $categoryMap = AccountsCategory::whereIn('category_id', $catIds)
            ->pluck('description', 'category_id');
        $particularMap = AccountsParticular::whereIn('particular_id', $parIds)
            ->pluck('description', 'particular_id');

        return response()->json([
            'data' => [
                'transaction'   => $paymentData,
                'items'         => $payments,
                'school'        => $school ? $school->only(['schoolName', 'address', 'contactNumber', 'emailAddress', 'logo']) : null,
                'categoryMap'   => $categoryMap,
                'particularMap' => $particularMap,
            ],
        ]);
    }

    /**
     * Void a transaction.
     */
    public function void(Request $request, string $id): JsonResponse
    {
        $validated = $request->validate([
            'void_remarks' => ['required', 'string', 'max:255'],
        ]);

        /** @var StudentPaymentData $paymentData */
        $paymentData = StudentPaymentData::findByPublicIdOrFail($id);

        if ($paymentData->status === 'Voided') {
            return response()->json(['message' => 'Transaction already voided.'], 422);
        }

        return DB::transaction(function () use ($paymentData, $validated, $request) {
            // Reverse each payment line item
            $payments = StudentPayment::where('receipt_num', $paymentData->receipt_num)
                ->where('status', '!=', 'Voided')
                ->get();

            foreach ($payments as $payment) {
                /** @var \App\Models\StudentPayment $payment */
                // Reverse the student assessment balance
                $sa = StudentAssessment::where('reg_id', $payment->reg_id)
                    ->where('category_id', $payment->category_id)
                    ->where('particular_id', $payment->particular_id)
                    ->first();

                if ($sa) {
                    /** @var \App\Models\StudentAssessment $sa */
                    $newPaid = (float) $sa->total_amt_paid - (float) $payment->amt_paid;
                    $newBal = (float) $sa->total_amt_payable - ((float) $sa->total_amt_discount + $newPaid);
                    $sa->update([
                        'total_amt_paid' => max(0, $newPaid),
                        'total_amt_bal'  => $newBal,
                    ]);
                }

                $payment->update([
                    'status'       => 'Voided',
                    'void_remarks' => $validated['void_remarks'],
                ]);
            }

            $paymentData->update(['status' => 'Voided']);

            // GL: record reversal journal entry (non-blocking)
            try {
                app(GlJournalService::class)->recordVoid($paymentData, $payments, $request->user()->id);
            } catch (\Throwable $glEx) {
                Log::warning('GL void entry failed for O.R. #' . $paymentData->receipt_num . ': ' . $glEx->getMessage());
            }

            CacheService::bustPaymentStats();

            return response()->json(['message' => 'Transaction voided successfully.']);
        });
    }

    /**
     * Generate a unique sequential receipt number.
     * @deprecated Use ReceiptService::generateReceiptNumber() instead
     */
    private function generateReceiptNumber(): string
    {
        return ReceiptService::generateReceiptNumber();
    }
}
