<?php

namespace App\Http\Controllers\Teacher;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\ClassAnnouncement;
use App\Models\ClassMaterial;
use App\Models\ClassModel;
use App\Models\Grade;
use App\Models\Student;
use App\Models\User;
use App\Notifications\GradePosted;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class TeacherPortalController extends Controller
{
    // ── Helpers ────────────────────────────────────────────────────────────────

    private function getPersonnelId(Request $request): int
    {
        return $request->user()->id;
    }

    // ── Dashboard ──────────────────────────────────────────────────────────────

    public function dashboard(Request $request): JsonResponse
    {
        $personnelId = $this->getPersonnelId($request);
        $sy = $request->input('schoolYear', $request->user()->selected_sy ?? '');

        $classes = ClassModel::where('adviser_id', $personnelId)
            ->when($sy, fn($q) => $q->where('schoolYear', $sy))
            ->withCount('students')
            ->get(['class_id', 'gradeLevel', 'strand', 'section', 'dept', 'schoolYear', 'semester']);

        $totalStudents = $classes->sum('students_count');

        return response()->json([
            'classes_count' => $classes->count(),
            'students_count' => $totalStudents,
            'classes' => $classes,
        ]);
    }

    // ── My Classes ─────────────────────────────────────────────────────────────

    public function myClasses(Request $request): JsonResponse
    {
        $personnelId = $this->getPersonnelId($request);
        $sy = $request->input('schoolYear', $request->user()->selected_sy ?? '');

        $classes = ClassModel::where('adviser_id', $personnelId)
            ->when($sy, fn($q) => $q->where('schoolYear', $sy))
            ->withCount('students')
            ->orderBy('gradeLevel')
            ->orderBy('section')
            ->get();

        return response()->json(['data' => $classes]);
    }

    // ── Students in a class ────────────────────────────────────────────────────

    public function classStudents(Request $request, string $classId): JsonResponse
    {
        $personnelId = $this->getPersonnelId($request);

        $class = ClassModel::where('class_id', $classId)
            ->where('adviser_id', $personnelId)
            ->firstOrFail();

        $students = Student::where('class_id', $class->class_id)
            ->whereIn('status', ['Enrolled', 'For Payment', 'Accounts Assessment'])
            ->orderBy('lname')->orderBy('fname')
            ->get(['reg_id', 'student_id', 'lname', 'fname', 'mname', 'suffix', 'sex', 'status', 'gradeLevel', 'strand']);

        return response()->json(['data' => $students, 'class' => $class]);
    }

    // ── Advisee list (students in teacher's advisory class) ────────────────────

    public function advisees(Request $request): JsonResponse
    {
        $personnelId = $this->getPersonnelId($request);
        $sy = $request->input('schoolYear', $request->user()->selected_sy ?? '');

        $classes = ClassModel::where('adviser_id', $personnelId)
            ->when($sy, fn($q) => $q->where('schoolYear', $sy))
            ->pluck('class_id');

        $students = Student::whereIn('class_id', $classes)
            ->whereIn('status', ['Enrolled', 'For Payment'])
            ->orderBy('gradeLevel')->orderBy('section')->orderBy('lname')
            ->get(['reg_id', 'student_id', 'lname', 'fname', 'mname', 'suffix', 'sex',
                   'gradeLevel', 'strand', 'section', 'class_id', 'status']);

        return response()->json(['data' => $students]);
    }

    // ── Grades ─────────────────────────────────────────────────────────────────

    public function grades(Request $request, string $classId): JsonResponse
    {
        $personnelId = $this->getPersonnelId($request);

        $class = ClassModel::where('class_id', $classId)
            ->where('adviser_id', $personnelId)
            ->firstOrFail();

        $subject = $request->input('subject');

        $grades = Grade::where('class_id', $class->class_id)
            ->when($subject, fn($q) => $q->where('subject', $subject))
            ->with('student:reg_id,student_id,lname,fname,mname')
            ->orderBy('subject')
            ->get();

        // List unique subjects for this class
        $subjects = Grade::where('class_id', $class->class_id)
            ->distinct()
            ->pluck('subject');

        return response()->json(['data' => $grades, 'subjects' => $subjects, 'class' => $class]);
    }

    public function saveGrades(Request $request, string $classId): JsonResponse
    {
        $personnelId = $this->getPersonnelId($request);

        $class = ClassModel::where('class_id', $classId)
            ->where('adviser_id', $personnelId)
            ->firstOrFail();

        $validated = $request->validate([
            'grades'                => 'required|array',
            'grades.*.reg_id'       => 'required|integer',
            'grades.*.subject'      => 'required|string|max:100',
            'grades.*.q1'           => 'nullable|numeric|min:0|max:100',
            'grades.*.q2'           => 'nullable|numeric|min:0|max:100',
            'grades.*.q3'           => 'nullable|numeric|min:0|max:100',
            'grades.*.q4'           => 'nullable|numeric|min:0|max:100',
            'grades.*.final_grade'  => 'nullable|numeric|min:0|max:100',
            'grades.*.remarks'      => 'nullable|string|max:50',
        ]);

        foreach ($validated['grades'] as $row) {
            Grade::updateOrCreate(
                [
                    'reg_id'      => $row['reg_id'],
                    'class_id'    => $class->class_id,
                    'subject'     => $row['subject'],
                    'school_year' => $class->schoolYear,
                    'semester'    => $class->semester,
                ],
                [
                    'q1'          => $row['q1'] ?? null,
                    'q2'          => $row['q2'] ?? null,
                    'q3'          => $row['q3'] ?? null,
                    'q4'          => $row['q4'] ?? null,
                    'final_grade' => $row['final_grade'] ?? null,
                    'remarks'     => $row['remarks'] ?? null,
                ]
            );
        }

        // Notify each affected student that grades were updated
        $regIds  = collect($validated['grades'])->pluck('reg_id')->unique()->values();
        $subject = $validated['grades'][0]['subject'] ?? 'subject';
        $users   = User::whereIn('reg_id', $regIds)->whereNotNull('reg_id')->get();
        foreach ($users as $user) {
            try {
                $user->notify(new GradePosted($subject, $class->gradeLevel, $class->schoolYear));
            } catch (\Throwable) {}
        }

        return response()->json(['message' => 'Grades saved.']);
    }

    // ── Attendance ─────────────────────────────────────────────────────────────

    public function attendance(Request $request, string $classId): JsonResponse
    {
        $personnelId = $this->getPersonnelId($request);

        $class = ClassModel::where('class_id', $classId)
            ->where('adviser_id', $personnelId)
            ->firstOrFail();

        $date = $request->input('date', now()->toDateString());

        $records = Attendance::where('class_id', $class->class_id)
            ->where('date', $date)
            ->with('student:reg_id,student_id,lname,fname,mname')
            ->get();

        return response()->json(['data' => $records, 'date' => $date, 'class' => $class]);
    }

    public function saveAttendance(Request $request, string $classId): JsonResponse
    {
        $personnelId = $this->getPersonnelId($request);

        $class = ClassModel::where('class_id', $classId)
            ->where('adviser_id', $personnelId)
            ->firstOrFail();

        $validated = $request->validate([
            'date'                  => 'required|date',
            'records'               => 'required|array',
            'records.*.reg_id'      => 'required|integer',
            'records.*.status'      => 'required|in:Present,Absent,Late,Excused,Half Day',
            'records.*.remarks'     => 'nullable|string|max:255',
        ]);

        foreach ($validated['records'] as $row) {
            Attendance::updateOrCreate(
                [
                    'reg_id'   => $row['reg_id'],
                    'class_id' => $class->class_id,
                    'date'     => $validated['date'],
                ],
                [
                    'status'  => $row['status'],
                    'remarks' => $row['remarks'] ?? null,
                ]
            );
        }

        return response()->json(['message' => 'Attendance saved.']);
    }

    // ── Announcements ──────────────────────────────────────────────────────────

    public function announcements(Request $request, string $classId): JsonResponse
    {
        $personnelId = $this->getPersonnelId($request);

        $class = ClassModel::where('class_id', $classId)
            ->where('adviser_id', $personnelId)
            ->firstOrFail();

        $announcements = ClassAnnouncement::where('class_id', $class->class_id)
            ->with('author:id,fname,lname')
            ->orderByDesc('pinned')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $announcements, 'class' => $class]);
    }

    public function storeAnnouncement(Request $request, string $classId): JsonResponse
    {
        $personnelId = $this->getPersonnelId($request);

        $class = ClassModel::where('class_id', $classId)
            ->where('adviser_id', $personnelId)
            ->firstOrFail();

        $validated = $request->validate([
            'title'  => 'required|string|max:200',
            'body'   => 'required|string|max:5000',
            'pinned' => 'boolean',
        ]);

        $announcement = ClassAnnouncement::create([
            'class_id' => $class->class_id,
            'user_id'  => $request->user()->id,
            'title'    => $validated['title'],
            'body'     => $validated['body'],
            'pinned'   => $validated['pinned'] ?? false,
        ]);

        $announcement->load('author:id,name');

        return response()->json(['data' => $announcement, 'message' => 'Announcement posted.'], 201);
    }

    public function updateAnnouncement(Request $request, string $classId, int $announcementId): JsonResponse
    {
        $personnelId = $this->getPersonnelId($request);

        $class = ClassModel::where('class_id', $classId)
            ->where('adviser_id', $personnelId)
            ->firstOrFail();

        $announcement = ClassAnnouncement::where('id', $announcementId)
            ->where('class_id', $class->class_id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $validated = $request->validate([
            'title'  => 'required|string|max:200',
            'body'   => 'required|string|max:5000',
            'pinned' => 'boolean',
        ]);

        $announcement->update($validated);
        $announcement->load('author:id,name');

        return response()->json(['data' => $announcement, 'message' => 'Announcement updated.']);
    }

    public function deleteAnnouncement(Request $request, string $classId, int $announcementId): JsonResponse
    {
        $personnelId = $this->getPersonnelId($request);

        $class = ClassModel::where('class_id', $classId)
            ->where('adviser_id', $personnelId)
            ->firstOrFail();

        ClassAnnouncement::where('id', $announcementId)
            ->where('class_id', $class->class_id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail()
            ->delete();

        return response()->json(['message' => 'Announcement deleted.']);
    }

    // ── Learning Materials ─────────────────────────────────────────────────────

    public function materials(Request $request, string $classId): JsonResponse
    {
        $personnelId = $this->getPersonnelId($request);

        $class = ClassModel::where('class_id', $classId)
            ->where('adviser_id', $personnelId)
            ->firstOrFail();

        $materials = ClassMaterial::where('class_id', $class->class_id)
            ->with('uploader:id,name')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['data' => $materials, 'class' => $class]);
    }

    public function storeMaterial(Request $request, string $classId): JsonResponse
    {
        $personnelId = $this->getPersonnelId($request);

        $class = ClassModel::where('class_id', $classId)
            ->where('adviser_id', $personnelId)
            ->firstOrFail();

        $request->validate([
            'title'       => 'required|string|max:200',
            'description' => 'nullable|string|max:1000',
            'file'        => 'required|file|max:20480', // 20 MB
        ]);

        $file     = $request->file('file');
        $path     = $file->store('materials', 'public');

        $material = ClassMaterial::create([
            'class_id'    => $class->class_id,
            'user_id'     => $request->user()->id,
            'title'       => $request->input('title'),
            'description' => $request->input('description'),
            'file_path'   => $path,
            'file_name'   => $file->getClientOriginalName(),
            'file_size'   => $file->getSize(),
            'mime_type'   => $file->getMimeType() ?? 'application/octet-stream',
        ]);

        $material->load('uploader:id,name');

        return response()->json(['data' => $material, 'message' => 'Material uploaded.'], 201);
    }

    public function deleteMaterial(Request $request, string $classId, int $materialId): JsonResponse
    {
        $personnelId = $this->getPersonnelId($request);

        $class = ClassModel::where('class_id', $classId)
            ->where('adviser_id', $personnelId)
            ->firstOrFail();

        $material = ClassMaterial::where('id', $materialId)
            ->where('class_id', $class->class_id)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        Storage::disk('public')->delete($material->file_path);
        $material->delete();

        return response()->json(['message' => 'Material deleted.']);
    }
}
