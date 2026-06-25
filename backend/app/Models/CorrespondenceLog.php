<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CorrespondenceLog extends Model
{
    use HasPublicId;

    protected $table = 'correspondence_logs';

    protected $fillable = [
        'direction', 'reference_no', 'from_to', 'subject',
        'category', 'document_date', 'handled_by',
        'follow_up_date', 'status', 'notes', 'file_path',
    ];

    protected $casts = [
        'document_date'  => 'date',
        'follow_up_date' => 'date',
    ];

    public function handledBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }
}
