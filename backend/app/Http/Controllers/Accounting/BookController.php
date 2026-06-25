<?php

namespace App\Http\Controllers\Accounting;

use App\Http\Controllers\Controller;
use App\Models\Book;
use App\Models\BookAssigned;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Book::where('is_deleted', false);

        if ($grade = $request->query('gradeLevel')) {
            $query->where('gradeLevel', $grade);
        }
        if ($sy = $request->query('schoolYear')) {
            $query->where('schoolYear', $sy);
        }

        $books = $query->orderBy('gradeLevel')
            ->orderBy('book_title')
            ->paginate($request->query('per_page', 50));

        return response()->json($books);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'book_title' => ['required', 'string', 'max:255'],
            'book_amt'   => ['required', 'numeric', 'min:0'],
            'gradeLevel' => ['required', 'string', 'max:20'],
            'strand'     => ['nullable', 'string', 'max:55'],
            'schoolYear' => ['required', 'string', 'max:9'],
            'status'     => ['nullable', 'string', 'max:20'],
        ]);

        $validated['strand'] = $validated['strand'] ?? 'N/A';
        $validated['status'] = $validated['status'] ?? 'Active';
        $validated['is_deleted'] = false;

        $book = Book::create($validated);

        return response()->json(['data' => $book], 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $book = Book::where('is_deleted', false)->where('public_id', $id)->firstOrFail();

        $validated = $request->validate([
            'book_title' => ['sometimes', 'string', 'max:255'],
            'book_amt'   => ['sometimes', 'numeric', 'min:0'],
            'gradeLevel' => ['sometimes', 'string', 'max:20'],
            'strand'     => ['nullable', 'string', 'max:55'],
            'schoolYear' => ['sometimes', 'string', 'max:9'],
            'status'     => ['nullable', 'string', 'max:20'],
        ]);

        $book->update($validated);

        return response()->json(['data' => $book->fresh()]);
    }

    public function destroy(string $id): JsonResponse
    {
        $book = Book::findByPublicIdOrFail($id);
        $book->update(['is_deleted' => true]);

        return response()->json(['message' => 'Book deleted.']);
    }

    /**
     * Assign a book to a student.
     */
    public function assignToStudent(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'reg_id'  => ['required', 'string', 'exists:students,public_id'],
            'book_id' => ['required', 'string', 'exists:books,public_id'],
        ]);

        $student = \App\Models\Student::findByPublicIdOrFail($validated['reg_id']);
        $book = Book::where('is_deleted', false)->where('public_id', $validated['book_id'])->firstOrFail();

        $existing = BookAssigned::where('reg_id', $student->reg_id)
            ->where('book_id', $book->book_id)
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Book already assigned to this student.'], 422);
        }

        $assignment = BookAssigned::create([
            'reg_id'       => $student->reg_id,
            'particular_id' => 0,
            'book_id'      => $book->book_id,
            'book_amt'     => $book->book_amt,
        ]);

        return response()->json(['data' => $assignment->load('book')], 201);
    }

    /**
     * List books assigned to a student.
     */
    public function studentBooks(string $regId): JsonResponse
    {
        $student = \App\Models\Student::findByPublicIdOrFail($regId);

        $assignments = BookAssigned::with('book:book_id,book_title,book_amt,gradeLevel')
            ->where('reg_id', $student->reg_id)
            ->get();

        return response()->json(['data' => $assignments]);
    }

    /**
     * Remove a book assignment.
     */
    public function removeAssignment(string $id): JsonResponse
    {
        $assignment = BookAssigned::findByPublicIdOrFail($id);
        $assignment->delete();

        return response()->json(['message' => 'Book assignment removed.']);
    }
}
