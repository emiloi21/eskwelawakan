<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class DownloadFile extends Model
{
    use HasPublicId, SoftDeletes;

    protected $table = 'download_files';

    protected $fillable = [
        'category_id', 'title', 'description',
        'file_path', 'file_name', 'file_type', 'file_size',
        'download_count', 'visibility', 'school_year',
        'is_active', 'uploaded_by',
    ];

    protected $casts = [
        'is_active'      => 'boolean',
        'download_count' => 'integer',
        'file_size'      => 'integer',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(DownloadCategory::class, 'category_id');
    }

    public function uploadedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by');
    }
}
