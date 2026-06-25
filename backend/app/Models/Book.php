<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use App\Traits\HasPublicId;

class Book extends Model
{
    use HasPublicId;

    protected $primaryKey = 'book_id';

    protected $fillable = [
        'book_title', 'book_amt', 'gradeLevel',
        'strand', 'schoolYear', 'status', 'is_deleted',
    ];

    protected function casts(): array
    {
        return [
            'book_amt' => 'decimal:2',
            'is_deleted' => 'boolean',
        ];
    }

    public function assignments(): HasMany
    {
        return $this->hasMany(BookAssigned::class, 'book_id', 'book_id');
    }
}
