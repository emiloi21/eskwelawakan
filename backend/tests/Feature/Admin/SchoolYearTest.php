<?php

namespace Tests\Feature\Admin;

use Tests\TestCase;

/**
 * School Year management tests
 *
 * Workflows:
 * - List school years
 * - Create new school year
 * - Show single school year
 * - Update school year
 * - Activate a school year (sets others to inactive)
 * - Duplicate school_year value → 422
 * - Non-admin cannot manage school years
 */
class SchoolYearTest extends TestCase
{
    // ── List ──────────────────────────────────────────────────────────────────

    public function test_admin_can_list_school_years(): void
    {
        $this->actAs('Administrator');
        $this->makeSchoolYear(['school_year' => '2024-2025']);
        $this->makeSchoolYear(['school_year' => '2025-2026']);

        $this->getJson('/api/admin/school-years')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public function test_admin_can_create_school_year(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/admin/school-years', [
            'school_year'  => '2026-2027',
            'status'       => 'Inactive',
            'fy_start_date' => '2026-06-01',
            'fy_end_date'   => '2027-03-31',
        ])->assertStatus(201)
            ->assertJsonPath('data.school_year', '2026-2027');
    }

    public function test_duplicate_school_year_returns_422(): void
    {
        $this->actAs('Administrator');
        $this->makeSchoolYear(['school_year' => '2025-2026']);

        $this->postJson('/api/admin/school-years', [
            'school_year'  => '2025-2026',
            'status'       => 'Inactive',
            'fy_start_date' => '2025-06-01',
            'fy_end_date'   => '2026-03-31',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['school_year']);
    }

    public function test_create_school_year_requires_fields(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/admin/school-years', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['school_year']);
    }

    // ── Show ──────────────────────────────────────────────────────────────────

    public function test_admin_can_show_school_year(): void
    {
        $this->actAs('Administrator');
        $sy = $this->makeSchoolYear(['school_year' => '2025-2026']);

        $this->getJson("/api/admin/school-years/{$sy->public_id}")
            ->assertOk()
            ->assertJsonPath('data.school_year', '2025-2026');
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public function test_admin_can_update_school_year(): void
    {
        $this->actAs('Administrator');
        $sy = $this->makeSchoolYear(['school_year' => '2025-2026', 'status' => 'Inactive']);

        $this->putJson("/api/admin/school-years/{$sy->public_id}", [
            'school_year'   => '2025-2026',
            'fy_start_date' => '2025-06-15',
            'fy_end_date'   => '2026-03-31',
        ])->assertOk()
            ->assertJsonPath('data.school_year', '2025-2026');
    }

    // ── Activate ──────────────────────────────────────────────────────────────

    public function test_activating_school_year_deactivates_others(): void
    {
        $this->actAs('Administrator');
        $sy1 = $this->makeSchoolYear(['school_year' => '2024-2025', 'status' => 'Active']);
        $sy2 = $this->makeSchoolYear(['school_year' => '2025-2026', 'status' => 'Inactive']);

        $this->postJson("/api/admin/school-years/{$sy2->public_id}/activate", [
            'semester' => '1st Semester',
        ])->assertOk();

        $this->getJson("/api/admin/school-years/{$sy1->public_id}")
            ->assertJsonPath('data.status', 'Inactive');
    }

    // ── Auth / role guards ────────────────────────────────────────────────────

    public function test_non_admin_cannot_create_school_year(): void
    {
        $this->actAs('HR');

        $this->postJson('/api/admin/school-years', [
            'school_year'  => '2026-2027',
            'status'       => 'Inactive',
            'fy_start_date' => '2026-06-01',
            'fy_end_date'   => '2027-03-31',
        ])->assertStatus(403);
    }

    public function test_unauthenticated_request_is_rejected(): void
    {
        $this->getJson('/api/admin/school-years')
            ->assertStatus(401);
    }
}
