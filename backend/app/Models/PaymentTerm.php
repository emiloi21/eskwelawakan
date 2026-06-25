<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use App\Traits\HasPublicId;

class PaymentTerm extends Model
{
    use HasPublicId;

    protected $primaryKey = 'pterm_id';

    protected $fillable = [
        'payment_term', 'category', 'month_set_up',
        'year_set_up', 'dept', 'schoolYear',
    ];
}
