<?php

namespace App\Http\Controllers\Library;

use App\Http\Controllers\Controller;
use App\Models\LibraryBook;
use App\Models\LibraryBorrowing;
use App\Models\LibraryCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class LibraryController extends Controller
{
    // ── Categories ────────────────────────────────────────────────────────────

    public function categories(): JsonResponse
    {
        return response()->json(['data' => LibraryCategory::withCount('books')->orderBy('name')->get()]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100|unique:library_categories,name',
            'description' => 'nullable|string|max:500',
        ]);
        return response()->json(['data' => LibraryCategory::create($data)], 201);
    }

    public function updateCategory(Request $request, string $publicId): JsonResponse
    {
        $category = LibraryCategory::findByPublicIdOrFail($publicId);
        $data = $request->validate([
            'name'        => 'sometimes|string|max:100|unique:library_categories,name,' . $category->id,
            'description' => 'nullable|string|max:500',
        ]);
        $category->update($data);
        return response()->json(['data' => $category]);
    }

    public function destroyCategory(string $publicId): JsonResponse
    {
        $category = LibraryCategory::findByPublicIdOrFail($publicId);
        if ($category->books()->exists()) {
            return response()->json(['message' => 'Category has books. Cannot delete.'], 422);
        }
        $category->delete();
        return response()->json(null, 204);
    }

    // ── Books ─────────────────────────────────────────────────────────────────

    public function books(Request $request): JsonResponse
    {
        $q = LibraryBook::with('category');

        if ($search = $request->query('search')) {
            $q->where(function ($query) use ($search) {
                $query->where('title', 'like', "%{$search}%")
                      ->orWhere('author', 'like', "%{$search}%")
                      ->orWhere('isbn', 'like', "%{$search}%");
            });
        }
        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        if ($categoryId = $request->query('category_id')) {
            $q->where('category_id', $categoryId);
        }

        $books = $q->orderBy('title')->paginate(20);
        return response()->json($books);
    }

    public function showBook(string $publicId): JsonResponse
    {
        $book = LibraryBook::with('category')->findByPublicIdOrFail($publicId);
        return response()->json(['data' => $book]);
    }

    public function storeBook(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'           => 'required|string|max:255',
            'author'          => 'required|string|max:255',
            'isbn'            => 'nullable|string|max:20',
            'publisher'       => 'nullable|string|max:150',
            'year_published'  => 'nullable|string|max:4',
            'edition'         => 'nullable|string|max:50',
            'category_id'     => 'required|exists:library_categories,id',
            'total_copies'    => 'required|integer|min:1',
            'location'        => 'nullable|string|max:100',
            'call_number'     => 'nullable|string|max:50',
            'description'     => 'nullable|string',
            'status'          => 'nullable|in:Available,Out of Stock,Removed',
        ]);
        $data['available_copies'] = $data['total_copies'];
        $data['status'] = $data['status'] ?? 'Available';

        return response()->json(['data' => LibraryBook::create($data)], 201);
    }

    public function updateBook(Request $request, string $publicId): JsonResponse
    {
        $book = LibraryBook::findByPublicIdOrFail($publicId);
        $data = $request->validate([
            'title'          => 'sometimes|string|max:255',
            'author'         => 'sometimes|string|max:255',
            'isbn'           => 'nullable|string|max:20',
            'publisher'      => 'nullable|string|max:150',
            'year_published' => 'nullable|string|max:4',
            'edition'        => 'nullable|string|max:50',
            'category_id'    => 'sometimes|exists:library_categories,id',
            'total_copies'   => 'sometimes|integer|min:0',
            'location'       => 'nullable|string|max:100',
            'call_number'    => 'nullable|string|max:50',
            'description'    => 'nullable|string',
            'status'         => 'sometimes|in:Available,Out of Stock,Removed',
        ]);
        $book->update($data);
        return response()->json(['data' => $book]);
    }

    public function destroyBook(string $publicId): JsonResponse
    {
        $book = LibraryBook::findByPublicIdOrFail($publicId);
        $book->delete();
        return response()->json(null, 204);
    }

    // ── Borrowings ────────────────────────────────────────────────────────────

    public function borrowings(Request $request): JsonResponse
    {
        $q = LibraryBorrowing::with(['book:id,public_id,title,isbn'])->latest();

        if ($status = $request->query('status')) {
            $q->where('status', $status);
        }
        if ($bookId = $request->query('book_id')) {
            $q->where('book_id', $bookId);
        }

        return response()->json($q->paginate(20));
    }

    public function borrow(Request $request): JsonResponse
    {
        $data = $request->validate([
            'book_id'        => 'required|exists:library_books,id',
            'borrower_type'  => 'required|in:student,personnel,teacher',
            'borrower_ref'   => 'nullable|string|max:50',
            'borrower_name'  => 'required|string|max:150',
            'due_date'       => 'required|date|after:today',
            'notes'          => 'nullable|string',
        ]);

        $book = LibraryBook::findOrFail($data['book_id']);
        if ($book->available_copies < 1) {
            return response()->json(['message' => 'No available copies for this book.'], 422);
        }

        $data['borrow_date'] = today()->toDateString();
        $data['status']      = 'Borrowed';
        $data['issued_by']   = $request->user()->id;

        $borrowing = LibraryBorrowing::create($data);
        $book->decrement('available_copies');
        if ($book->available_copies <= 0) {
            $book->update(['status' => 'Out of Stock']);
        }

        return response()->json(['data' => $borrowing], 201);
    }

    public function returnBook(Request $request, string $publicId): JsonResponse
    {
        $borrowing = LibraryBorrowing::findByPublicIdOrFail($publicId);

        if ($borrowing->status === 'Returned') {
            return response()->json(['message' => 'Book already returned.'], 422);
        }

        $returnDate = today();
        $fine       = 0;
        if ($returnDate->isAfter($borrowing->due_date)) {
            $daysLate = $returnDate->diffInDays($borrowing->due_date);
            $fine     = $daysLate * ($request->input('fine_per_day', 5));
        }

        $borrowing->update([
            'returned_date' => $returnDate->toDateString(),
            'fine_amount'   => $fine,
            'status'        => $returnDate->isAfter($borrowing->due_date) ? 'Returned' : 'Returned',
            'received_by'   => $request->user()->id,
            'notes'         => $request->input('notes', $borrowing->notes),
        ]);

        $book = $borrowing->book;
        $book->increment('available_copies');
        if ($book->status !== 'Removed') {
            $book->update(['status' => 'Available']);
        }

        return response()->json(['data' => $borrowing]);
    }

    public function overdueList(): JsonResponse
    {
        $overdue = LibraryBorrowing::with(['book:id,public_id,title'])
            ->where('status', 'Borrowed')
            ->whereDate('due_date', '<', today())
            ->get();

        // Mark them as overdue
        $overdue->each(fn($b) => $b->update(['status' => 'Overdue']));

        return response()->json(['data' => $overdue]);
    }
}
