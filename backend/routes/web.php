<?php

use Illuminate\Support\Facades\Route;

// Serve the React SPA for all non-API routes
Route::get('/{any?}', function () {
    $path = public_path('index.html');
    if (file_exists($path)) {
        return response()->file($path);
    }
    abort(404);
})->where('any', '^(?!api|storage|sanctum).*$');
