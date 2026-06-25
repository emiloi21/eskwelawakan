<?php

namespace Tests\Feature\Library;

use App\Models\LibraryBook;
use App\Models\LibraryBorrowing;
use App\Models\LibraryCategory;
use Tests\TestCase;

/**
 * Library module tests
 *
 * Workflows:
 * - Admin/Librarian can manage categories (CRUD)
 * - Cannot delete category that has books
 * - Admin/Librarian can manage books (CRUD)
 * - Book requires category
 * - Librarian can borrow a book
 * - Cannot borrow if no available copies
 * - Librarian can return a book
 * - Cannot return already-returned book
 * - Overdue list marks overdue borrowings
 * - Non-authorized role is rejected
 */
class LibraryTest extends TestCase
{
    private function makeCategory(array $extra = []): array
    {
        return $this->postJson('/api/library/categories', array_merge([
            'name' => 'Fiction-' . uniqid(),
        ], $extra))->assertStatus(201)->json('data');
    }

    private function makeBook(int $categoryId, array $extra = []): array
    {
        return $this->postJson('/api/library/books', array_merge([
            'title'        => 'Test Book ' . uniqid(),
            'author'       => 'Jane Smith',
            'category_id'  => $categoryId,
            'total_copies' => 3,
        ], $extra))->assertStatus(201)->json('data');
    }

    // ── Categories ────────────────────────────────────────────────────────────

    public function test_librarian_can_list_categories(): void
    {
        $this->actAs('Librarian');
        $this->getJson('/api/library/categories')->assertOk()->assertJsonStructure(['data']);
    }

    public function test_librarian_can_create_category(): void
    {
        $this->actAs('Librarian');
        $category = $this->makeCategory(['name' => 'Science', 'description' => 'Science books']);
        $this->assertEquals('Science', $category['name']);
    }

    public function test_duplicate_category_name_is_rejected(): void
    {
        $this->actAs('Librarian');
        $this->makeCategory(['name' => 'UniqueCategory']);
        $this->postJson('/api/library/categories', ['name' => 'UniqueCategory'])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['name']);
    }

    public function test_librarian_can_update_category(): void
    {
        $this->actAs('Librarian');
        $cat = $this->makeCategory();
        $this->putJson("/api/library/categories/{$cat['public_id']}", ['description' => 'Updated'])
             ->assertOk();
    }

    public function test_cannot_delete_category_with_books(): void
    {
        $this->actAs('Librarian');
        $cat  = $this->makeCategory();
        $this->makeBook($cat['id']);

        $this->deleteJson("/api/library/categories/{$cat['public_id']}")->assertStatus(422);
    }

    public function test_can_delete_empty_category(): void
    {
        $this->actAs('Librarian');
        $cat = $this->makeCategory();
        $this->deleteJson("/api/library/categories/{$cat['public_id']}")->assertStatus(204);
    }

    // ── Books ─────────────────────────────────────────────────────────────────

    public function test_librarian_can_list_books(): void
    {
        $this->actAs('Librarian');
        $this->getJson('/api/library/books')->assertOk();
    }

    public function test_librarian_can_create_book(): void
    {
        $this->actAs('Librarian');
        $cat  = $this->makeCategory();
        $book = $this->makeBook($cat['id'], ['isbn' => '978-0-123456-78-9']);
        $this->assertEquals(3, $book['available_copies']);
        $this->assertEquals('Available', $book['status']);
    }

    public function test_book_requires_category(): void
    {
        $this->actAs('Librarian');
        $this->postJson('/api/library/books', [
            'title'        => 'No Category Book',
            'author'       => 'Someone',
            'category_id'  => 99999,
            'total_copies' => 1,
        ])->assertStatus(422)->assertJsonValidationErrors(['category_id']);
    }

    public function test_librarian_can_update_book(): void
    {
        $this->actAs('Librarian');
        $cat  = $this->makeCategory();
        $book = $this->makeBook($cat['id']);
        $this->putJson("/api/library/books/{$book['public_id']}", ['location' => 'Shelf A-1'])
             ->assertOk()
             ->assertJsonPath('data.location', 'Shelf A-1');
    }

    public function test_librarian_can_delete_book(): void
    {
        $this->actAs('Librarian');
        $cat  = $this->makeCategory();
        $book = $this->makeBook($cat['id']);
        $this->deleteJson("/api/library/books/{$book['public_id']}")->assertStatus(204);
    }

    // ── Borrowings ────────────────────────────────────────────────────────────

    public function test_librarian_can_borrow_a_book(): void
    {
        $this->actAs('Librarian');
        $cat  = $this->makeCategory();
        $book = $this->makeBook($cat['id'], ['total_copies' => 2]);

        $this->postJson('/api/library/borrowings', [
            'book_id'       => $book['id'],
            'borrower_type' => 'student',
            'borrower_name' => 'Juan Dela Cruz',
            'due_date'      => now()->addDays(14)->toDateString(),
        ])->assertStatus(201)
          ->assertJsonPath('data.status', 'Borrowed');
    }

    public function test_cannot_borrow_book_with_no_copies(): void
    {
        $this->actAs('Librarian');
        $cat  = $this->makeCategory();
        $book = $this->makeBook($cat['id'], ['total_copies' => 1]);

        // Borrow the only copy
        $this->postJson('/api/library/borrowings', [
            'book_id'       => $book['id'],
            'borrower_type' => 'student',
            'borrower_name' => 'First Borrower',
            'due_date'      => now()->addDays(14)->toDateString(),
        ])->assertStatus(201);

        // Try to borrow again
        $this->postJson('/api/library/borrowings', [
            'book_id'       => $book['id'],
            'borrower_type' => 'student',
            'borrower_name' => 'Second Borrower',
            'due_date'      => now()->addDays(14)->toDateString(),
        ])->assertStatus(422);
    }

    public function test_librarian_can_return_a_book(): void
    {
        $this->actAs('Librarian');
        $cat  = $this->makeCategory();
        $book = $this->makeBook($cat['id']);

        $borrowing = $this->postJson('/api/library/borrowings', [
            'book_id'       => $book['id'],
            'borrower_type' => 'student',
            'borrower_name' => 'Juan',
            'due_date'      => now()->addDays(7)->toDateString(),
        ])->assertStatus(201)->json('data');

        $this->postJson("/api/library/borrowings/{$borrowing['public_id']}/return")
             ->assertOk()
             ->assertJsonPath('data.status', 'Returned');
    }

    public function test_cannot_return_already_returned_book(): void
    {
        $this->actAs('Librarian');
        $cat      = $this->makeCategory();
        $book     = $this->makeBook($cat['id']);
        $borrowing = $this->postJson('/api/library/borrowings', [
            'book_id'       => $book['id'],
            'borrower_type' => 'student',
            'borrower_name' => 'Juan',
            'due_date'      => now()->addDays(7)->toDateString(),
        ])->json('data');

        $this->postJson("/api/library/borrowings/{$borrowing['public_id']}/return")->assertOk();
        $this->postJson("/api/library/borrowings/{$borrowing['public_id']}/return")->assertStatus(422);
    }

    public function test_overdue_list_is_accessible(): void
    {
        $this->actAs('Librarian');
        $this->getJson('/api/library/overdue')->assertOk()->assertJsonStructure(['data']);
    }

    public function test_non_authorized_role_is_rejected(): void
    {
        $this->actAs('Student');
        $this->getJson('/api/library/books')->assertStatus(403);
    }
}
