<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class KioskSlide extends Model
{
    protected $fillable = [
        'image_path', 'title', 'subtitle', 'bg_color', 'sort_order', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_active'  => 'boolean',
            'sort_order' => 'integer',
        ];
    }
}
