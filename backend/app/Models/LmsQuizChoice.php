<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LmsQuizChoice extends Model
{
    protected $table = 'lms_quiz_choices';

    public $timestamps = false;

    protected $fillable = ['question_id', 'text', 'is_correct', 'order'];

    protected $casts = [
        'is_correct' => 'boolean',
        'order'      => 'integer',
    ];

    public function question(): BelongsTo
    {
        return $this->belongsTo(LmsQuizQuestion::class, 'question_id');
    }
}
