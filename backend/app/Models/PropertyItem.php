<?php

namespace App\Models;

use App\Traits\HasPublicId;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class PropertyItem extends Model
{
    use HasPublicId, SoftDeletes;

    protected $table = 'property_items';

    protected $fillable = [
        'property_no', 'name', 'category_id', 'brand', 'model', 'serial_no',
        'condition', 'status', 'location', 'date_acquired', 'acquisition_cost',
        'useful_life_years', 'depreciation_method', 'salvage_value',
        'accumulated_depreciation', 'last_depreciation_date',
        'assigned_to', 'remarks', 'photo',
    ];

    protected $casts = [
        'date_acquired'             => 'date',
        'last_depreciation_date'    => 'date',
        'acquisition_cost'          => 'decimal:2',
        'salvage_value'             => 'decimal:2',
        'accumulated_depreciation'  => 'decimal:2',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(PropertyCategory::class, 'category_id');
    }
}
