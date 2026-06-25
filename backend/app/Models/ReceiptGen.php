<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ReceiptGen extends Model
{
    protected $table = 'receipt_gen';

    protected $fillable = ['current_or'];
}
