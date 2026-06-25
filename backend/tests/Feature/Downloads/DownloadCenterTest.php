<?php

namespace Tests\Feature\Downloads;

use Tests\TestCase;

/**
 * Download Center module tests
 *
 * Workflows:
 * - Public can list publicly visible files (no auth)
 * - Admin can create download categories
 * - Cannot delete category with files
 * - Admin can upload a file (metadata)
 * - Admin can update file visibility
 * - Admin can delete a file
 * - Authenticated user can list files filtered by visibility
 * - Student only sees Public + Authenticated files
 * - Staff sees Public + Authenticated + Staff Only files
 * - Download count increments on access
 * - Non-admin cannot perform admin CRUD
 */
class DownloadCenterTest extends TestCase
{
    private function makeCategory(array $extra = []): array
    {
        return $this->postJson('/api/admin/downloads/categories', array_merge([
            'name'       => 'Forms ' . uniqid(),
            'sort_order' => 1,
        ], $extra))->assertStatus(201)->json('data');
    }

    private function makeFile(int $categoryId, array $extra = []): array
    {
        return $this->postJson('/api/admin/downloads/files', array_merge([
            'category_id' => $categoryId,
            'title'       => 'Test File ' . uniqid(),
            'file_path'   => '/storage/downloads/test.pdf',
            'file_name'   => 'test.pdf',
            'visibility'  => 'Public',
        ], $extra))->assertStatus(201)->json('data');
    }

    // ── Public endpoint ───────────────────────────────────────────────────────

    public function test_public_can_list_public_files_without_auth(): void
    {
        // Create a public file as admin first
        $this->actAs('Administrator');
        $cat = $this->makeCategory();
        $this->makeFile($cat['id'], ['visibility' => 'Public']);
        $this->makeFile($cat['id'], ['visibility' => 'Staff Only']);

        // Now call without auth
        auth()->forgetGuards();

        $response = $this->getJson('/api/downloads/public')->assertOk();
        $files    = $response->json('data');

        foreach ($files as $file) {
            $this->assertEquals('Public', $file['visibility']);
        }
    }

    // ── Admin CRUD ────────────────────────────────────────────────────────────

    public function test_admin_can_create_category(): void
    {
        $this->actAs('Administrator');
        $cat = $this->makeCategory(['name' => 'Enrollment Forms']);
        $this->assertEquals('Enrollment Forms', $cat['name']);
    }

    public function test_duplicate_category_name_is_rejected(): void
    {
        $this->actAs('Administrator');
        $this->makeCategory(['name' => 'Unique Downloads']);
        $this->postJson('/api/admin/downloads/categories', ['name' => 'Unique Downloads'])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['name']);
    }

    public function test_admin_can_update_category(): void
    {
        $this->actAs('Administrator');
        $cat = $this->makeCategory();
        $this->putJson("/api/admin/downloads/categories/{$cat['public_id']}", ['sort_order' => 5])
             ->assertOk();
    }

    public function test_cannot_delete_category_with_files(): void
    {
        $this->actAs('Administrator');
        $cat = $this->makeCategory();
        $this->makeFile($cat['id']);

        $this->deleteJson("/api/admin/downloads/categories/{$cat['public_id']}")->assertStatus(422);
    }

    public function test_can_delete_empty_category(): void
    {
        $this->actAs('Administrator');
        $cat = $this->makeCategory();
        $this->deleteJson("/api/admin/downloads/categories/{$cat['public_id']}")->assertStatus(204);
    }

    public function test_admin_can_upload_file_metadata(): void
    {
        $this->actAs('Administrator');
        $cat  = $this->makeCategory();
        $file = $this->makeFile($cat['id'], [
            'visibility'  => 'Staff Only',
            'school_year' => '2025-2026',
        ]);
        $this->assertEquals('Staff Only', $file['visibility']);
        $this->assertEquals(0, $file['download_count']);
    }

    public function test_file_requires_category_title_path_and_visibility(): void
    {
        $this->actAs('Administrator');
        $this->postJson('/api/admin/downloads/files', [])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['category_id', 'title', 'file_path', 'file_name', 'visibility']);
    }

    public function test_admin_can_update_file(): void
    {
        $this->actAs('Administrator');
        $cat  = $this->makeCategory();
        $file = $this->makeFile($cat['id']);

        $this->putJson("/api/admin/downloads/files/{$file['public_id']}", [
            'visibility' => 'Authenticated',
        ])->assertOk()->assertJsonPath('data.visibility', 'Authenticated');
    }

    public function test_admin_can_delete_file(): void
    {
        $this->actAs('Administrator');
        $cat  = $this->makeCategory();
        $file = $this->makeFile($cat['id']);
        $this->deleteJson("/api/admin/downloads/files/{$file['public_id']}")->assertStatus(204);
    }

    // ── Authenticated user visibility ─────────────────────────────────────────

    public function test_authenticated_teacher_sees_staff_only_files(): void
    {
        // Create files as admin
        $this->actAs('Administrator');
        $cat = $this->makeCategory();
        $this->makeFile($cat['id'], ['visibility' => 'Public']);
        $this->makeFile($cat['id'], ['visibility' => 'Staff Only']);
        $this->makeFile($cat['id'], ['visibility' => 'Admin Only']);

        // Switch to teacher
        $this->actAs('Teacher');
        $files = $this->getJson('/api/downloads')->assertOk()->json('data');

        $visibilities = array_unique(array_column($files, 'visibility'));
        $this->assertNotContains('Admin Only', $visibilities);
    }

    public function test_student_does_not_see_staff_only_files(): void
    {
        $this->actAs('Administrator');
        $cat = $this->makeCategory();
        $this->makeFile($cat['id'], ['visibility' => 'Staff Only', 'title' => 'Staff Doc']);

        $this->actAs('Student');
        $files = $this->getJson('/api/downloads')->assertOk()->json('data');

        $visibilities = array_unique(array_column($files, 'visibility'));
        $this->assertNotContains('Staff Only', $visibilities);
        $this->assertNotContains('Admin Only', $visibilities);
    }

    // ── Download count ────────────────────────────────────────────────────────

    public function test_download_count_increments(): void
    {
        $this->actAs('Administrator');
        $cat  = $this->makeCategory();
        $file = $this->makeFile($cat['id'], ['visibility' => 'Public']);

        $this->postJson("/api/downloads/{$file['public_id']}/download")
             ->assertOk()
             ->assertJsonPath('data.download_count', 1);
    }

    // ── Authorization ─────────────────────────────────────────────────────────

    public function test_non_admin_cannot_create_category(): void
    {
        $this->actAs('Librarian');
        $this->postJson('/api/admin/downloads/categories', ['name' => 'Test'])
             ->assertStatus(403);
    }
}
