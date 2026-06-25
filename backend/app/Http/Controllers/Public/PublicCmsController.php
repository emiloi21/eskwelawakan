<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\CmsEvent;
use App\Models\CmsGalleryAlbum;
use App\Models\CmsNews;
use App\Models\CmsSlider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PublicCmsController extends Controller
{
    public function news(Request $request): JsonResponse
    {
        $articles = CmsNews::where('is_published', true)
            ->select('id', 'title', 'slug', 'excerpt', 'category', 'cover_image', 'published_at')
            ->orderByDesc('published_at')
            ->get();

        return response()->json($articles);
    }

    public function newsArticle(string $slug): JsonResponse
    {
        $article = CmsNews::where('is_published', true)
            ->where('slug', $slug)
            ->with('author:id,fname,lname')
            ->firstOrFail();

        return response()->json($article);
    }

    public function albums(): JsonResponse
    {
        $albums = CmsGalleryAlbum::withCount('photos')
            ->orderBy('sort_order')
            ->orderByDesc('event_date')
            ->get(['id', 'title', 'slug', 'description', 'cover_image', 'event_date', 'sort_order']);

        return response()->json($albums);
    }

    public function albumPhotos(string $slug): JsonResponse
    {
        $album = CmsGalleryAlbum::where('slug', $slug)
            ->with('photos')
            ->firstOrFail();

        return response()->json($album);
    }

    public function events(Request $request): JsonResponse
    {
        $query = CmsEvent::where('is_public', true)->orderBy('start_date');

        // Optional year/month filter
        if ($request->filled('year')) {
            $query->whereYear('start_date', $request->integer('year'));
        }
        if ($request->filled('month')) {
            $query->whereMonth('start_date', $request->integer('month'));
        }

        return response()->json($query->get());
    }

    public function sliders(): JsonResponse
    {
        $sliders = CmsSlider::where('is_active', true)
            ->orderBy('sort_order')
            ->get()
            ->map(function (CmsSlider $s) {
                $s->bg_image_url = $s->bg_image
                    ? asset('storage/' . $s->bg_image)
                    : null;
                return $s;
            });

        return response()->json($sliders);
    }
}
