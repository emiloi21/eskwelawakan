<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\CmsSlider;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;

class CmsSliderController extends Controller
{
    public function index(): JsonResponse
    {
        $sliders = CmsSlider::orderBy('sort_order')->get();
        return response()->json($sliders);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'               => 'required|string|max:255',
            'subtitle'            => 'nullable|string|max:500',
            'bg_color'            => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'bg_overlay_color'    => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'bg_overlay_opacity'  => 'nullable|integer|min:0|max:100',
            'btn1_label'          => 'nullable|string|max:100',
            'btn1_link'           => 'nullable|string|max:500',
            'btn1_variant'        => ['nullable', Rule::in(['primary', 'secondary', 'outline', 'ghost'])],
            'btn2_label'          => 'nullable|string|max:100',
            'btn2_link'           => 'nullable|string|max:500',
            'btn2_variant'        => ['nullable', Rule::in(['primary', 'secondary', 'outline', 'ghost'])],
            'text_align'          => ['nullable', Rule::in(['left', 'center', 'right'])],
            'sort_order'          => 'nullable|integer|min:0',
            'is_active'           => 'nullable|boolean',
        ]);

        $slider = CmsSlider::create($data);
        return response()->json($slider, 201);
    }

    public function show(CmsSlider $cmsSlider): JsonResponse
    {
        return response()->json($cmsSlider);
    }

    public function update(Request $request, CmsSlider $cmsSlider): JsonResponse
    {
        $data = $request->validate([
            'title'               => 'sometimes|required|string|max:255',
            'subtitle'            => 'nullable|string|max:500',
            'bg_color'            => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'bg_overlay_color'    => ['nullable', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'bg_overlay_opacity'  => 'nullable|integer|min:0|max:100',
            'btn1_label'          => 'nullable|string|max:100',
            'btn1_link'           => 'nullable|string|max:500',
            'btn1_variant'        => ['nullable', Rule::in(['primary', 'secondary', 'outline', 'ghost'])],
            'btn2_label'          => 'nullable|string|max:100',
            'btn2_link'           => 'nullable|string|max:500',
            'btn2_variant'        => ['nullable', Rule::in(['primary', 'secondary', 'outline', 'ghost'])],
            'text_align'          => ['nullable', Rule::in(['left', 'center', 'right'])],
            'sort_order'          => 'nullable|integer|min:0',
            'is_active'           => 'nullable|boolean',
        ]);

        $cmsSlider->update($data);
        return response()->json($cmsSlider->fresh());
    }

    public function destroy(CmsSlider $cmsSlider): JsonResponse
    {
        if ($cmsSlider->bg_image) {
            Storage::disk('public')->delete($cmsSlider->bg_image);
        }
        $cmsSlider->delete();
        return response()->json(null, 204);
    }

    public function uploadBg(Request $request, CmsSlider $cmsSlider): JsonResponse
    {
        $request->validate(['image' => 'required|image|max:4096']);

        if ($cmsSlider->bg_image) {
            Storage::disk('public')->delete($cmsSlider->bg_image);
        }

        $path = $request->file('image')->store('cms/sliders', 'public');
        $cmsSlider->update(['bg_image' => $path]);

        return response()->json([
            'bg_image'     => $path,
            'bg_image_url' => asset('storage/' . $path),
        ]);
    }

    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'order'   => 'required|array',
            'order.*' => 'integer',
        ]);

        foreach ($request->order as $position => $id) {
            CmsSlider::where('id', $id)->update(['sort_order' => $position + 1]);
        }

        return response()->json(['message' => 'Reordered']);
    }
}
