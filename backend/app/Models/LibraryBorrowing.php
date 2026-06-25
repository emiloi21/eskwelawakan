<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LibraryBorrowing extends Model
{
    use HasPublicId;

    protected $table = 'library_borrowings';

    protected $fillable = [
        'book_id', 'borrower_type', 'borrower_ref', 'borrower_name',
        'borrow_date', 'due_date', 'returned_date',
        'fine_amount', 'status', 'issued_by', 'received_by', 'notes',
    ];

    protected $casts = [
        'borrow_date'   => 'date',
        'due_date'      => 'date',
        'returned_date' => 'date',
        'fine_amount'   => 'decimal:2',
    ];

    public function book(): BelongsTo
    {
        return $this->belongsTo(LibraryBook::class, 'book_id');
    }

    public function issuedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'issued_by');
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}
