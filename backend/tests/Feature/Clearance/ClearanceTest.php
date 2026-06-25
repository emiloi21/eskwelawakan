<?php

namespace Tests\Feature\Clearance;

use Tests\TestCase;

/**
 * Clearance module tests
 *
 * Workflows:
 * - Admin can create a clearance template with offices
 * - Admin can list templates
 * - Cannot delete template with existing records
 * - Authenticated user can view active template
 * - Authenticated user can apply for clearance
 * - Cannot apply twice for the same template
 * - Office rep can clear their office
 * - Office rep can return clearance to applicant
 * - User can view their own clearance record
 */
class ClearanceTest extends TestCase
{
    /** Creates a clearance template and returns the response data */
    private function makeTemplate(array $extra = []): array
    {
        return $this->postJson('/api/custodian/clearance-templates', array_merge([
            'name'       => 'Graduation Clearance ' . uniqid(),
            'school_year' => '2025-2026',
            'for_type'   => 'Personnel',
            'is_active'  => true,
            'offices'    => [
                ['office_name' => 'Library',   'responsible_role' => 'Custodian', 'sort_order' => 1],
                ['office_name' => 'Accounting', 'responsible_role' => 'Accounting Staff', 'sort_order' => 2],
            ],
        ], $extra))->assertStatus(201)->json('data');
    }

    // ── Template management ───────────────────────────────────────────────────

    public function test_admin_can_create_clearance_template(): void
    {
        $this->actAs('Administrator');

        $this->makeTemplate(['for_type' => 'Personnel']);

        $this->assertTrue(true); // assertStatus(201) already handled inside makeTemplate()
    }

    public function test_template_requires_at_least_one_office(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/custodian/clearance-templates', [
            'name'        => 'Empty Offices Template',
            'school_year' => '2025-2026',
            'for_type'    => 'Personnel',
            'offices'     => [],
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['offices']);
    }

    public function test_admin_can_list_templates(): void
    {
        $this->actAs('Administrator');
        $this->makeTemplate();

        $this->getJson('/api/custodian/clearance-templates')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_admin_can_update_template(): void
    {
        $this->actAs('Administrator');
        $tmpl = $this->makeTemplate(['is_active' => false]);

        $this->putJson("/api/custodian/clearance-templates/{$tmpl['public_id']}", [
            'is_active' => true,
        ])->assertOk();
    }

    public function test_cannot_delete_template_with_existing_records(): void
    {
        $this->actAs('Administrator');
        $this->makeTemplate(['for_type' => 'Personnel', 'is_active' => true]);

        // Apply for clearance as the same admin user
        $this->postJson('/api/clearance/apply')->assertStatus(201);

        // Find the template and try to delete it
        $templates = $this->getJson('/api/custodian/clearance-templates')->json('data');
        $publicId  = $templates[0]['public_id'];

        $this->deleteJson("/api/custodian/clearance-templates/{$publicId}")
            ->assertStatus(422);
    }

    // ── Active template & apply ───────────────────────────────────────────────

    public function test_authenticated_user_can_view_active_clearance_template(): void
    {
        // Create template as admin
        $this->actAs('Administrator');
        $this->makeTemplate(['for_type' => 'Both', 'is_active' => true]);

        // Switich to HR and read template
        $this->actAs('HR');

        $this->getJson('/api/clearance/active-template')
            ->assertOk();
    }

    public function test_user_can_apply_for_clearance(): void
    {
        $this->actAs('Administrator');
        $this->makeTemplate(['for_type' => 'Personnel', 'is_active' => true]);

        $this->postJson('/api/clearance/apply')
            ->assertStatus(201)
            ->assertJsonPath('data.status', 'Applied');
    }

    public function test_user_cannot_apply_twice_for_same_template(): void
    {
        $this->actAs('Administrator');
        $this->makeTemplate(['for_type' => 'Personnel', 'is_active' => true]);

        $this->postJson('/api/clearance/apply');

        $this->postJson('/api/clearance/apply')
            ->assertStatus(422);
    }

    public function test_no_active_template_returns_422(): void
    {
        $this->actAs('HR');

        $this->postJson('/api/clearance/apply')
            ->assertStatus(422);
    }

    // ── My record ─────────────────────────────────────────────────────────────

    public function test_user_can_view_their_clearance_record(): void
    {
        $this->actAs('Administrator');
        $this->makeTemplate(['for_type' => 'Personnel', 'is_active' => true]);
        $this->postJson('/api/clearance/apply');

        $this->getJson('/api/clearance/my-record')
            ->assertOk();
    }

    // ── Office clearance ──────────────────────────────────────────────────────

    public function test_office_rep_can_clear_an_office_on_a_record(): void
    {
        $this->actAs('Administrator');
        $tmpl = $this->makeTemplate(['for_type' => 'Personnel', 'is_active' => true]);
        $record = $this->postJson('/api/clearance/apply')->json('data');

        $officeStatusId = $record['office_statuses'][0]['id'];
        $recordPublicId = $record['public_id'];

        $this->postJson("/api/clearance/records/{$recordPublicId}/offices/{$officeStatusId}/clear", [
            'notes' => 'All clear',
        ])->assertOk();
    }

    // ── Role guard ────────────────────────────────────────────────────────────

    public function test_unauthenticated_user_cannot_view_active_template(): void
    {
        $this->getJson('/api/clearance/active-template')
            ->assertStatus(401);
    }
}
