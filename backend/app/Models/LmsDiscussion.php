<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LmsDiscussion extends Model
{
    use HasPublicId;

    protected $table = 'lms_discussions';

    protected $fillable = [
        'class_id', 'user_id', 'title', 'body', 'is_pinned', 'replies_count',
    ];

    protected $casts = [
        'is_pinned'     => 'boolean',
        'replies_count' => 'integer',
    ];

    public function class(): BelongsTo
    {
        return $this->belongsTo(ClassModel::class, 'class_id', 'class_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(LmsDiscussionReply::class, 'discussion_id');
    }
}
