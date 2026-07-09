<?php

namespace App\Http\Controllers;

use App\Models\StudentRequirement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileDownloadController extends Controller
{
    /**
     * Download a student requirement file securely.
     */
    public function downloadRequirement(Request $request, string $publicId)
    {
        $requirement = StudentRequirement::where('public_id', $publicId)->firstOrFail();

        if (!$requirement->file_path) {
            abort(404, 'File not found on record.');
        }

        // Only allow if the file exists on the local disk
        if (!Storage::disk('local')->exists($requirement->file_path)) {
            // Fallback: check public disk in case it hasn't been migrated
            if (Storage::disk('public')->exists($requirement->file_path)) {
                return Storage::disk('public')->download($requirement->file_path);
            }
            abort(404, 'File does not exist on disk.');
        }

        return Storage::disk('local')->download($requirement->file_path);
    }
}
