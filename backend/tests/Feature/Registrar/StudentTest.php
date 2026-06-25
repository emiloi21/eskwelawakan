<?php

namespace Tests\Feature\Registrar;

use App\Models\Student;
use Tests\TestCase;

/**
 * Student / Registrar module tests
 *
 * Workflows:
 * - List students (with search, dept, status filters)
 * - Create student with all required fields
 * - Missing required field returns 422
 * - Duplicate student_id returns 422
 * - Show student by public_id
 * - Update student fields (partial update)
 * - Status transition: For Accounts Assessment → For Payment requires assessment_id
 * - Non-authorized role is rejected
 */
class StudentTest extends TestCase
{
    /** Minimal valid payload for creating a student */
    private function studentPayload(array $overrides = []): array
    {
        static $n = 0;
        $n++;
        return array_merge([
            'lrn'             => str_pad($n, 12, '0', STR_PAD_LEFT),
            'fname'           => 'Juan',
            'lname'           => 'Dela Cruz',
            'bdMM'            => '06',
            'bdDD'            => '15',
            'bdYYYY'          => '2010',
            'sex'             => 'Male',
            'guardian_contact' => '09171234567',
            'guardian_relation' => 'Father',
            'last_school'     => 'Sample Elementary School',
            'last_school_sy'  => '2023-2024',
            'last_school_type' => 'Public',
            'dept'            => 'JHS',
            'gradeLevel'      => 'Grade 7',
            'classification'  => 'Regular',
            'schoolYear'      => '2025-2026',
        ], $overrides);
    }

    // ── List ──────────────────────────────────────────────────────────────────

    public function test_admin_can_list_students(): void
    {
        $this->actAs('Administrator');

        $this->getJson('/api/registrar/students')
            ->assertOk()
            ->assertJsonStructure(['data', 'total']);
    }

    public function test_can_search_students_by_name(): void
    {
        $this->actAs('Administrator');

        $this->getJson('/api/registrar/students?search=Dela')
            ->assertOk();
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public function test_can_create_student_with_valid_payload(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/registrar/students', $this->studentPayload())
            ->assertStatus(201)
            ->assertJsonPath('data.fname', 'Juan');
    }

    public function test_create_auto_generates_student_id_when_not_provided(): void
    {
        $this->actAs('Administrator');

        $response = $this->postJson('/api/registrar/students', $this->studentPayload());

        $response->assertStatus(201);
        $this->assertNotEmpty($response->json('data.student_id'));
    }

    public function test_duplicate_student_id_returns_422(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/registrar/students', $this->studentPayload(['student_id' => 'JHS-0001']));
        $this->postJson('/api/registrar/students', $this->studentPayload(['student_id' => 'JHS-0001']))
            ->assertStatus(422)
            ->assertJsonValidationErrors(['student_id']);
    }

    public function test_missing_required_field_returns_422(): void
    {
        $this->actAs('Administrator');

        $payload = $this->studentPayload();
        unset($payload['fname'], $payload['lname'], $payload['lrn']);

        $this->postJson('/api/registrar/students', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['fname', 'lname', 'lrn']);
    }

    // ── Show ──────────────────────────────────────────────────────────────────

    public function test_can_read_student_by_public_id(): void
    {
        $this->actAs('Administrator');

        $created = $this->postJson('/api/registrar/students', $this->studentPayload())
            ->assertStatus(201)
            ->json('data');

        $publicId = $created['public_id'];

        $this->getJson("/api/registrar/students/{$publicId}")
            ->assertOk()
            ->assertJsonPath('data.public_id', $publicId);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public function test_can_update_student_name(): void
    {
        $this->actAs('Administrator');

        $created = $this->postJson('/api/registrar/students', $this->studentPayload())
            ->json('data');

        $this->putJson("/api/registrar/students/{$created['public_id']}", [
            'fname'  => 'Updated',
            'lname'  => 'Name',
        ])->assertOk()
            ->assertJsonPath('data.fname', 'Updated');
    }

    // ── Status transition ─────────────────────────────────────────────────────

    public function test_status_transition_to_for_payment_without_assessment_fails(): void
    {
        $this->actAs('Administrator');

        $created = $this->postJson('/api/registrar/students', $this->studentPayload())
            ->json('data');

        $this->putJson("/api/registrar/students/{$created['public_id']}", [
            'status' => 'For Payment',
        ])->assertStatus(422);
    }

    // ── Role guard ────────────────────────────────────────────────────────────

    public function test_cashier_cannot_create_student(): void
    {
        $this->actAs('Cashier');

        $this->postJson('/api/registrar/students', $this->studentPayload())
            ->assertStatus(403);
    }
}
