<?php

namespace App\Services;

use App\Models\ReceiptGen;
use App\Models\StudentPaymentData;

class ReceiptService
{
    /**
     * Generate a unique sequential receipt number.
     *
     * MUST be called inside a DB::transaction() so that
     * lockForUpdate() actually serializes concurrent access.
     */
    public static function generateReceiptNumber(): string
    {
        $receipt = ReceiptGen::lockForUpdate()->first();

        if (!$receipt) {
            $receipt = ReceiptGen::create(['current_or' => 1]);
        }

        $newOr = $receipt->current_or + 1;
        $receiptNum = str_pad($newOr, 7, '0', STR_PAD_LEFT);

        // Ensure uniqueness against existing receipts
        while (StudentPaymentData::where('receipt_num', $receiptNum)->exists()) {
            $newOr++;
            $receiptNum = str_pad($newOr, 7, '0', STR_PAD_LEFT);
        }

        $receipt->update(['current_or' => $newOr]);

        return $receiptNum;
    }
}
