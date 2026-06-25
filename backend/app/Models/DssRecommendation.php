<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\HasPublicId;

class DssRecommendation extends Model
{
    use HasPublicId;

    protected $fillable = [
        'public_id',
        'recommendation_text',
        'category',
        'priority',
        'basis',
        'related_warning_id',
        'is_actioned',
        'actioned_by',
        'actioned_at',
        'generated_at',
    ];

    protected function casts(): array
    {
        return [
            'is_actioned'  => 'boolean',
            'actioned_at'  => 'datetime',
            'generated_at' => 'datetime',
        ];
    }

    public function relatedWarning(): BelongsTo
    {
        return $this->belongsTo(EarlyWarning::class, 'related_warning_id');
    }

    public function actionedByUser(): BelongsTo
    {
        return $this->belongsTo(\App\Models\User::class, 'actioned_by');
    }
}
