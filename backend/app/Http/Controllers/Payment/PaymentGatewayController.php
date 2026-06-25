<?php

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Models\OnlinePaymentTransaction;
use App\Models\Student;
use App\Models\StudentAssessment;
use App\Models\StudentPayment;
use App\Models\StudentPaymentData;
use App\Services\ReceiptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PaymentGatewayController extends Controller
{
    private const PAYMONGO_BASE = 'https://api.paymongo.com/v1';

    // ── Helpers ────────────────────────────────────────────────────────────────

    private function paymongoAuth(): string
    {
        return 'Basic ' . base64_encode(config('services.paymongo.secret_key') . ':');
    }

    private function centavos(float $pesos): int
    {
        return (int) round($pesos * 100);
    }

    /**
     * Build and send a PayMongo Checkout Session for the given student + amount.
     */
    private function createCheckoutSession(Student $student, float $totalBalance, string $successUrl, string $cancelUrl): array
    {
        $payload = [
            'data' => [
                'attributes' => [
                    'billing'              => ['name' => $student->full_name],
                    'send_email_receipt'   => false,
                    'show_description'     => true,
                    'show_line_items'      => true,
                    'cancel_url'           => $cancelUrl,
                    'success_url'          => $successUrl,
                    'description'          => "School Fee Payment – SY {$student->schoolYear}",
                    'line_items'           => [[
                        'currency'    => 'PHP',
                        'amount'      => $this->centavos($totalBalance),
                        'description' => "Total balance for SY {$student->schoolYear}",
                        'name'        => 'School Fees',
                        'quantity'    => 1,
                    ]],
                    'payment_method_types' => ['gcash', 'grab_pay', 'paymaya', 'card', 'billease', 'dob', 'dob_ubp'],
                ],
            ],
        ];

        $response = Http::withHeaders([
            'Authorization' => $this->paymongoAuth(),
            'Content-Type'  => 'application/json',
        ])->post(self::PAYMONGO_BASE . '/checkout_sessions', $payload);

        if (! $response->successful()) {
            Log::error('PayMongo checkout session error', [
                'status'   => $response->status(),
                'body'     => $response->body(),
                'reg_id'   => $student->reg_id,
            ]);
            abort(502, 'Payment gateway error. Please try again later.');
        }

        return $response->json('data');
    }

    // ── Student Checkout ───────────────────────────────────────────────────────

    public function createStudentCheckout(Request $request): JsonResponse
    {
        $regId = $request->user()->reg_id;
        if (! $regId) {
            abort(403, 'Account not linked to a student record.');
        }

        $student = Student::findOrFail($regId);

        $totalBalance = (float) StudentAssessment::where('reg_id', $regId)
            ->where('par_stat', 'Active')
            ->sum('total_amt_bal');

        if ($totalBalance < 1) {
            return response()->json(['message' => 'No outstanding balance to pay.'], 422);
        }

        $frontendUrl = rtrim(config('app.frontend_url', config('app.url')), '/');
        $successUrl  = $frontendUrl . '/student/ledger?payment=success&session_id={id}';
        $cancelUrl   = $frontendUrl . '/student/ledger?payment=cancelled';

        $sessionData = $this->createCheckoutSession($student, $totalBalance, $successUrl, $cancelUrl);
        $sessionId   = $sessionData['id'];
        $checkoutUrl = $sessionData['attributes']['checkout_url'];

        // Record pending transaction
        OnlinePaymentTransaction::create([
            'reg_id'              => $regId,
            'paymongo_session_id' => $sessionId,
            'amount'              => $totalBalance,
            'school_year'         => $student->schoolYear,
            'semester'            => $student->sem ?? '-',
            'status'              => 'pending',
        ]);

        return response()->json([
            'checkout_url' => $checkoutUrl,
            'session_id'   => $sessionId,
            'amount'       => $totalBalance,
        ]);
    }

    // ── Parent Checkout ────────────────────────────────────────────────────────

    public function createParentCheckout(Request $request, string $publicId): JsonResponse
    {
        $user    = $request->user();
        $student = Student::where('public_id', $publicId)->firstOrFail();

        // Verify the parent is linked to this student
        $linked = $user->children()->where('students.reg_id', $student->reg_id)->exists();
        if (! $linked && ! $user->isAdmin()) {
            abort(403, 'You are not authorized to pay for this student.');
        }

        $totalBalance = (float) StudentAssessment::where('reg_id', $student->reg_id)
            ->where('par_stat', 'Active')
            ->sum('total_amt_bal');

        if ($totalBalance < 1) {
            return response()->json(['message' => 'No outstanding balance to pay.'], 422);
        }

        $frontendUrl = rtrim(config('app.frontend_url', config('app.url')), '/');
        $successUrl  = $frontendUrl . "/parent/children/{$publicId}?payment=success&session_id={id}";
        $cancelUrl   = $frontendUrl . "/parent/children/{$publicId}?payment=cancelled";

        $sessionData = $this->createCheckoutSession($student, $totalBalance, $successUrl, $cancelUrl);
        $sessionId   = $sessionData['id'];
        $checkoutUrl = $sessionData['attributes']['checkout_url'];

        OnlinePaymentTransaction::create([
            'reg_id'              => $student->reg_id,
            'paymongo_session_id' => $sessionId,
            'amount'              => $totalBalance,
            'school_year'         => $student->schoolYear,
            'semester'            => $student->sem ?? '-',
            'status'              => 'pending',
        ]);

        return response()->json([
            'checkout_url' => $checkoutUrl,
            'session_id'   => $sessionId,
            'amount'       => $totalBalance,
        ]);
    }

    // ── PayMongo Webhook ───────────────────────────────────────────────────────

    public function webhook(Request $request): Response
    {
        $webhookSecret = config('services.paymongo.webhook_secret');

        // Verify signature when a secret is configured
        if ($webhookSecret) {
            $sigHeader = $request->header('X-PayMongo-Signature', '');
            if (! $this->verifyWebhookSignature($request->getContent(), $sigHeader, $webhookSecret)) {
                Log::warning('PayMongo webhook: invalid signature');
                return response('Invalid signature', 400);
            }
        }

        $payload   = $request->json()->all();
        $eventType = $payload['data']['attributes']['type'] ?? null;

        // Only handle successful payment events
        if ($eventType !== 'checkout_session.payment.paid') {
            return response('OK', 200);
        }

        $sessionId = $payload['data']['attributes']['data']['id'] ?? null;
        if (! $sessionId) {
            return response('OK', 200);
        }

        $tx = OnlinePaymentTransaction::where('paymongo_session_id', $sessionId)
            ->where('status', 'pending')
            ->first();

        if (! $tx) {
            // Already processed or unknown session
            return response('OK', 200);
        }

        try {
            $this->postOnlinePayment($tx, $payload['data']);
        } catch (\Throwable $e) {
            Log::error('PayMongo webhook: failed to post payment', [
                'session_id' => $sessionId,
                'error'      => $e->getMessage(),
            ]);
            // Return 200 so PayMongo doesn't retry indefinitely;
            // the error is logged for manual review.
            return response('OK', 200);
        }

        return response('OK', 200);
    }

    // ── Payment Status (polling) ───────────────────────────────────────────────

    /**
     * Let the frontend poll whether a session has been paid.
     * Called from the success redirect page.
     */
    public function sessionStatus(Request $request, string $sessionId): JsonResponse
    {
        $tx = OnlinePaymentTransaction::where('paymongo_session_id', $sessionId)->first();

        if (! $tx) {
            return response()->json(['status' => 'unknown']);
        }

        return response()->json([
            'status'     => $tx->status,
            'amount'     => (float) $tx->amount,
            'receipt_num' => $tx->receipt_num,
        ]);
    }

    // ── Private Helpers ────────────────────────────────────────────────────────

    private function verifyWebhookSignature(string $rawBody, string $sigHeader, string $secret): bool
    {
        // PayMongo signature header format: t=<timestamp>,te=<test_sig>,li=<live_sig>
        $parts = [];
        foreach (explode(',', $sigHeader) as $part) {
            [$k, $v] = array_pad(explode('=', $part, 2), 2, '');
            $parts[$k] = $v;
        }

        $timestamp = $parts['t'] ?? '';
        $env       = app()->environment('production') ? 'li' : 'te';
        $provided  = $parts[$env] ?? '';

        if (! $timestamp || ! $provided) {
            return false;
        }

        $expected = hash_hmac('sha256', $timestamp . '.' . $rawBody, $secret);

        return hash_equals($expected, $provided);
    }

    /**
     * Post the online payment to student accounts (inside DB transaction).
     */
    private function postOnlinePayment(OnlinePaymentTransaction $tx, array $paymongoData): void
    {
        DB::transaction(function () use ($tx, $paymongoData) {
            $student = Student::where('reg_id', $tx->reg_id)->firstOrFail();

            $receiptNum = ReceiptService::generateReceiptNumber();
            $now        = now();

            // Get all active assessments with a balance, ordered for consistent application
            $assessments = StudentAssessment::where('reg_id', $tx->reg_id)
                ->where('par_stat', 'Active')
                ->where('total_amt_bal', '>', 0)
                ->orderBy('stud_assess_id')
                ->get();

            // Create payment data header
            $paymentData = StudentPaymentData::create([
                'reg_id'             => $tx->reg_id,
                'receipt_num'        => $receiptNum,
                'schoolYear'         => $tx->school_year ?? $student->schoolYear,
                'semester'           => $tx->semester ?? $student->sem ?? '-',
                'trans_payment_type' => 'Online Payment',
                'cv_payee'           => $student->full_name,
                'cv_bank_office'     => 'PayMongo',
                'cv_number'          => $tx->paymongo_session_id,
                'remarks'            => 'Online payment via PayMongo',
                'entry_date'         => $now->toDateString(),
                'net_amt_payable'    => $tx->amount,
                'amt_tend'           => $tx->amount,
                'trans_time'         => $now,
                'status'             => 'Completed',
            ]);

            // Distribute the payment amount across assessment line items
            $remaining = (float) $tx->amount;

            foreach ($assessments as $sa) {
                if ($remaining <= 0) {
                    break;
                }

                $amtPaid = min($remaining, (float) $sa->total_amt_bal);

                StudentPayment::create([
                    'reg_id'       => $student->reg_id,
                    'lname'        => $student->lname,
                    'fname'        => $student->fname,
                    'receipt_num'  => $receiptNum,
                    'schoolYear'   => $tx->school_year ?? $student->schoolYear,
                    'semester'     => $tx->semester ?? $student->sem ?? '-',
                    'payment_type' => 'Student Fee',
                    'category_id'  => $sa->category_id,
                    'particular_id' => $sa->particular_id,
                    'amt_payable'  => $sa->total_amt_payable,
                    'amt_paid'     => $amtPaid,
                    'trans_date'   => $now->toDateString(),
                    'trans_time'   => $now,
                    'status'       => '-',
                ]);

                $newPaid = (float) $sa->total_amt_paid + $amtPaid;
                $newBal  = max(0, (float) $sa->total_amt_bal - $amtPaid);

                $sa->update([
                    'total_amt_paid' => $newPaid,
                    'total_amt_bal'  => $newBal,
                ]);

                $remaining -= $amtPaid;
            }

            // Mark the online transaction as paid
            $tx->update([
                'status'     => 'paid',
                'receipt_num' => $receiptNum,
                'metadata'   => array_merge($tx->metadata ?? [], [
                    'paymongo_data' => [
                        'session_id'       => $tx->paymongo_session_id,
                        'payment_intent_id' => $paymongoData['attributes']['payment_intent']['id'] ?? null,
                    ],
                ]),
            ]);
        });
    }
}
