<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CmsNews;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CmsNewsController extends Controller
{
    public function index(): JsonResponse
    {
        $articles = CmsNews::with('author:id,fname,lname')
            ->orderByDesc('created_at')
            ->get();

        return response()->json($articles);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'        => 'required|string|max:255',
            'excerpt'      => 'nullable|string|max:500',
            'body'         => 'nullable|string',
            'category'     => 'required|string|max:100',
            'is_published' => 'boolean',
        ]);

        $data['author_id']    = Auth::id();
        $data['slug']         = $this->uniqueSlug(Str::slug($data['title']));
        $data['published_at'] = ($data['is_published'] ?? false) ? now() : null;

        $article = CmsNews::create($data);

        return response()->json($article->load('author:id,name'), 201);
    }

    public function show(CmsNews $cmsNews): JsonResponse
    {
        return response()->json($cmsNews->load('author:id,name'));
    }

    public function update(Request $request, CmsNews $cmsNews): JsonResponse
    {
        $data = $request->validate([
            'title'        => 'sometimes|required|string|max:255',
            'excerpt'      => 'nullable|string|max:500',
            'body'         => 'nullable|string',
            'category'     => 'sometimes|required|string|max:100',
            'is_published' => 'boolean',
        ]);

        // Update slug if title changed
        if (isset($data['title']) && $data['title'] !== $cmsNews->title) {
            $data['slug'] = $this->uniqueSlug(Str::slug($data['title']), $cmsNews->id);
        }

        // Set published_at when toggling publish on
        if (isset($data['is_published'])) {
            if ($data['is_published'] && !$cmsNews->is_published) {
                $data['published_at'] = now();
            } elseif (!$data['is_published']) {
                $data['published_at'] = null;
            }
        }

        $cmsNews->update($data);

        return response()->json($cmsNews->fresh()->load('author:id,name'));
    }

    public function destroy(CmsNews $cmsNews): JsonResponse
    {
        if ($cmsNews->cover_image) {
            $this->deleteUpload($cmsNews->cover_image);
        }
        $cmsNews->delete();

        return response()->json(['message' => 'Deleted.']);
    }

    public function uploadCover(Request $request, CmsNews $cmsNews): JsonResponse
    {
        $request->validate(['image' => 'required|image|max:4096']);

        if ($cmsNews->cover_image) {
            $this->deleteUpload($cmsNews->cover_image);
        }

        $path = $request->file('image')->store('cms/news', 'public');
        $url  = asset('storage/' . $path);

        $cmsNews->update(['cover_image' => $url]);

        return response()->json(['url' => $url]);
    }

    // ── Helpers ──────────────────────────────────────────────────────

    private function uniqueSlug(string $base, ?int $exceptId = null): string
    {
        $slug  = $base;
        $count = 1;
        while (
            CmsNews::where('slug', $slug)
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
