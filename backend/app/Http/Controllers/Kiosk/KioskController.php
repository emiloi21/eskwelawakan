<?php

namespace App\Http\Controllers\Kiosk;

use App\Http\Controllers\Controller;
use App\Models\AttendanceLog;
use App\Models\HrmsPersonnel;
use App\Models\Kiosk;
use App\Models\KioskSlide;
use App\Models\Student;
use App\Models\User;
use App\Notifications\StudentAttendanceLogged;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class KioskController extends Controller
{
    /**
     * POST /kiosk/scan  — public endpoint, no auth required
     * Body: { code: string }
     */
    public function scan(Request $request): JsonResponse
    {
        $request->validate([
            'code'       => 'required|string|max:100',
            'kiosk_id'   => 'nullable|integer',
            'kiosk_code' => 'nullable|string|max:8',
        ]);
        $code      = trim($request->input('code'));
        $kioskCode = $request->input('kiosk_code');

        // Resolve direction_mode from kiosk config
        $directionMode = 'auto';
        if ($kioskCode) {
            $kiosk = Kiosk::where('kiosk_code', $kioskCode)->first();
            if ($kiosk && $kiosk->is_active) {
                $directionMode = $kiosk->direction_mode;
            }
        } elseif ($request->filled('kiosk_id')) {
            $kiosk = Kiosk::find($request->input('kiosk_id'));
            if ($kiosk && $kiosk->is_active) {
                $directionMode = $kiosk->direction_mode;
            }
        }

        // Helper: determine direction
        $resolveDirection = function (string $entityType, string $entityId) use ($directionMode): string {
            if ($directionMode === 'force_in')  return 'in';
            if ($directionMode === 'force_out') return 'out';
            // auto: toggle based on last log today
            $lastLog = AttendanceLog::where('entity_type', $entityType)
                ->where('entity_id', $entityId)
                ->whereDate('log_time', now()->toDateString())
                ->latest('log_time')
                ->value('direction');
            return (! $lastLog || $lastLog === 'out') ? 'in' : 'out';
        };

        // ── 1. Try student ────────────────────────────────────────────────
        $student = Student::where('student_id', $code)->first();

        if ($student) {
            $direction = $resolveDirection('student', $code);

            $log = AttendanceLog::create([
                'entity_type' => 'student',
                'entity_id'   => $code,
                'log_time'    => now(),
                'direction'   => $direction,
                'method'      => 'kiosk',
                'kiosk_code'  => $kioskCode,
            ]);

            // Notify parents after response is sent — keeps kiosk response instant
            $self = $this;
            defer(fn () => $self->notifyParents($student, $direction, $log->log_time));

            return response()->json([
                'type'        => 'student',
                'name'        => "{$student->fname} {$student->lname}",
                'detail'      => "{$student->gradeLevel}" . ($student->dept ? " — {$student->dept}" : ''),
                'student_id'  => $student->student_id,
                'photo'       => $student->img ?? null,
                'direction'   => $direction,
                'log_time'    => $log->log_time->format('h:i A'),
                'date'        => $log->log_time->format('F j, Y'),
            ]);
        }

        // ── 2. Try personnel (employee_id barcode OR 4-6 digit PIN) ─────────
        $personnel = HrmsPersonnel::with(['position:id,name', 'department:id,name'])
            ->where(function ($q) use ($code) {
                $q->where('employee_id', $code);
                if (is_numeric($code) && strlen($code) <= 6) {
                    $q->orWhere('pin_code', (int) $code);
                }
            })
            ->where('status', 'Active')
            ->first();

        if ($personnel) {
            $canonicalId = $personnel->employee_id;
            $direction   = $resolveDirection('personnel', $canonicalId);

            $log = AttendanceLog::create([
                'entity_type' => 'personnel',
                'entity_id'   => $canonicalId,
                'log_time'    => now(),
                'direction'   => $direction,
                'method'      => 'kiosk',
                'kiosk_code'  => $kioskCode,
            ]);

            return response()->json([
                'type'        => 'personnel',
                'name'        => $personnel->full_name,
                'detail'      => $personnel->position?->name ?? ($personnel->department?->name ?? ''),
                'employee_id' => $personnel->employee_id,
                'photo'       => $personnel->photo ?? null,
                'direction'   => $direction,
                'log_time'    => $log->log_time->format('h:i A'),
                'date'        => $log->log_time->format('F j, Y'),
            ]);
        }

        return response()->json(['message' => 'ID not recognized. Please see the registrar.'], 404);
    }

    /**
     * POST /kiosk/manual  — authenticated, for manual log entry
     */
    public function manual(Request $request): JsonResponse
    {
        $data = $request->validate([
            'entity_type' => 'required|in:student,personnel',
            'entity_id'   => 'required|string|max:50',
            'direction'   => 'required|in:in,out',
            'log_time'    => 'required|date_format:Y-m-d H:i:s',
            'notes'       => 'nullable|string|max:255',
        ]);

        $log = AttendanceLog::create(array_merge($data, ['method' => 'manual']));

        if ($data['entity_type'] === 'student') {
            $student = Student::where('student_id', $data['entity_id'])->first();
            if ($student) {
                $self = $this;
                defer(fn () => $self->notifyParents($student, $data['direction'], $log->log_time));
            }
        }

        return response()->json(['data' => $log]);
    }

    /**
     * Notify all parent-linked users about their child's attendance.
     */
    public function notifyParents(Student $student, string $direction, $logTime): void
    {
        try {
            $parents = User::where('access', 'Parent')
                ->whereExists(function ($q) use ($student) {
                    $q->from('parent_students')
                      ->whereColumn('parent_students.user_id', 'users.id')
                      ->where('parent_students.reg_id', $student->reg_id);
                })
                ->get();

            if ($parents->isEmpty()) {
                return;
            }

            $formattedTime = $logTime->format('h:i A');
            $formattedDate = $logTime->format('F j, Y');
            $studentName   = "{$student->fname} {$student->lname}";

            foreach ($parents as $parent) {
                $parent->notify(new StudentAttendanceLogged(
                    studentName: $studentName,
                    direction:   $direction,
                    logTime:     $formattedTime,
                    date:        $formattedDate,
                ));
            }
        } catch (\Throwable) {
            // Never block the kiosk response due to notification failures
        }
    }

    /**
     * GET /kiosk/recent-logs — public, returns last N logs with person info
     */
    public function recentLogs(Request $request): JsonResponse
    {
        $limit     = min((int) $request->query('limit', 5), 20);
        $kioskCode = $request->query('kiosk_code');

        $query = AttendanceLog::orderByDesc('log_time')->limit($limit);

        if ($kioskCode) {
            $query->where('kiosk_code', $kioskCode);
        }

        $logs = $query->get(['entity_type', 'entity_id', 'direction', 'log_time', 'kiosk_code']);

        $results = $logs->map(function ($log) {
            $name   = null;
            $detail = null;
            $photo  = null;

            if ($log->entity_type === 'student') {
                $s = Student::where('student_id', $log->entity_id)
                    ->first(['fname', 'lname', 'gradeLevel', 'dept', 'img']);
                if ($s) {
                    $name   = "{$s->fname} {$s->lname}";
                    $detail = $s->gradeLevel . ($s->dept ? " — {$s->dept}" : '');
                    $photo  = $s->img;
                }
            } else {
                $p = HrmsPersonnel::with('position:id,name')
                    ->where('employee_id', $log->entity_id)
                    ->first(['id', 'fname', 'lname', 'position_id', 'photo']);
                if ($p) {
                    $name   = $p->full_name;
                    $detail = $p->position?->name ?? '';
                    $photo  = $p->photo;
                }
            }

            return [
                'entity_type' => $log->entity_type,
                'entity_id'   => $log->entity_id,
                'name'        => $name ?? $log->entity_id,
                'detail'      => $detail ?? '',
                'photo'       => $photo,
                'direction'   => $log->direction,
                'log_time'    => $log->log_time->format('h:i A'),
                'date'        => $log->log_time->format('F j, Y'),
                'kiosk_code'  => $log->kiosk_code,
            ];
        });

        return response()->json($results);
    }

    /**
     * GET /kiosk/slides — public, returns active slides for the kiosk slideshow
     */
    public function publicSlides(): JsonResponse
    {
        $slides = KioskSlide::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn ($s) => [
                'id'        => $s->id,
                'title'     => $s->title,
                'subtitle'  => $s->subtitle,
                'bg_color'  => $s->bg_color,
                'image_url' => $s->image_path ? asset('storage/' . $s->image_path) : null,
            ]);

        return response()->json($slides);
    }
}
