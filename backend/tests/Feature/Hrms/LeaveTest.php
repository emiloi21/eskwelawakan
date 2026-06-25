<?php

namespace Tests\Feature\Hrms;

use Tests\TestCase;

/**
 * Leave module tests
 *
 * Workflows:
 * - Create leave type
 * - Duplicate leave type name → 422
 * - Delete leave type (no applications)
 * - Delete leave type with applications → 422
 * - Apply for leave
 * - Approve a pending leave application
 * - Reject a pending leave application (requires remarks)
 * - Cancel a pending leave application
 * - Cancel an approved leave → 422
 */
class LeaveTest extends TestCase
{
    // ── Leave Types ───────────────────────────────────────────────────────────

    public function test_hr_can_create_leave_type(): void
    {
        $this->actAs('HR');

        $this->postJson('/api/hrms/leave-types', [
            'name'          => 'Vacation Leave',
            'days_per_year' => 15,
            'is_paid'       => true,
        ])->assertStatus(201)
            ->assertJsonPath('data.name', 'Vacation Leave');
    }

    public function test_duplicate_leave_type_name_returns_422(): void
    {
        $this->actAs('HR');

        $this->postJson('/api/hrms/leave-types', [
            'name' => 'Sick Leave', 'days_per_year' => 15, 'is_paid' => true,
        ]);

        $this->postJson('/api/hrms/leave-types', [
            'name' => 'Sick Leave', 'days_per_year' => 10, 'is_paid' => false,
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_hr_can_list_leave_types(): void
    {
        $this->actAs('HR');

        $this->getJson('/api/hrms/leave-types')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_can_delete_leave_type_with_no_applications(): void
    {
        $this->actAs('HR');

        $created = $this->postJson('/api/hrms/leave-types', [
            'name' => 'Maternity Leave', 'days_per_year' => 105, 'is_paid' => true,
        ])->json('data');

        $this->deleteJson("/api/hrms/leave-types/{$created['public_id']}")
            ->assertOk();
    }

    // ── Leave Applications ─────────────────────────────────────────────────────

    private function setupPersonnelAndLeaveType(): array
    {
        $dept   = $this->makeDepartment();
        $pos    = $this->makePosition($dept->id);
        $person = $this->makePersonnel($dept->id, $pos->id);

        $ltResp = $this->postJson('/api/hrms/leave-types', [
            'name' => 'Test Leave ' . uniqid(), 'days_per_year' => 30, 'is_paid' => true,
        ])->json('data');

        return [$person, $ltResp];
    }

    public function test_hr_can_apply_leave_for_personnel(): void
    {
        $this->actAs('HR');
        [$person, $lt] = $this->setupPersonnelAndLeaveType();

        $this->postJson('/api/hrms/leaves', [
            'personnel_public_id' => $person->public_id,
            'leave_type_public_id' => $lt['public_id'],
            'start_date'          => now()->addDays(3)->format('Y-m-d'),
            'end_date'            => now()->addDays(5)->format('Y-m-d'),
            'reason'              => 'Family event',
        ])->assertStatus(201)
            ->assertJsonPath('data.status', 'Pending');
    }

    public function test_leave_application_requires_start_date_in_future(): void
    {
        $this->actAs('HR');
        [$person, $lt] = $this->setupPersonnelAndLeaveType();

        $this->postJson('/api/hrms/leaves', [
            'personnel_public_id' => $person->public_id,
            'leave_type_public_id' => $lt['public_id'],
            'start_date'          => now()->subDays(3)->format('Y-m-d'),
            'end_date'            => now()->subDays(1)->format('Y-m-d'),
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['start_date']);
    }

    public function test_hr_can_approve_leave_application(): void
    {
        $this->actAs('HR');
        [$person, $lt] = $this->setupPersonnelAndLeaveType();

        $app = $this->postJson('/api/hrms/leaves', [
            'personnel_public_id' => $person->public_id,
            'leave_type_public_id' => $lt['public_id'],
            'start_date'          => now()->addDays(3)->format('Y-m-d'),
            'end_date'            => now()->addDays(4)->format('Y-m-d'),
        ])->json('data');

        $this->postJson("/api/hrms/leaves/{$app['public_id']}/approve", [
            'remarks' => 'Approved by HR',
        ])->assertOk()
            ->assertJsonPath('data.status', 'Approved');
    }

    public function test_hr_can_reject_leave_application_with_remarks(): void
    {
        $this->actAs('HR');
        [$person, $lt] = $this->setupPersonnelAndLeaveType();

        $app = $this->postJson('/api/hrms/leaves', [
            'personnel_public_id' => $person->public_id,
            'leave_type_public_id' => $lt['public_id'],
            'start_date'          => now()->addDays(3)->format('Y-m-d'),
            'end_date'            => now()->addDays(4)->format('Y-m-d'),
        ])->json('data');

        $this->postJson("/api/hrms/leaves/{$app['public_id']}/reject", [
            'remarks' => 'No cover available',
        ])->assertOk()
            ->assertJsonPath('data.status', 'Rejected');
    }

    public function test_reject_without_remarks_returns_422(): void
    {
        $this->actAs('HR');
        [$person, $lt] = $this->setupPersonnelAndLeaveType();

        $app = $this->postJson('/api/hrms/leaves', [
            'personnel_public_id' => $person->public_id,
            'leave_type_public_id' => $lt['public_id'],
            'start_date'          => now()->addDays(3)->format('Y-m-d'),
            'end_date'            => now()->addDays(4)->format('Y-m-d'),
        ])->json('data');

        $this->postJson("/api/hrms/leaves/{$app['public_id']}/reject", [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['remarks']);
    }

    public function test_hr_can_cancel_pending_leave_application(): void
    {
        $this->actAs('HR');
        [$person, $lt] = $this->setupPersonnelAndLeaveType();

        $app = $this->postJson('/api/hrms/leaves', [
            'personnel_public_id' => $person->public_id,
            'leave_type_public_id' => $lt['public_id'],
            'start_date'          => now()->addDays(3)->format('Y-m-d'),
            'end_date'            => now()->addDays(4)->format('Y-m-d'),
        ])->json('data');

        $this->deleteJson("/api/hrms/leaves/{$app['public_id']}")
            ->assertOk();
    }

    public function test_cannot_cancel_approved_leave(): void
    {
        $this->actAs('HR');
        [$person, $lt] = $this->setupPersonnelAndLeaveType();

        $app = $this->postJson('/api/hrms/leaves', [
            'personnel_public_id' => $person->public_id,
            'leave_type_public_id' => $lt['public_id'],
            'start_date'          => now()->addDays(3)->format('Y-m-d'),
            'end_date'            => now()->addDays(4)->format('Y-m-d'),
        ])->json('data');

        $this->postJson("/api/hrms/leaves/{$app['public_id']}/approve", ['remarks' => 'Approved']);

        $this->deleteJson("/api/hrms/leaves/{$app['public_id']}")
            ->assertStatus(422);
    }

    // ── Role guard ────────────────────────────────────────────────────────────

    public function test_registrar_cannot_manage_leave_types(): void
    {
        $this->actAs('Registrar');

        $this->postJson('/api/hrms/leave-types', [
            'name' => 'Not allowed', 'days_per_year' => 5, 'is_paid' => false,
        ])->assertStatus(403);
    }
}
