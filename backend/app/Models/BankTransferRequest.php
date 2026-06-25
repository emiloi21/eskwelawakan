<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BankTransferRequest extends Model
{
    use HasPublicId;

    protected $table = 'bank_transfer_requests';

    protected $fillable = [
        'reg_id',
        'submitted_by',
        'school_year',
        'amount',
        'payment_channel_id',
        'reference_number',
        'transfer_date',
        'notes',
        'receipt_path',
        'status',
        'rejection_reason',
        'reviewed_by',
        'reviewed_at',
        'receipt_num',
    ];

    protected $casts = [
        'amount'       => 'float',
        'transfer_date' => 'date',
        'reviewed_at'  => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }

    public function submittedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function paymentChannel(): BelongsTo
    {
        return $this->belongsTo(BankEwalletAccount::class, 'payment_channel_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function getReceiptUrlAttribute(): ?string
    {
        return $this->receipt_path
            ? asset('storage/' . $this->receipt_path)
            : null;
    }
}
