<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BankEwalletAccount extends Model
{
    use HasPublicId;

    protected $table = 'bank_ewallet_accounts';

    protected $fillable = [
        'account_type',
        'provider_name',
        'account_name',
        'account_number',
        'branch',
        'qr_code_image',
        'instructions',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_active'   => 'boolean',
        'sort_order'  => 'integer',
    ];

    public function transferRequests(): HasMany
    {
        return $this->hasMany(BankTransferRequest::class, 'payment_channel_id');
    }

    public function getQrCodeUrlAttribute(): ?string
    {
        return $this->qr_code_image
            ? asset('storage/' . $this->qr_code_image)
            : null;
    }
}
