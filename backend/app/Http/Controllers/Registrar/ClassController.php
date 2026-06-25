<?php

namespace App\Http\Controllers\Registrar;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Models\Personnel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ClassController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ClassModel::query();

        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }

        if ($dept = $request->query('dept')) {
            $query->where('dept', $dept);
        }

        if ($gradeLevel = $request->query('gradeLevel')) {
            $query->where('gradeLevel', $gradeLevel);
        }

        $classes = $query->withCount('students')
            ->orderBy('dept')
            ->orderBy('gradeLevel')
            ->orderBy('section')
            ->paginate($request->query('per_page', 50));

        return response()->json($classes);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'gradeLevel' => ['required', 'string', 'max:255'],
            'strand' => ['nullable', 'string', 'max:255'],
            'major' => ['nullable', 'string', 'max:55'],
            'section' => ['required', 'string', 'max:255'],
            'dept' => ['required', 'string', 'max:55'],
            'adviser_id' => ['nullable', 'integer'],
            'adviser' => ['nullable', 'string', 'max:255'],
            'schoolYear' => ['required', 'string', 'max:9'],
            'semester' => ['nullable', 'string', 'max:255'],
        ]);

        $validated['strand'] = $validated['strand'] ?? '-';
        $validated['major'] = $validated['major'] ?? 'N/A';
        $validated['adviser_id'] = $validated['adviser_id'] ?? 0;
        $validated['adviser'] = $validated['adviser'] ?? '-';
        $validated['semester'] = $validated['semester'] ?? '-';

        $class = ClassModel::create($validated);

        return response()->json(['data' => $class->loadCount('students')], 201);
    }

    public function show(string $classId): JsonResponse
    {
        $class = ClassModel::withCount('students')
            ->with(['students' => function ($q) {
                $q->orderBy('lname')->orderBy('fname');
            }])
            ->where('public_id', $classId)->firstOrFail();

        return response()->json(['data' => $class]);
    }

    public function update(Request $request, string $classId): JsonResponse
    {
        $class = ClassModel::findByPublicIdOrFail($classId);

        $validated = $request->validate([
            'gradeLevel' => ['sometimes', 'string', 'max:255'],
            'strand' => ['nullable', 'string', 'max:255'],
            'major' => ['nullable', 'string', 'max:55'],
            'section' => ['sometimes', 'string', 'max:255'],
            'dept' => ['sometimes', 'string', 'max:55'],
            'adviser_id' => ['nullable', 'integer'],
            'adviser' => ['nullable', 'string', 'max:255'],
            'schoolYear' => ['sometimes', 'string', 'max:9'],
            'semester' => ['nullable', 'string', 'max:255'],
        ]);

        $class->update($validated);

        return response()->json(['data' => $class->fresh()->loadCount('students')]);
    }

    public function destroy(string $classId): JsonResponse
    {
        $class = ClassModel::withCount('students')->where('public_id', $classId)->firstOrFail();

        if ($class->students_count > 0) {
            return response()->json([
                'message' => 'Cannot delete class with assigned students. Remove students first.',
            ], 422);
        }

        $class->delete();

        return response()->json(['message' => 'Class deleted.']);
    }

    public function assignStudents(Request $request, string $classId): JsonResponse
    {
        $class = ClassModel::findByPublicIdOrFail($classId);

        $validated = $request->validate([
            'student_ids' => ['required', 'array', 'min:1'],
            'student_ids.*' => ['integer', 'exists:students,reg_id'],
        ]);

        \App\Models\Student::whereIn('reg_id', $validated['student_ids'])
            ->update([
                'class_id' => $class->class_id,
                'section' => $class->section,
            ]);

        return response()->json([
            'message' => count($validated['student_ids']) . ' students assigned.',
            'data' => $class->fresh()->loadCount('students'),
        ]);
    }

    public function copyFromYear(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'source_sy'      => ['required', 'string', 'max:9'],
            'destination_sy' => ['required', 'string', 'max:9', 'different:source_sy'],
        ]);

        $sourceClasses = ClassModel::where('schoolYear', $validated['source_sy'])->get();

        if ($sourceClasses->isEmpty()) {
            return response()->json([
                'message' => "No classes found in {$validated['source_sy']}.",
            ], 422);
        }

        $copied = 0;
        $skipped = 0;

        foreach ($sourceClasses as $src) {
            $exists = ClassModel::where('gradeLevel', $src->gradeLevel)
                ->where('strand', $src->strand)
                ->where('section', $src->section)
                ->where('schoolYear', $validated['destination_sy'])
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            ClassModel::create([
                'gradeLevel' => $src->gradeLevel,
                'strand'     => $src->strand,
                'major'      => $src->major,
                'section'    => $src->section,
                'dept'       => $src->dept,
                'schoolYear' => $validated['destination_sy'],
                'semester'   => $src->semester,
            ]);

            $copied++;
        }

        return response()->json([
            'message' => "Copied {$copied} class(es), skipped {$skipped} duplicate(s).",
            'copied'  => $copied,
            'skipped' => $skipped,
        ]);
    }

    public function advisers(): JsonResponse
    {
        $personnel = Personnel::orderBy('lname')
            ->orderBy('fname')
            ->get(['personnel_id', 'fname', 'mname', 'lname', 'suffix', 'dept', 'position']);

        return response()->json(['data' => $personnel]);
    }
}
