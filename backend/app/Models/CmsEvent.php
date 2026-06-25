<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CmsEvent extends Model
{
    protected $fillable = [
        'title', 'description', 'start_date', 'end_date',
        'location', 'category', 'color', 'is_public',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'is_public' => 'boolean',
        ];
    }
}
