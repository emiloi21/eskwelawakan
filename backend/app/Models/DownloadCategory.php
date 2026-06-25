<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class DownloadCategory extends Model
{
    use HasPublicId;

    protected $table = 'download_categories';

    protected $fillable = ['name', 'description', 'sort_order'];

    public function files(): HasMany
    {
        return $this->hasMany(DownloadFile::class, 'category_id');
    }
}
