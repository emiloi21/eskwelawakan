<?php

namespace App\Http\Controllers\Registrar;

use App\Http\Controllers\Controller;
use App\Models\ClassModel;
use App\Models\Student;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ImportController extends Controller
{
    private const CSV_HEADERS = [
        'LRN', 'Student ID', 'Last Name', 'First Name', 'Middle Name', 'Suffix',
        'Sex', 'Department', 'Grade Level', 'Strand', 'Major', 'Section',
        'Classification', 'School Year', 'Semester', 'Status',
    ];

    private const VALID_SEX = ['Male', 'Female'];
    private const VALID_DEPTS = ['Preschool', 'Elementary', 'Junior High School', 'Senior High School'];
    private const VALID_STATUSES = [
        'For Advising', 'For Application Assessment', 'For Accounts Assessment',
        'For Payment', 'Enrolled', 'Withdrawn', 'Transferred Out', 'Dropped',
        'Completer/Graduate',
    ];

    /**
     * Download a CSV template with the correct headers.
     */
    public function template(): \Symfony\Component\HttpFoundation\StreamedResponse
    {
        return response()->streamDownload(function () {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, self::CSV_HEADERS);
            fclose($handle);
        }, 'student_import_template.csv', [
            'Content-Type' => 'text/csv',
        ]);
    }

    /**
     * Parse and validate uploaded CSV, return preview rows + error summary.
     */
    public function preview(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        $path = $request->file('file')->getRealPath();
        $handle = fopen($path, 'r');

        if (!$handle) {
            return response()->json(['message' => 'Unable to read file.'], 422);
        }

        // Skip header row
        $header = fgetcsv($handle);

        $rows = [];
        $errors = [];
        $lineNum = 1; // 1-based (header is line 1, data starts at 2)

        while (($data = fgetcsv($handle)) !== false) {
            $lineNum++;

            if (count($data) < 16) {
                $errors[] = ['line' => $lineNum, 'error' => 'Row has fewer than 16 columns.'];
                continue;
            }

            $row = [
                'lrn'            => strlen($data[0]) > 3 ? substr($data[0], 3) : $data[0],
                'student_id'     => trim($data[1]),
                'lname'          => strtoupper(trim($data[2])),
                'fname'          => strtoupper(trim($data[3])),
                'mname'          => strtoupper(trim($data[4])),
                'suffix'         => trim($data[5]) ?: '-',
                'sex'            => trim($data[6]),
                'dept'           => trim($data[7]),
                'gradeLevel'     => trim($data[8]),
                'strand'         => trim($data[9]) ?: 'N/A',
                'major'          => trim($data[10]) ?: 'N/A',
                'section'        => trim($data[11]),
                'classification' => trim($data[12]),
                'schoolYear'     => trim($data[13]),
                'sem'            => trim($data[14]) ?: '1st Semester',
                'status'         => trim($data[15]) ?: 'For Accounts Assessment',
            ];

            $rowErrors = $this->validateRow($row, $lineNum);
            if (count($rowErrors) > 0) {
                foreach ($rowErrors as $e) {
                    $errors[] = $e;
                }
                $row['_valid'] = false;
            } else {
                $row['_valid'] = true;
            }

            // Check if existing
            $existing = Student::where('student_id', $row['student_id'])
                ->where('lname', $row['lname'])
                ->where('fname', $row['fname'])
                ->where('mname', $row['mname'])
                ->first();

            $row['_action'] = $existing ? 'update' : 'insert';
            $row['_line'] = $lineNum;
            $rows[] = $row;
        }

        fclose($handle);

        $validCount = collect($rows)->where('_valid', true)->count();
        $insertCount = collect($rows)->where('_valid', true)->where('_action', 'insert')->count();
        $updateCount = collect($rows)->where('_valid', true)->where('_action', 'update')->count();

        return response()->json([
            'rows'   => $rows,
            'errors' => $errors,
            'summary' => [
                'total'   => count($rows),
                'valid'   => $validCount,
                'invalid' => count($rows) - $validCount,
                'inserts' => $insertCount,
                'updates' => $updateCount,
            ],
        ]);
    }

    /**
     * Execute the import — upsert valid rows inside a transaction.
     */
    public function import(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'mimes:csv,txt', 'max:5120'],
        ]);

        $path = $request->file('file')->getRealPath();
        $handle = fopen($path, 'r');

        if (!$handle) {
            return response()->json(['message' => 'Unable to read file.'], 422);
        }

        fgetcsv($handle); // skip header

        $inserted = 0;
        $updated = 0;
        $skipped = 0;

        DB::transaction(function () use ($handle, &$inserted, &$updated, &$skipped) {
            while (($data = fgetcsv($handle)) !== false) {
                if (count($data) < 16) {
                    $skipped++;
                    continue;
                }

                $row = [
                    'lrn'            => strlen($data[0]) > 3 ? substr($data[0], 3) : $data[0],
                    'student_id'     => trim($data[1]),
                    'lname'          => strtoupper(trim($data[2])),
                    'fname'          => strtoupper(trim($data[3])),
                    'mname'          => strtoupper(trim($data[4])),
                    'suffix'         => trim($data[5]) ?: '-',
                    'sex'            => trim($data[6]),
                    'dept'           => trim($data[7]),
                    'gradeLevel'     => trim($data[8]),
                    'strand'         => trim($data[9]) ?: 'N/A',
                    'major'          => trim($data[10]) ?: 'N/A',
                    'section'        => trim($data[11]),
                    'classification' => trim($data[12]),
                    'schoolYear'     => trim($data[13]),
                    'sem'            => trim($data[14]) ?: '1st Semester',
                    'status'         => trim($data[15]) ?: 'For Accounts Assessment',
                ];

                // Validate basics
                if (empty($row['student_id']) || empty($row['lname']) || empty($row['fname'])) {
                    $skipped++;
                    continue;
                }

                if (!in_array($row['sex'], self::VALID_SEX)) {
                    $skipped++;
                    continue;
                }

                // Resolve class_id from section
                $classId = $this->resolveClassId($row);

                // Upsert
                $existing = Student::where('student_id', $row['student_id'])
                    ->where('lname', $row['lname'])
                    ->where('fname', $row['fname'])
                    ->where('mname', $row['mname'])
                    ->first();

                if ($existing) {
                    $existing->update([
                        'lrn'            => $row['lrn'],
                        'suffix'         => $row['suffix'],
                        'sex'            => $row['sex'],
                        'class_id'       => $classId,
                        'dept'           => $row['dept'],
                        'gradeLevel'     => $row['gradeLevel'],
                        'strand'         => $row['strand'],
                        'major'          => $row['major'],
                        'section'        => $row['section'],
                        'classification' => $row['classification'],
                        'schoolYear'     => $row['schoolYear'],
                        'sem'            => $row['sem'],
                        'status'         => $row['status'],
                    ]);
                    $updated++;
                } else {
                    Student::create([
                        'lrn'            => $row['lrn'],
                        'student_id'     => $row['student_id'],
                        'lname'          => $row['lname'],
                        'fname'          => $row['fname'],
                        'mname'          => $row['mname'],
                        'suffix'         => $row['suffix'],
                        'sex'            => $row['sex'],
                        'class_id'       => $classId,
                        'dept'           => $row['dept'],
                        'gradeLevel'     => $row['gradeLevel'],
                        'strand'         => $row['strand'],
                        'major'          => $row['major'],
                        'section'        => $row['section'],
                        'classification' => $row['classification'],
                        'schoolYear'     => $row['schoolYear'],
                        'sem'            => $row['sem'],
                        'status'         => $row['status'],
                        'bdMM'           => '01',
                        'bdDD'           => '01',
                        'bdYYYY'         => '2000',
                        'guardian_contact' => '-',
                        'guardian_relation' => '-',
                        'last_school'    => '-',
                        'last_school_sy' => '-',
                        'last_school_type' => '-',
                        'appDate'        => now()->format('m/d/Y'),
                        'appTime'        => now()->format('h:i A'),
                    ]);
                    $inserted++;
                }
            }
        });

        fclose($handle);

        return response()->json([
            'message'  => "Import complete. Inserted: {$inserted}, Updated: {$updated}, Skipped: {$skipped}.",
            'inserted' => $inserted,
            'updated'  => $updated,
            'skipped'  => $skipped,
        ]);
    }

    private function resolveClassId(array $row): int
    {
        if (empty($row['section']) || $row['section'] === '-') {
            return 0;
        }

        $class = ClassModel::where('gradeLevel', $row['gradeLevel'])
            ->where('strand', $row['strand'])
            ->where('major', $row['major'])
            ->where('section', $row['section'])
            ->where('schoolYear', $row['schoolYear'])
            ->first();

        return $class ? $class->class_id : 0;
    }

    private function validateRow(array $row, int $line): array
    {
        $errors = [];

        if (empty($row['student_id'])) {
            $errors[] = ['line' => $line, 'error' => 'Student ID is required.'];
        }
        if (empty($row['lname'])) {
            $errors[] = ['line' => $line, 'error' => 'Last name is required.'];
        }
        if (empty($row['fname'])) {
            $errors[] = ['line' => $line, 'error' => 'First name is required.'];
        }
        if (!in_array($row['sex'], self::VALID_SEX)) {
            $errors[] = ['line' => $line, 'error' => "Invalid sex value: \"{$row['sex']}\"."];
        }
        if (!empty($row['dept']) && !in_array($row['dept'], self::VALID_DEPTS)) {
            $errors[] = ['line' => $line, 'error' => "Invalid department: \"{$row['dept']}\"."];
        }
        if (!empty($row['status']) && !in_array($row['status'], self::VALID_STATUSES)) {
            $errors[] = ['line' => $line, 'error' => "Invalid status: \"{$row['status']}\"."];
        }

        return $errors;
    }
}
