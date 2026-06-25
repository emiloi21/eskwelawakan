<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SchoolPreference extends Model
{
    protected $fillable = [
        'deped_id', 'logo', 'region', 'division', 'schoolName',
        'address', 'emailAddress', 'contactNumber',
        'activeSchoolYear', 'activeSemester', 'slide_bg_img',
        'fy_closed', 'fy_closed_at', 'fy_closed_by',
        'gl_ar_coa_id', 'gl_cash_coa_id', 'gl_bank_coa_id',
        'gl_ewallet_coa_id', 'gl_voucher_coa_id',
        'gl_income_summary_coa_id', 'gl_retained_coa_id',
    ];

    protected function casts(): array
    {
        return [
            'fy_closed' => 'boolean',
            'fy_closed_at' => 'datetime',
        ];
    }
}
