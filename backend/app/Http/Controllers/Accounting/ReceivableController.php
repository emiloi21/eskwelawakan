<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AssessmentDiscount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReceivableController extends Controller
{
    /**
     * List receivable balances (A/R — government subsidies, vouchers).
     */
    public function index(Request $request): JsonResponse
    {
        $query = AssessmentDiscount::with('student:reg_id,lname,fname,mname,student_id,gradeLevel,dept')
            ->where('type', 'Receivable')
            ->where('status', '!=', 'Cancelled');

        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }

        $items = $query->orderBy('discount_id', 'desc')
            ->paginate($request->query('per_page', 50));

        // Add computed balance
        $items->getCollection()->transform(function ($item) {
            $item->balance = (float) $item->amount - (float) $item->amt_rcv_paid;
            return $item;
        });

        return response()->json($items);
    }

    /**
     * Summary stats for receivables.
     */
    public function summary(Request $request): JsonResponse
    {
        $query = AssessmentDiscount::where('type', 'Receivable')
            ->where('status', '!=', 'Cancelled');

        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }

        $total = (clone $query)->sum('amount');
        $collected = (clone $query)->sum('amt_rcv_paid');
        $count = (clone $query)->count();

        return response()->json([
            'data' => [
                'total_receivable' => (float) $total,
                'total_collected'  => (float) $collected,
                'total_balance'    => (float) $total - (float) $collected,
                'count'            => $count,
            ],
        ]);
    }
}
