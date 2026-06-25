<?php

namespace Tests\Feature\Kiosk;

use App\Models\AttendanceLog;
use Tests\TestCase;

/**
 * Kiosk scan tests (public endpoint — no auth required)
 *
 * Workflows:
 * - Scan by employee_id → direction: in
 * - Scan same employee_id again same day → direction: out (toggle)
 * - Scan by PIN code → recognized as personnel
 * - Scan unknown code → 404
 * - Manual log by authenticated user
 */
class KioskScanTest extends TestCase
{
    // ── Scan by employee_id ───────────────────────────────────────────────────

    public function test_scanning_employee_id_returns_in_on_first_scan(): void
    {
        $dept   = $this->makeDepartment();
        $pos    = $this->makePosition($dept->id);
        $person = $this->makePersonnel($dept->id, $pos->id, [
            'employee_id' => 'EMP-SCAN-001',
            'status'      => 'Active',
        ]);

        $this->postJson('/api/kiosk/scan', ['code' => 'EMP-SCAN-001'])
            ->assertOk()
            ->assertJsonPath('type', 'personnel')
            ->assertJsonPath('direction', 'in')
            ->assertJsonPath('employee_id', 'EMP-SCAN-001');
    }

    public function test_scanning_same_employee_twice_toggles_to_out(): void
    {
        $dept   = $this->makeDepartment();
        $pos    = $this->makePosition($dept->id);
        $person = $this->makePersonnel($dept->id, $pos->id, [
            'employee_id' => 'EMP-SCAN-002',
            'status'      => 'Active',
        ]);

        // First scan — in
        $this->postJson('/api/kiosk/scan', ['code' => 'EMP-SCAN-002'])
            ->assertOk()
            ->assertJsonPath('direction', 'in');

        // Second scan same day — out
        $this->postJson('/api/kiosk/scan', ['code' => 'EMP-SCAN-002'])
            ->assertOk()
            ->assertJsonPath('direction', 'out');
    }

    // ── Scan by PIN code ──────────────────────────────────────────────────────

    public function test_scanning_by_pin_code_identifies_personnel(): void
    {
        $dept   = $this->makeDepartment();
        $pos    = $this->makePosition($dept->id);
        $person = $this->makePersonnel($dept->id, $pos->id, [
            'employee_id' => 'EMP-PIN-001',
            'pin_code'    => 4321,
            'status'      => 'Active',
        ]);

        $this->postJson('/api/kiosk/scan', ['code' => '4321'])
            ->assertOk()
            ->assertJsonPath('type', 'personnel')
            ->assertJsonPath('employee_id', 'EMP-PIN-001');
    }

    // ── Inactive personnel ────────────────────────────────────────────────────

    public function test_inactive_personnel_is_not_recognized(): void
    {
        $dept   = $this->makeDepartment();
        $pos    = $this->makePosition($dept->id);
        $this->makePersonnel($dept->id, $pos->id, [
            'employee_id' => 'EMP-INACTIVE',
            'status'      => 'Inactive',
        ]);

        // The scanner only matches Active personnel
        $this->postJson('/api/kiosk/scan', ['code' => 'EMP-INACTIVE'])
            ->assertStatus(404);
    }

    // ── Unknown code ──────────────────────────────────────────────────────────

    public function test_unknown_scan_code_returns_404(): void
    {
        $this->postJson('/api/kiosk/scan', ['code' => 'TOTALLY_UNKNOWN_XYZ'])
            ->assertStatus(404);
    }

    public function test_scan_requires_code_field(): void
    {
        $this->postJson('/api/kiosk/scan', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['code']);
    }

    // ── Manual log ────────────────────────────────────────────────────────────

    public function test_authenticated_user_can_create_manual_log(): void
    {
        $this->actAs('HR');
        $dept   = $this->makeDepartment();
        $pos    = $this->makePosition($dept->id);
        $person = $this->makePersonnel($dept->id, $pos->id, [
            'employee_id' => 'EMP-MANUAL-001',
            'status'      => 'Active',
        ]);

        $this->postJson('/api/hrms/attendance/manual', [
            'entity_type' => 'personnel',
            'entity_id'   => 'EMP-MANUAL-001',
            'direction'   => 'in',
            'log_time'    => now()->format('Y-m-d H:i:s'),
        ])->assertOk()
            ->assertJsonPath('data.direction', 'in');
    }

    public function test_manual_log_requires_mandatory_fields(): void
    {
        $this->actAs('HR');

        $this->postJson('/api/hrms/attendance/manual', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['entity_type', 'entity_id', 'direction', 'log_time']);
    }

    public function test_manual_log_requires_authentication(): void
    {
        $this->postJson('/api/hrms/attendance/manual', [
            'entity_type' => 'personnel',
            'entity_id'   => 'EMP-ANON',
            'direction'   => 'in',
            'log_time'    => now()->format('Y-m-d H:i:s'),
        ])->assertStatus(401);
    }
}
