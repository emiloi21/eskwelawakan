<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GatePass extends Model
{
    use HasPublicId;

    protected $table = 'gate_passes';

    protected $fillable = [
        'student_id', 'purpose', 'destination', 'authorized_by',
        'issued_at', 'expected_return', 'actual_return',
        'status', 'notes',
    ];

    protected $casts = [
        'issued_at'       => 'datetime',
        'expected_return' => 'datetime',
        'actual_return'   => 'datetime',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'student_id', 'reg_id');
    }

    public function authorizedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'authorized_by');
    }
}
