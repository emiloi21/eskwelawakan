<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LmsDiscussionReply extends Model
{
    use HasPublicId;

    protected $table = 'lms_discussion_replies';

    protected $fillable = [
        'discussion_id', 'user_id', 'body',
    ];

    public function discussion(): BelongsTo
    {
        return $this->belongsTo(LmsDiscussion::class, 'discussion_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
