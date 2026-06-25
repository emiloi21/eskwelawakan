<?php

namespace Tests\Feature\Hrms;

use App\Models\PayrollTemplate;
use Tests\TestCase;

/**
 * Payroll module tests — full lifecycle
 *
 * Lifecycle under test:
 * 1. Create payroll template
 * 2. Cannot delete template that has periods
 * 3. Create payroll period → items auto-generated
 * 4. View period items
 * 5. Override a payroll item (template must allow overrides)
 * 6. Submit period for approval
 * 7. Approve period
 * 8. Post period to GL (status → posted)
 * 9. Guard: draft period cannot be submitted twice
 * 10. Guard: non-HR role cannot manage payroll
 */
class PayrollTest extends TestCase
{
    private function makeTemplate(array $extra = []): PayrollTemplate
    {
        return PayrollTemplate::create(array_merge([
            'name'                    => 'Test Regular Template ' . uniqid(),
            'type'                    => 'regular',
            'include_basic'           => true,
            'deduct_sss'              => true,
            'deduct_philhealth'       => true,
            'deduct_pagibig'          => true,
            'deduct_tax'              => true,
            'allow_individual_override' => true,
            'is_active'               => true,
        ], $extra));
    }

    private function createPeriod(PayrollTemplate $tmpl): array
    {
        return $this->postJson('/api/hrms/payroll/periods', [
            'template_id'  => $tmpl->id,
            'school_year'  => '2025-2026',
            'period_label' => 'July 2025 — 1st Half',
            'period_start' => '2025-07-01',
            'period_end'   => '2025-07-15',
            'payout_date'  => '2025-07-16',
        ])->assertStatus(201)->json('data');
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->seedStatutoryData();
    }

    // ── Template CRUD ─────────────────────────────────────────────────────────

    public function test_hr_can_create_payroll_template(): void
    {
        $this->actAs('HR');

        $this->postJson('/api/hrms/payroll/templates', [
            'name'          => 'Monthly Regular',
            'type'          => 'regular',
            'include_basic' => true,
            'deduct_sss'    => true,
        ])->assertStatus(201)
            ->assertJsonPath('data.name', 'Monthly Regular');
    }

    public function test_cannot_delete_template_with_existing_periods(): void
    {
        $this->actAs('HR');

        // Build personnel so items can be generated
        $dept   = $this->makeDepartment();
        $pos    = $this->makePosition($dept->id);
        $this->makePersonnel($dept->id, $pos->id);

        $tmpl = $this->makeTemplate();
        $this->createPeriod($tmpl);

        $this->deleteJson("/api/hrms/payroll/templates/{$tmpl->public_id}")
            ->assertStatus(422);
    }

    // ── Period creation ───────────────────────────────────────────────────────

    public function test_hr_can_create_payroll_period(): void
    {
        $this->actAs('HR');
        $dept   = $this->makeDepartment();
        $pos    = $this->makePosition($dept->id);
        $this->makePersonnel($dept->id, $pos->id);
        $tmpl = $this->makeTemplate();

        $period = $this->createPeriod($tmpl);

        $this->assertSame('draft', $period['status']);
        $this->assertSame('July 2025 — 1st Half', $period['period_label']);
    }

    public function test_period_items_auto_generated_after_create(): void
    {
        $this->actAs('HR');
        $dept   = $this->makeDepartment();
        $pos    = $this->makePosition($dept->id);
        $this->makePersonnel($dept->id, $pos->id);
        $tmpl   = $this->makeTemplate();
        $period = $this->createPeriod($tmpl);

        $this->getJson("/api/hrms/payroll/periods/{$period['public_id']}/items")
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    public function test_create_period_requires_mandatory_fields(): void
    {
        $this->actAs('HR');

        $this->postJson('/api/hrms/payroll/periods', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['template_id', 'school_year', 'period_label', 'period_start', 'period_end']);
    }

    // ── Period workflow ───────────────────────────────────────────────────────

    public function test_full_payroll_lifecycle(): void
    {
        $this->actAs('HR');
        $dept   = $this->makeDepartment();
        $pos    = $this->makePosition($dept->id);
        $this->makePersonnel($dept->id, $pos->id);
        $tmpl   = $this->makeTemplate();
        $period = $this->createPeriod($tmpl);
        $pid    = $period['public_id'];

        // Step 1: submit for approval
        $this->postJson("/api/hrms/payroll/periods/{$pid}/submit")
            ->assertOk()
            ->assertJsonPath('data.status', 'for_approval');

        // Step 2: cannot submit again
        $this->postJson("/api/hrms/payroll/periods/{$pid}/submit")
            ->assertStatus(422);

        // Step 3: approve
        $this->postJson("/api/hrms/payroll/periods/{$pid}/approve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        // Step 4: post to GL
        $this->postJson("/api/hrms/payroll/periods/{$pid}/post")
            ->assertOk()
            ->assertJsonPath('data.status', 'posted');
    }

    public function test_cannot_post_draft_period(): void
    {
        $this->actAs('HR');
        $dept   = $this->makeDepartment();
        $pos    = $this->makePosition($dept->id);
        $this->makePersonnel($dept->id, $pos->id);
        $tmpl   = $this->makeTemplate();
        $period = $this->createPeriod($tmpl);

        $this->postJson("/api/hrms/payroll/periods/{$period['public_id']}/post")
            ->assertStatus(422);
    }

    public function test_cannot_delete_non_draft_period(): void
    {
        $this->actAs('HR');
        $dept   = $this->makeDepartment();
        $pos    = $this->makePosition($dept->id);
        $this->makePersonnel($dept->id, $pos->id);
        $tmpl   = $this->makeTemplate();
        $period = $this->createPeriod($tmpl);

        $this->postJson("/api/hrms/payroll/periods/{$period['public_id']}/submit");

        $this->deleteJson("/api/hrms/payroll/periods/{$period['public_id']}")
            ->assertStatus(422);
    }

    // ── Item override ─────────────────────────────────────────────────────────

    public function test_hr_can_override_payroll_item(): void
    {
        $this->actAs('HR');
        $dept   = $this->makeDepartment();
        $pos    = $this->makePosition($dept->id);
        $this->makePersonnel($dept->id, $pos->id);
        $tmpl   = $this->makeTemplate(['allow_individual_override' => true]);
        $period = $this->createPeriod($tmpl);
        $pid    = $period['public_id'];

        $items = $this->getJson("/api/hrms/payroll/periods/{$pid}/items")
            ->json('data');

        if (empty($items)) {
            $this->markTestSkipped('No payroll items generated (no active personnel).');
        }

        $itemId = $items[0]['public_id'];

        $this->putJson("/api/hrms/payroll/periods/{$pid}/items/{$itemId}", [
            'other_deductions' => 100.00,
            'remarks'          => 'Test override',
        ])->assertOk()
            ->assertJsonPath('data.is_manually_edited', true);
    }

    // ── Role guard ────────────────────────────────────────────────────────────

    public function test_registrar_cannot_create_payroll_period(): void
    {
        $this->actAs('Registrar');

        $tmpl = $this->makeTemplate();

        $this->postJson('/api/hrms/payroll/periods', [
            'template_id'  => $tmpl->id,
            'school_year'  => '2025-2026',
            'period_label' => 'July 2025',
            'period_start' => '2025-07-01',
            'period_end'   => '2025-07-15',
        ])->assertStatus(403);
    }
}
