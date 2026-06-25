<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CmsGalleryAlbum;
use App\Models\CmsGalleryPhoto;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CmsGalleryController extends Controller
{
    // ── Albums ────────────────────────────────────────────────────────

    public function index(): JsonResponse
    {
        $albums = CmsGalleryAlbum::withCount('photos')
            ->orderBy('sort_order')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($albums);
    }

    public function storeAlbum(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'event_date'  => 'nullable|date',
            'sort_order'  => 'integer|min:0',
        ]);

        $data['slug'] = $this->uniqueSlug(Str::slug($data['title']));

        $album = CmsGalleryAlbum::create($data);

        return response()->json($album->loadCount('photos'), 201);
    }

    public function showAlbum(CmsGalleryAlbum $album): JsonResponse
    {
        return response()->json($album->load('photos'));
    }

    public function updateAlbum(Request $request, CmsGalleryAlbum $album): JsonResponse
    {
        $data = $request->validate([
            'title'       => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'event_date'  => 'nullable|date',
            'sort_order'  => 'integer|min:0',
        ]);

        if (isset($data['title']) && $data['title'] !== $album->title) {
            $data['slug'] = $this->uniqueSlug(Str::slug($data['title']), $album->id);
        }

        $album->update($data);

        return response()->json($album->fresh()->loadCount('photos'));
    }

    public function destroyAlbum(CmsGalleryAlbum $album): JsonResponse
    {
        // Delete all stored photos first
        foreach ($album->photos as $photo) {
            $this->deleteUpload($photo->url);
        }
        if ($album->cover_image) {
            $this->deleteUpload($album->cover_image);
        }
        $album->delete(); // cascade deletes cms_gallery_photos rows

        return response()->json(['message' => 'Album deleted.']);
    }

    public function uploadAlbumCover(Request $request, CmsGalleryAlbum $album): JsonResponse
    {
        $request->validate(['image' => 'required|image|max:4096']);

        if ($album->cover_image) {
            $this->deleteUpload($album->cover_image);
        }

        $path = $request->file('image')->store('cms/albums', 'public');
        $url  = asset('storage/' . $path);

        $album->update(['cover_image' => $url]);

        return response()->json(['url' => $url]);
    }

    // ── Photos ────────────────────────────────────────────────────────

    public function uploadPhoto(Request $request, CmsGalleryAlbum $album): JsonResponse
    {
        $request->validate([
            'photos'    => 'required|array|min:1',
            'photos.*'  => 'required|image|max:8192',
            'captions'  => 'array',
            'captions.*' => 'nullable|string|max:255',
        ]);

        $maxOrder = $album->photos()->max('sort_order') ?? 0;
        $created  = [];

        foreach ($request->file('photos') as $index => $file) {
            $path    = $file->store('cms/photos', 'public');
            $url     = asset('storage/' . $path);
            $caption = $request->input("captions.{$index}");

            $created[] = CmsGalleryPhoto::create([
                'album_id'   => $album->id,
                'url'        => $url,
                'caption'    => $caption,
                'sort_order' => ++$maxOrder,
            ]);
        }

        return response()->json($created, 201);
    }

    public function destroyPhoto(CmsGalleryAlbum $album, CmsGalleryPhoto $photo): JsonResponse
    {
        if ($photo->album_id !== $album->id) {
            return response()->json(['message' => 'Photo does not belong to this album.'], 403);
        }

        $this->deleteUpload($photo->url);
        $photo->delete();

        return response()->json(['message' => 'Photo deleted.']);
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private function uniqueSlug(string $base, ?int $exceptId = null): string
    {
        $slug  = $base;
        $count = 1;
        while (
            CmsGalleryAlbum::where('slug', $slug)
                ->when($exceptId, fn($q) => $q->where('id', '!=', $exceptId))
                ->exists()
        ) {
            $slug = $base . '-' . $count++;
        }

        return $slug;
    }

    private function deleteUpload(string $url): void
    {
        $path = str_replace(asset('storage/'), '', $url);
        Storage::disk('public')->delete($path);
    }
}
