<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class LmsSubmissionFile extends Model
{
    public $timestamps = false;

    protected $table = 'lms_submission_files';

    protected $fillable = [
        'submission_id', 'original_name', 'stored_path',
        'file_type', 'file_size',
    ];

    protected $appends = ['download_url'];

    public function getDownloadUrlAttribute(): string
    {
        return Storage::disk('public')->url($this->stored_path);
    }

    public function submission(): BelongsTo
    {
        return $this->belongsTo(LmsSubmission::class, 'submission_id');
    }
}
