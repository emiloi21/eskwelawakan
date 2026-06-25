<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasPublicId;

class BookAssigned extends Model
{
    use HasPublicId;

    protected $table = 'book_assigned';
    protected $primaryKey = 'b_a_id';

    protected $fillable = [
        'reg_id', 'particular_id', 'book_id', 'book_amt',
    ];

    protected function casts(): array
    {
        return [
            'book_amt' => 'decimal:2',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }

    public function book(): BelongsTo
    {
        return $this->belongsTo(Book::class, 'book_id', 'book_id');
    }
}
