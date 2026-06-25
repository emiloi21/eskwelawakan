<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GuidanceAnecdotalRecord extends Model
{
    use HasPublicId;

    protected $fillable = [
        'public_id',
        'reg_id',
        'observed_by_name',
        'observed_by_role',
        'observed_by_user_id',
        'observation_date',
        'location',
        'behavior_description',
        'interpretation',
        'filed_by',
    ];

    protected $casts = [
        'observation_date' => 'date',
    ];

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class, 'reg_id', 'reg_id');
    }

    public function observedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'observed_by_user_id');
    }

    public function filedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'filed_by');
    }
}
