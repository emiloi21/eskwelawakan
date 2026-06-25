<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FlashcardSrLog extends Model
{
    public $timestamps = false;

    protected $table = 'flashcard_sr_log';

    protected $fillable = [
        'user_id', 'card_id', 'ease_factor', 'interval_days',
        'repetitions', 'next_due', 'last_reviewed_at',
    ];

    protected $casts = [
        'ease_factor'      => 'float',
        'interval_days'    => 'integer',
        'repetitions'      => 'integer',
        'next_due'         => 'date',
        'last_reviewed_at' => 'datetime',
        'updated_at'       => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function card(): BelongsTo
    {
        return $this->belongsTo(FlashcardCard::class, 'card_id');
    }

    /**
     * Apply SM-2 algorithm and return updated fields.
     * Rating: 0 = Hard (fail), 1 = Good, 2 = Easy
     */
    public function applyRating(int $rating): void
    {
        // Map user rating to SM-2 quality score (0-5)
        $q = match ($rating) {
            0 => 1,  // Hard — fail
            1 => 3,  // Good
            2 => 5,  // Easy
            default => 3,
        };

        if ($q < 3) {
            // Failed — reset
            $this->repetitions  = 0;
            $this->interval_days = 1;
        } else {
            $interval = match ($this->repetitions) {
                0 => 1,
                1 => 6,
                default => (int) round($this->interval_days * $this->ease_factor),
            };
            $this->interval_days = max(1, $interval);
            $this->repetitions += 1;
        }

        // Update ease factor (SM-2 formula, minimum 1.3)
        $ef = $this->ease_factor + (0.1 - (5 - $q) * (0.08 + (5 - $q) * 0.02));
        $this->ease_factor = max(1.3, round($ef, 2));

        $this->next_due         = now()->addDays($this->interval_days)->toDateString();
        $this->last_reviewed_at = now();
    }
}
