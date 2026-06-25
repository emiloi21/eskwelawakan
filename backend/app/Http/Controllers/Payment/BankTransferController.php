<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Models\BankEwalletAccount;
use App\Models\BankTransferRequest;
use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\StudentPayment;
use App\Models\StudentPaymentData;
use App\Services\ReceiptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BankTransferController extends Controller
{
    // ── Public: list active payment channels ──────────────────────────────────

    public function channels(): JsonResponse
    {
        $channels = BankEwalletAccount::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn($a) => $this->formatChannel($a));

        return response()->json($channels);
    }

    // ── Student: list my transfer requests ────────────────────────────────────

    public function studentList(Request $request): JsonResponse
    {
        $regId = $request->user()->reg_id;
        abort_if(! $regId, 403, 'Account not linked to a student record.');

        $requests = BankTransferRequest::where('reg_id', $regId)
            ->with('paymentChannel')
            ->latest()
            ->get()
            ->map(fn($r) => $this->formatRequest($r));

        return response()->json($requests);
    }

    // ── Student: submit a new transfer request ────────────────────────────────

    public function studentSubmit(Request $request): JsonResponse
    {
        $regId = $request->user()->reg_id;
        abort_if(! $regId, 403, 'Account not linked to a student record.');

        $data = $request->validate([
            'payment_channel_id' => 'required|integer|exists:bank_ewallet_accounts,id',
            'amount'             => 'required|numeric|min:1',
            'reference_number'   => 'required|string|max:200',
            'transfer_date'      => 'required|date',
            'notes'              => 'nullable|string|max:500',
            'receipt'            => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        $channel = BankEwalletAccount::findOrFail($data['payment_channel_id']);
        abort_if(! $channel->is_active, 422, 'This payment channel is no longer active.');

        $student = Student::where('reg_id', $regId)->firstOrFail();
        $path    = $request->file('receipt')->store('bank-receipts', 'public');

        $req = BankTransferRequest::create([
            'reg_id'             => $regId,
            'submitted_by'       => $request->user()->id,
            'school_year'        => $student->schoolYear,
            'amount'             => $data['amount'],
            'payment_channel_id' => $data['payment_channel_id'],
            'reference_number'   => $data['reference_number'],
            'transfer_date'      => $data['transfer_date'],
            'notes'              => $data['notes'] ?? null,
            'receipt_path'       => $path,
            'status'             => 'pending',
        ]);

        return response()->json($this->formatRequest($req->load('paymentChannel')), 201);
    }

    // ── Student: resubmit a rejected request ─────────────────────────────────

    public function studentResubmit(Request $request, string $publicId): JsonResponse
    {
        $regId = $request->user()->reg_id;
        abort_if(! $regId, 403, 'Account not linked to a student record.');

        $req = BankTransferRequest::where('public_id', $publicId)
            ->where('reg_id', $regId)
            ->where('status', 'rejected')
            ->firstOrFail();

        $request->validate([
            'receipt'          => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'reference_number' => 'nullable|string|max:200',
            'transfer_date'    => 'nullable|date',
            'notes'            => 'nullable|string|max:500',
        ]);

        Storage::disk('public')->delete($req->receipt_path);
        $newPath = $request->file('receipt')->store('bank-receipts', 'public');

        $req->update([
            'receipt_path'     => $newPath,
            'reference_number' => $request->input('reference_number', $req->reference_number),
            'transfer_date'    => $request->input('transfer_date', $req->transfer_date?->toDateString()),
            'notes'            => $request->input('notes', $req->notes),
            'status'           => 'pending',
            'rejection_reason' => null,
            'reviewed_by'      => null,
            'reviewed_at'      => null,
        ]);

        return response()->json($this->formatRequest($req->fresh()->load('paymentChannel')));
    }

    // ── Student: cancel a pending request ────────────────────────────────────

    public function studentCancel(Request $request, string $publicId): JsonResponse
    {
        $regId = $request->user()->reg_id;
        abort_if(! $regId, 403, 'Account not linked to a student record.');

        $req = BankTransferRequest::where('public_id', $publicId)
            ->where('reg_id', $regId)
            ->where('status', 'pending')
            ->firstOrFail();

        Storage::disk('public')->delete($req->receipt_path);
        $req->delete();

        return response()->json(['deleted' => true]);
    }

    // ── Parent: list child's transfer requests ────────────────────────────────

    public function parentList(Request $request, string $publicId): JsonResponse
    {
        $user    = $request->user();
        $student = Student::where('public_id', $publicId)->firstOrFail();

        $linked = $user->children()->where('students.reg_id', $student->reg_id)->exists();
        abort_if(! $linked && ! $user->isAdmin(), 403, 'Not authorized for this student.');

        $requests = BankTransferRequest::where('reg_id', $student->reg_id)
            ->with('paymentChannel')
            ->latest()
            ->get()
            ->map(fn($r) => $this->formatRequest($r));

        return response()->json($requests);
    }

    // ── Parent: submit for child ──────────────────────────────────────────────

    public function parentSubmit(Request $request, string $publicId): JsonResponse
    {
        $user    = $request->user();
        $student = Student::where('public_id', $publicId)->firstOrFail();

        $linked = $user->children()->where('students.reg_id', $student->reg_id)->exists();
        abort_if(! $linked && ! $user->isAdmin(), 403, 'Not authorized for this student.');

        $data = $request->validate([
            'payment_channel_id' => 'required|integer|exists:bank_ewallet_accounts,id',
            'amount'             => 'required|numeric|min:1',
            'reference_number'   => 'required|string|max:200',
            'transfer_date'      => 'required|date',
            'notes'              => 'nullable|string|max:500',
            'receipt'            => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        $channel = BankEwalletAccount::findOrFail($data['payment_channel_id']);
        abort_if(! $channel->is_active, 422, 'This payment channel is no longer active.');

        $path = $request->file('receipt')->store('bank-receipts', 'public');

        $req = BankTransferRequest::create([
            'reg_id'             => $student->reg_id,
            'submitted_by'       => $user->id,
            'school_year'        => $student->schoolYear,
            'amount'             => $data['amount'],
            'payment_channel_id' => $data['payment_channel_id'],
            'reference_number'   => $data['reference_number'],
            'transfer_date'      => $data['transfer_date'],
            'notes'              => $data['notes'] ?? null,
            'receipt_path'       => $path,
            'status'             => 'pending',
        ]);

        return response()->json($this->formatRequest($req->load('paymentChannel')), 201);
    }

    // ── Parent: resubmit a rejected request ──────────────────────────────────

    public function parentResubmit(Request $request, string $publicId, string $requestPublicId): JsonResponse
    {
        $user    = $request->user();
        $student = Student::where('public_id', $publicId)->firstOrFail();

        $linked = $user->children()->where('students.reg_id', $student->reg_id)->exists();
        abort_if(! $linked && ! $user->isAdmin(), 403, 'Not authorized for this student.');

        $req = BankTransferRequest::where('public_id', $requestPublicId)
            ->where('reg_id', $student->reg_id)
            ->where('status', 'rejected')
            ->firstOrFail();

        $request->validate([
            'receipt'          => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
            'reference_number' => 'nullable|string|max:200',
            'transfer_date'    => 'nullable|date',
            'notes'            => 'nullable|string|max:500',
        ]);

        Storage::disk('public')->delete($req->receipt_path);
        $newPath = $request->file('receipt')->store('bank-receipts', 'public');

        $req->update([
            'receipt_path'     => $newPath,
            'reference_number' => $request->input('reference_number', $req->reference_number),
            'transfer_date'    => $request->input('transfer_date', $req->transfer_date?->toDateString()),
            'notes'            => $request->input('notes', $req->notes),
            'status'           => 'pending',
            'rejection_reason' => null,
            'reviewed_by'      => null,
            'reviewed_at'      => null,
        ]);

        return response()->json($this->formatRequest($req->fresh()->load('paymentChannel')));
    }

    // ── Parent: cancel a pending request ─────────────────────────────────────

    public function parentCancel(Request $request, string $publicId, string $requestPublicId): JsonResponse
    {
        $user    = $request->user();
        $student = Student::where('public_id', $publicId)->firstOrFail();

        $linked = $user->children()->where('students.reg_id', $student->reg_id)->exists();
        abort_if(! $linked && ! $user->isAdmin(), 403, 'Not authorized for this student.');

        $req = BankTransferRequest::where('public_id', $requestPublicId)
            ->where('reg_id', $student->reg_id)
            ->where('status', 'pending')
            ->firstOrFail();

        Storage::disk('public')->delete($req->receipt_path);
        $req->delete();

        return response()->json(['deleted' => true]);
    }

    // ── Accounting / Cashier: list all requests ───────────────────────────────

    public function cashierList(Request $request): JsonResponse
    {
        $query = BankTransferRequest::with(['student', 'paymentChannel', 'reviewer'])
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->school_year, fn($q, $sy) => $q->where('school_year', $sy))
            ->when($request->search, function ($q, $search) {
                $q->where(function ($sub) use ($search) {
                    $sub->where('reference_number', 'like', '%' . $search . '%')
                        ->orWhereHas('student', fn($sq) =>
                            $sq->where('lname', 'like', '%' . $search . '%')
                               ->orWhere('fname', 'like', '%' . $search . '%')
                               ->orWhere('reg_id', 'like', '%' . $search . '%')
                        );
                });
            })
            ->latest();

        $items = $query->paginate((int) $request->get('per_page', 20));

        $items->getCollection()->transform(fn($r) => $this->formatRequest($r));

        return response()->json($items);
    }

    // ── Accounting: approve → auto-allocate to student ledger ─────────────────

    public function approve(Request $request, string $publicId): JsonResponse
    {
        $req = BankTransferRequest::where('public_id', $publicId)
            ->where('status', 'pending')
            ->firstOrFail();

        DB::transaction(function () use ($req, $request) {
            $student = Student::where('reg_id', $req->reg_id)->firstOrFail();
            $channel = $req->paymentChannel;

            $receiptNum  = ReceiptService::generateReceiptNumber();
            $now         = now();

            // Load outstanding assessment line items (oldest first = consistent FIFO)
            $assessments = StudentAssessment::where('reg_id', $req->reg_id)
                ->where('par_stat', 'Active')
                ->where('total_amt_bal', '>', 0)
                ->orderBy('stud_assess_id')
                ->get();

            // Create payment header
            StudentPaymentData::create([
                'reg_id'             => $req->reg_id,
                'receipt_num'        => $receiptNum,
                'schoolYear'         => $req->school_year,
                'semester'           => $student->sem ?? '-',
                'trans_payment_type' => $channel->account_type === 'bank'
                    ? 'Bank Transfer'
                    : 'E-Wallet',
                'cv_payee'           => $student->full_name,
                'cv_bank_office'     => $channel->provider_name,
                'cv_number'          => $req->reference_number,
                'remarks'            => 'via ' . $channel->provider_name
                    . ' | Ref: ' . $req->reference_number
                    . ' | Transferred: ' . $req->transfer_date?->format('Y-m-d'),
                'entry_date'         => $now->toDateString(),
                'net_amt_payable'    => $req->amount,
                'amt_tend'           => $req->amount,
                'trans_time'         => $now,
                'status'             => 'Completed',
            ]);

            // Auto-allocate payment across outstanding fee line items (FIFO)
            $remaining = (float) $req->amount;

            foreach ($assessments as $sa) {
                if ($remaining <= 0) {
                    break;
                }

                $amtPaid = min($remaining, (float) $sa->total_amt_bal);

                StudentPayment::create([
                    'reg_id'        => $student->reg_id,
                    'lname'         => $student->lname,
                    'fname'         => $student->fname,
                    'receipt_num'   => $receiptNum,
                    'schoolYear'    => $req->school_year,
                    'semester'      => $student->sem ?? '-',
                    'payment_type'  => 'Student Fee',
                    'category_id'   => $sa->category_id,
                    'particular_id' => $sa->particular_id,
                    'amt_payable'   => $sa->total_amt_payable,
                    'amt_paid'      => $amtPaid,
                    'trans_date'    => $now->toDateString(),
                    'trans_time'    => $now,
                    'status'        => '-',
                ]);

                $sa->update([
                    'total_amt_paid' => (float) $sa->total_amt_paid + $amtPaid,
                    'total_amt_bal'  => max(0, (float) $sa->total_amt_bal - $amtPaid),
                ]);

                $remaining -= $amtPaid;
            }

            $req->update([
                'status'      => 'approved',
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => $now,
                'receipt_num' => $receiptNum,
            ]);
        });

        return response()->json($this->formatRequest($req->fresh()->load('paymentChannel', 'reviewer', 'student')));
    }

    // ── Accounting: reject ────────────────────────────────────────────────────

    public function reject(Request $request, string $publicId): JsonResponse
    {
        $req = BankTransferRequest::where('public_id', $publicId)
            ->where('status', 'pending')
            ->firstOrFail();

        $request->validate([
            'reason' => 'required|string|max:500',
        ]);

        $req->update([
            'status'           => 'rejected',
            'rejection_reason' => $request->input('reason'),
            'reviewed_by'      => $request->user()->id,
            'reviewed_at'      => now(),
        ]);

        return response()->json($this->formatRequest($req->fresh()->load('paymentChannel', 'reviewer', 'student')));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private function formatChannel(BankEwalletAccount $a): array
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
            'qr_code_url'    => $a->qr_code_image
                ? asset('storage/' . $a->qr_code_image)
                : null,
        ];
    }

    private function formatRequest(BankTransferRequest $r): array
    {
        $student = $r->relationLoaded('student') ? $r->student : null;
        $channel = $r->relationLoaded('paymentChannel') ? $r->paymentChannel : null;
        $reviewer = $r->relationLoaded('reviewer') ? $r->reviewer : null;

        return [
            'id'               => $r->id,
            'public_id'        => $r->public_id,
            'reg_id'           => $r->reg_id,
            'student_name'     => $student ? $student->full_name : null,
            'student_id'       => $student ? ($student->student_id ?? $student->reg_id) : null,
            'school_year'      => $r->school_year,
            'amount'           => (float) $r->amount,
            'reference_number' => $r->reference_number,
            'transfer_date'    => $r->transfer_date?->toDateString(),
            'notes'            => $r->notes,
            'receipt_url'      => $r->receipt_path
                ? asset('storage/' . $r->receipt_path)
                : null,
            'status'           => $r->status,
            'rejection_reason' => $r->rejection_reason,
            'receipt_num'      => $r->receipt_num,
            'reviewed_at'      => $r->reviewed_at?->toDateTimeString(),
            'reviewed_by_name' => $reviewer ? ($reviewer->name ?? $reviewer->username) : null,
            'submitted_at'     => $r->created_at?->toDateTimeString(),
            'channel'          => $channel ? $this->formatChannel($channel) : null,
        ];
    }
}
