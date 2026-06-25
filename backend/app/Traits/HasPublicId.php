<?php

namespace App\Traits;

use Illuminate\Support\Str;

trait HasPublicId
{
    public static function bootHasPublicId(): void
    {
        static::creating(function ($model) {
            if (empty($model->public_id)) {
                $model->public_id = static::generatePublicId();
            }
        });
    }

    public static function generatePublicId(): string
    {
        do {
            $id = strtolower(Str::random(20));
        } while (static::where('public_id', $id)->exists());

        return $id;
    }

    /**
     * @return static
     */
    public static function findByPublicIdOrFail(string $publicId)
    {
        return static::where('public_id', $publicId)->firstOrFail();
    }

    public function getRouteKeyName(): string
    {
        return 'public_id';
    }
}
