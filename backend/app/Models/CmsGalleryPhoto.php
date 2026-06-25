<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CmsGalleryPhoto extends Model
{
    protected $fillable = [
        'album_id', 'url', 'caption', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'sort_order' => 'integer',
        ];
    }

    public function album(): BelongsTo
    {
        return $this->belongsTo(CmsGalleryAlbum::class, 'album_id');
    }
}
