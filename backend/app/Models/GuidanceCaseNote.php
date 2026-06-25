<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GuidanceCaseNote extends Model
{
    use HasPublicId;

    protected $fillable = [
        'public_id',
        'session_id',
        'case_id',
        'note_date',
        'subjective',
        'objective',
        'assessment',
        'plan',
        'written_by',
    ];

    protected $casts = [
        'note_date' => 'date',
    ];

    public function session(): BelongsTo
    {
        return $this->belongsTo(GuidanceSession::class, 'session_id');
    }

    public function caseRecord(): BelongsTo
    {
        return $this->belongsTo(GuidanceCaseRecord::class, 'case_id');
    }

    public function writtenBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'written_by');
    }
}
