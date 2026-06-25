<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LibraryCategory extends Model
{
    use HasPublicId;

    protected $table = 'library_categories';

    protected $fillable = ['name', 'description'];

    public function books(): HasMany
    {
        return $this->hasMany(LibraryBook::class, 'category_id');
    }
}
