<?php

namespace Tests\Feature\Accounting;

use Tests\TestCase;

/**
 * Assessment setup (categories + particulars) tests
 *
 * Workflows:
 * - Create accounts category (single grade level)
 * - Create accounts category for multiple grade levels
 * - Duplicate description+gradeLevel is allowed (different records intended)
 * - Create particular
 * - List categories with per_page pagination
 * - Non-accounting role is rejected
 */
class AssessmentSetupTest extends TestCase
{
    // ── Categories ────────────────────────────────────────────────────────────

    public function test_can_create_accounts_category(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/accounting/categories', [
            'gradeLevel'  => 'Grade 7',
            'schoolYear'  => '2025-2026',
            'description' => 'Tuition Fee',
        ])->assertStatus(201)
            ->assertJsonPath('data.gradeLevel', 'Grade 7')
            ->assertJsonPath('data.description', 'Tuition Fee');
    }

    public function test_can_create_category_for_multiple_grade_levels(): void
    {
        $this->actAs('Administrator');

        $response = $this->postJson('/api/accounting/categories', [
            'gradeLevels' => ['Grade 7', 'Grade 8', 'Grade 9'],
            'schoolYear'  => '2025-2026',
            'description' => 'Misc Fee',
        ])->assertStatus(201);

        // Should return an array of 3 created items
        $this->assertCount(3, $response->json('data'));
    }

    public function test_create_category_requires_schoolYear_and_description(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/accounting/categories', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['schoolYear', 'description']);
    }

    public function test_create_category_requires_grade_level(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/accounting/categories', [
            'schoolYear'  => '2025-2026',
            'description' => 'Computer Lab Fee',
        ])->assertStatus(422);
    }

    public function test_can_list_categories(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/accounting/categories', [
            'gradeLevel'  => 'Grade 10',
            'schoolYear'  => '2025-2026',
            'description' => 'SHS Tuition',
        ]);

        $this->getJson('/api/accounting/categories?per_page=10')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    // ── Particulars ───────────────────────────────────────────────────────────

    public function test_can_create_particular(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/accounting/particulars', [
            'gradeLevel'    => 'Grade 7',
            'schoolYear'    => '2025-2026',
            'account_group' => 'Tuition',
            'account_code'  => 'TF-G7-001',
            'description'   => 'Tuition Fee — JHS',
            'amount'        => 5000.00,
        ])->assertStatus(201)
            ->assertJsonPath('data.description', 'Tuition Fee — JHS');
    }

    public function test_create_particular_requires_description(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/accounting/particulars', ['amount' => 100])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['description']);
    }

    // ── Role guard ────────────────────────────────────────────────────────────

    public function test_hr_cannot_create_category(): void
    {
        $this->actAs('HR');

        $this->postJson('/api/accounting/categories', [
            'gradeLevel'  => 'Grade 7',
            'schoolYear'  => '2025-2026',
            'description' => 'Should fail',
        ])->assertStatus(403);
    }
}
