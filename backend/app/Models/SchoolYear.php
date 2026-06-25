<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasPublicId;

class SchoolYear extends Model
{
    use HasPublicId;

    protected $primaryKey = 'id';

    protected $fillable = [
        'school_year', 'status',
        'fy_start_date', 'fy_end_date',
        'fy_closed', 'fy_closed_at', 'fy_closed_by',
    ];

    protected function casts(): array
    {
        return [
            'fy_closed' => 'boolean',
            'fy_start_date' => 'date:Y-m-d',
            'fy_end_date' => 'date:Y-m-d',
            'fy_closed_at' => 'datetime',
        ];
    }

    public function closingLogs(): HasMany
    {
        return $this->hasMany(FiscalYearClosingLog::class, 'schoolYear', 'school_year');
    }
}
