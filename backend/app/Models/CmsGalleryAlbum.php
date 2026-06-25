<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

class CmsGalleryAlbum extends Model
{
    protected $fillable = [
        'title', 'slug', 'description', 'cover_image', 'event_date', 'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'event_date' => 'date',
            'sort_order' => 'integer',
        ];
    }

    public function photos(): HasMany
    {
        return $this->hasMany(CmsGalleryPhoto::class, 'album_id')->orderBy('sort_order');
    }

    protected static function boot(): void
    {
        parent::boot();
        static::creating(function (self $model) {
            if (empty($model->slug)) {
                $model->slug = Str::slug($model->title);
            }
        });
    }
}
