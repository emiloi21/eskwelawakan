<?php

namespace Tests\Feature\Hrms;

use Tests\TestCase;

/**
 * HRMS Personnel module tests
 *
 * Workflows:
 * - CRUD departments
 * - CRUD positions linked to departments
 * - Create personnel
 * - Duplicate employee_id → 422
 * - Update personnel info
 * - Assign department to personnel
 * - Non-HR role is rejected
 */
class PersonnelTest extends TestCase
{
    // ── Departments ───────────────────────────────────────────────────────────

    public function test_hr_can_list_departments(): void
    {
        $this->actAs('HR');
        $this->makeDepartment();

        $this->getJson('/api/hrms/departments')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_hr_can_create_department(): void
    {
        $this->actAs('HR');

        $this->postJson('/api/hrms/departments', ['name' => 'Science Department'])
            ->assertStatus(201)
            ->assertJsonPath('data.name', 'Science Department');
    }

    public function test_duplicate_department_name_returns_422(): void
    {
        $this->actAs('HR');
        $this->makeDepartment(['name' => 'Duplicate Dept']);

        $this->postJson('/api/hrms/departments', ['name' => 'Duplicate Dept'])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_hr_can_update_department(): void
    {
        $this->actAs('HR');
        $dept = $this->makeDepartment();

        $this->putJson("/api/hrms/departments/{$dept->public_id}", [
            'name' => 'Renamed Department',
        ])->assertOk()
            ->assertJsonPath('data.name', 'Renamed Department');
    }

    public function test_cannot_delete_department_with_active_personnel(): void
    {
        $this->actAs('HR');
        $dept = $this->makeDepartment();
        $pos  = $this->makePosition($dept->id);
        $this->makePersonnel($dept->id, $pos->id);

        $this->deleteJson("/api/hrms/departments/{$dept->public_id}")
            ->assertStatus(422);
    }

    // ── Positions ─────────────────────────────────────────────────────────────

    public function test_hr_can_create_position(): void
    {
        $this->actAs('HR');
        $dept = $this->makeDepartment();

        $this->postJson('/api/hrms/positions', [
            'name'          => 'Subject Teacher',
            'department_id' => $dept->id,
        ])->assertStatus(201)
            ->assertJsonPath('data.name', 'Subject Teacher');
    }

    public function test_hr_can_list_positions(): void
    {
        $this->actAs('HR');

        $this->getJson('/api/hrms/positions')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_hr_can_update_position(): void
    {
        $this->actAs('HR');
        $dept = $this->makeDepartment();
        $pos  = $this->makePosition($dept->id);

        $this->putJson("/api/hrms/positions/{$pos->public_id}", [
            'name'          => 'Senior Teacher',
            'department_id' => $dept->id,
        ])->assertOk()
            ->assertJsonPath('data.name', 'Senior Teacher');
    }

    // ── Personnel ─────────────────────────────────────────────────────────────

    public function test_hr_can_create_personnel(): void
    {
        $this->actAs('HR');
        $dept = $this->makeDepartment();
        $pos  = $this->makePosition($dept->id);

        $this->postJson('/api/hrms/personnel', [
            'employee_id'     => 'EMP-T-10001',
            'fname'           => 'Maria',
            'lname'           => 'Santos',
            'department_id'   => $dept->id,
            'position_id'     => $pos->id,
            'employment_type' => 'Regular',
            'status'          => 'Active',
        ])->assertStatus(201)
            ->assertJsonPath('data.employee_id', 'EMP-T-10001');
    }

    public function test_duplicate_employee_id_returns_422(): void
    {
        $this->actAs('HR');
        $dept = $this->makeDepartment();
        $pos  = $this->makePosition($dept->id);
        $this->makePersonnel($dept->id, $pos->id, ['employee_id' => 'EMP-DUP-01']);

        $this->postJson('/api/hrms/personnel', [
            'employee_id'     => 'EMP-DUP-01',
            'fname'           => 'Another',
            'lname'           => 'Person',
            'employment_type' => 'Regular',
            'status'          => 'Active',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['employee_id']);
    }

    public function test_hr_can_update_personnel(): void
    {
        $this->actAs('HR');
        $dept = $this->makeDepartment();
        $pos  = $this->makePosition($dept->id);
        $person = $this->makePersonnel($dept->id, $pos->id);

        $this->putJson("/api/hrms/personnel/{$person->public_id}", [
            'employee_id'     => $person->employee_id,
            'fname'           => 'UpdatedFirst',
            'lname'           => 'UpdatedLast',
            'employment_type' => 'Contractual',
            'status'          => 'Active',
        ])->assertOk()
            ->assertJsonPath('data.fname', 'UpdatedFirst');
    }

    public function test_hr_can_assign_department_to_personnel(): void
    {
        $this->actAs('HR');
        $dept1  = $this->makeDepartment();
        $dept2  = $this->makeDepartment();
        $pos    = $this->makePosition($dept1->id);
        $person = $this->makePersonnel($dept1->id, $pos->id);

        $this->patchJson("/api/hrms/personnel/{$person->public_id}/department", [
            'department_id' => $dept2->id,
        ])->assertOk()
            ->assertJsonPath('data.department.id', $dept2->id);
    }

    // ── Role guard ────────────────────────────────────────────────────────────

    public function test_cashier_cannot_create_personnel(): void
    {
        $this->actAs('Cashier');

        $this->postJson('/api/hrms/personnel', [
            'employee_id'     => 'EMP-FAIL',
            'fname'           => 'X',
            'lname'           => 'Y',
            'employment_type' => 'Regular',
            'status'          => 'Active',
        ])->assertStatus(403);
    }
}
