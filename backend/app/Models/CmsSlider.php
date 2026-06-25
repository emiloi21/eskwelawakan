<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CmsSlider extends Model
{
    protected $table = 'cms_sliders';

    protected $fillable = [
        'title',
        'subtitle',
        'bg_image',
        'bg_color',
        'bg_overlay_color',
        'bg_overlay_opacity',
        'btn1_label',
        'btn1_link',
        'btn1_variant',
        'btn2_label',
        'btn2_link',
        'btn2_variant',
        'text_align',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active'          => 'boolean',
        'bg_overlay_opacity' => 'integer',
        'sort_order'         => 'integer',
    ];
}
