<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\AssessmentDiscount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayableController extends Controller
{
    /**
     * List payable balances (A/P — amounts school owes).
     */
    public function index(Request $request): JsonResponse
    {
        $query = AssessmentDiscount::with('student:reg_id,lname,fname,mname,student_id,gradeLevel,dept')
            ->where('type', 'Payable')
            ->where('status', '!=', 'Cancelled');

        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }

        $items = $query->orderBy('discount_id', 'desc')
            ->paginate($request->query('per_page', 50));

        $items->getCollection()->transform(function ($item) {
            $item->balance = (float) $item->amount - (float) $item->amt_rcv_paid;
            return $item;
        });

        return response()->json($items);
    }

    /**
     * Summary stats for payables.
     */
    public function summary(Request $request): JsonResponse
    {
        $query = AssessmentDiscount::where('type', 'Payable')
            ->where('status', '!=', 'Cancelled');

        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }

        $total = (clone $query)->sum('amount');
        $paid = (clone $query)->sum('amt_rcv_paid');
        $count = (clone $query)->count();

        return response()->json([
            'data' => [
                'total_payable'  => (float) $total,
                'total_paid'     => (float) $paid,
                'total_balance'  => (float) $total - (float) $paid,
                'count'          => $count,
            ],
        ]);
    }
}
