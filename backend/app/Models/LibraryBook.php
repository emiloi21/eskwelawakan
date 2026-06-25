<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class LibraryBook extends Model
{
    use HasPublicId, SoftDeletes;

    protected $table = 'library_books';

    protected $fillable = [
        'isbn', 'title', 'author', 'publisher', 'year_published', 'edition',
        'category_id', 'total_copies', 'available_copies', 'location',
        'call_number', 'description', 'cover_photo', 'status',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(LibraryCategory::class, 'category_id');
    }

    public function borrowings(): HasMany
    {
        return $this->hasMany(LibraryBorrowing::class, 'book_id');
    }
}
