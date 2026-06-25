<?php

namespace App\Http\Controllers\Downloads;

use App\Http\Controllers\Controller;
use App\Models\DownloadCategory;
use App\Models\DownloadFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DownloadController extends Controller
{
    // ── Public (no auth required) ─────────────────────────────────────────────

    /** Publicly visible files only */
    public function publicList(Request $request): JsonResponse
    {
        $files = DownloadFile::with('category:id,public_id,name')
            ->where('visibility', 'Public')
            ->where('is_active', true)
            ->orderBy('title')
            ->get();

        return response()->json(['data' => $files]);
    }

    // ── Authenticated (any logged-in user) ────────────────────────────────────

    /** Files visible to the calling user based on their role */
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $query = DownloadFile::with('category:id,public_id,name')->where('is_active', true);

        if (!in_array($user->access, ['Administrator', 'Encoder', 'Registrar', 'Cashier', 'Accounting Staff', 'HR', 'Custodian', 'Librarian', 'School Nurse', 'Front Desk', 'Teacher'])) {
            // Students and parents see Public + Authenticated files
            $query->whereIn('visibility', ['Public', 'Authenticated']);
        } else {
            // Staff see Public + Authenticated + Staff Only
            $query->whereIn('visibility', ['Public', 'Authenticated', 'Staff Only']);
        }

        return response()->json(['data' => $query->orderBy('title')->get()]);
    }

    // ── Admin-only CRUD ───────────────────────────────────────────────────────

    // Categories
    public function categories(): JsonResponse
    {
        return response()->json(['data' => DownloadCategory::withCount('files')->orderBy('sort_order')->get()]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100|unique:download_categories,name',
            'description' => 'nullable|string|max:500',
            'sort_order'  => 'nullable|integer|min:0',
        ]);
        return response()->json(['data' => DownloadCategory::create($data)], 201);
    }

    public function updateCategory(Request $request, string $publicId): JsonResponse
    {
        $cat = DownloadCategory::findByPublicIdOrFail($publicId);
        $data = $request->validate([
            'name'        => 'sometimes|string|max:100|unique:download_categories,name,' . $cat->id,
            'description' => 'nullable|string|max:500',
            'sort_order'  => 'nullable|integer|min:0',
        ]);
        $cat->update($data);
        return response()->json(['data' => $cat]);
    }

    public function destroyCategory(string $publicId): JsonResponse
    {
        $cat = DownloadCategory::findByPublicIdOrFail($publicId);
        if ($cat->files()->exists()) {
            return response()->json(['message' => 'Category has files. Cannot delete.'], 422);
        }
        $cat->delete();
        return response()->json(null, 204);
    }

    // Files
    public function files(Request $request): JsonResponse
    {
        $q = DownloadFile::with('category:id,public_id,name', 'uploadedBy:id,fname,lname');

        if ($catId = $request->query('category_id')) {
            $q->where('category_id', $catId);
        }
        if ($visibility = $request->query('visibility')) {
            $q->where('visibility', $visibility);
        }

        return response()->json(['data' => $q->orderBy('title')->get()]);
    }

    public function storeFile(Request $request): JsonResponse
    {
        $data = $request->validate([
            'category_id' => 'required|exists:download_categories,id',
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'file_path'   => 'required|string|max:500',
            'file_name'   => 'required|string|max:255',
            'file_type'   => 'nullable|string|max:50',
            'file_size'   => 'nullable|integer|min:0',
            'visibility'  => 'required|in:Public,Authenticated,Staff Only,Admin Only',
            'school_year' => 'nullable|string|max:20',
            'is_active'   => 'nullable|boolean',
        ]);

        $data['uploaded_by']    = $request->user()->id;
        $data['download_count'] = 0;
        $data['is_active']      = $data['is_active'] ?? true;

        return response()->json(['data' => DownloadFile::create($data)], 201);
    }

    public function updateFile(Request $request, string $publicId): JsonResponse
    {
        $file = DownloadFile::findByPublicIdOrFail($publicId);
        $data = $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'category_id' => 'sometimes|exists:download_categories,id',
            'visibility'  => 'sometimes|in:Public,Authenticated,Staff Only,Admin Only',
            'school_year' => 'nullable|string|max:20',
            'is_active'   => 'nullable|boolean',
        ]);
        $file->update($data);
        return response()->json(['data' => $file]);
    }

    public function destroyFile(string $publicId): JsonResponse
    {
        DownloadFile::findByPublicIdOrFail($publicId)->delete();
        return response()->json(null, 204);
    }

    public function incrementDownload(string $publicId): JsonResponse
    {
        $file = DownloadFile::where('public_id', $publicId)->where('is_active', true)->firstOrFail();
        $file->increment('download_count');
        return response()->json(['data' => ['download_count' => $file->download_count]]);
    }
}
