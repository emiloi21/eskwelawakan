<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FiscalYearClosingLog extends Model
{
    protected $table = 'fiscal_year_closing_log';
    protected $primaryKey = 'log_id';

    protected $fillable = [
        'schoolYear', 'students_processed', 'total_amount_converted',
        'records_updated', 'processed_by', 'processed_at',
        'status', 'error_message',
    ];

    protected function casts(): array
    {
        return [
            'total_amount_converted' => 'decimal:2',
            'processed_at' => 'datetime',
        ];
    }
}
