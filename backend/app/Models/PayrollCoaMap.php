<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PayrollCoaMap extends Model
{
    protected $table = 'payroll_coa_map';

    protected $fillable = ['account_key', 'label', 'coa_id'];

    public function account()
    {
        return $this->belongsTo(ChartOfAccount::class, 'coa_id', 'coa_id');
    }
}
