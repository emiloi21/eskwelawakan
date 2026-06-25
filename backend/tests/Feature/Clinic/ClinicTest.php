<?php

namespace Tests\Feature\Clinic;

use Tests\TestCase;

/**
 * Clinic / Health Records module tests
 *
 * Workflows:
 * - School Nurse can create/update a student health record (upsert)
 * - School Nurse can list health records
 * - School Nurse can log a clinic visit
 * - Clinic visit requires student_id and complaint
 * - School Nurse can update a clinic visit
 * - School Nurse can delete a clinic visit
 * - School Nurse can log a health incident
 * - School Nurse can update and close an incident
 * - School Nurse can delete an incident
 * - Authenticated student can view their own health record (returns null if none)
 * - Non-authorized role is rejected
 */
class ClinicTest extends TestCase
{
    // ── Health Records ────────────────────────────────────────────────────────

    public function test_nurse_can_list_health_records(): void
    {
        $this->actAs('School Nurse');
        $this->getJson('/api/clinic/health-records')->assertOk();
    }

    public function test_nurse_can_create_health_record(): void
    {
        $this->actAs('School Nurse');
        $student = $this->makeStudent();

        $this->postJson('/api/clinic/health-records', [
            'student_id' => $student->reg_id,
            'blood_type' => 'O+',
            'height_cm'  => 155.0,
            'weight_kg'  => 45.0,
            'allergies'  => 'Peanuts',
        ])->assertStatus(201)
          ->assertJsonPath('data.blood_type', 'O+');
    }

    public function test_health_record_upserts_per_student(): void
    {
        $this->actAs('School Nurse');
        $student = $this->makeStudent();

        // First create
        $this->postJson('/api/clinic/health-records', [
            'student_id' => $student->reg_id,
            'blood_type' => 'A+',
        ])->assertStatus(201);

        // Update (same student)
        $this->postJson('/api/clinic/health-records', [
            'student_id' => $student->reg_id,
            'blood_type' => 'A-',
        ])->assertOk()
          ->assertJsonPath('data.blood_type', 'A-');
    }

    public function test_health_record_requires_valid_student(): void
    {
        $this->actAs('School Nurse');
        $this->postJson('/api/clinic/health-records', [
            'student_id' => 99999,
            'blood_type' => 'B+',
        ])->assertStatus(422)->assertJsonValidationErrors(['student_id']);
    }

    public function test_nurse_can_view_specific_health_record(): void
    {
        $this->actAs('School Nurse');
        $student = $this->makeStudent();

        $record = $this->postJson('/api/clinic/health-records', [
            'student_id' => $student->reg_id,
            'blood_type' => 'AB+',
        ])->json('data');

        $this->getJson("/api/clinic/health-records/{$record['public_id']}")
             ->assertOk()
             ->assertJsonPath('data.blood_type', 'AB+');
    }

    // ── Clinic Visits ─────────────────────────────────────────────────────────

    public function test_nurse_can_list_visits(): void
    {
        $this->actAs('School Nurse');
        $this->getJson('/api/clinic/visits')->assertOk();
    }

    public function test_nurse_can_log_clinic_visit(): void
    {
        $this->actAs('School Nurse');
        $student = $this->makeStudent();

        $this->postJson('/api/clinic/visits', [
            'student_id' => $student->reg_id,
            'visit_date' => '2025-06-10',
            'complaint'  => 'Headache and fever',
            'diagnosis'  => 'Mild fever',
            'disposition' => 'Sent Home',
        ])->assertStatus(201)
          ->assertJsonPath('data.disposition', 'Sent Home');
    }

    public function test_visit_requires_student_id_and_complaint(): void
    {
        $this->actAs('School Nurse');
        $this->postJson('/api/clinic/visits', [])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['student_id', 'visit_date', 'complaint']);
    }

    public function test_nurse_can_update_visit(): void
    {
        $this->actAs('School Nurse');
        $student = $this->makeStudent();

        $visit = $this->postJson('/api/clinic/visits', [
            'student_id' => $student->reg_id,
            'visit_date' => '2025-06-10',
            'complaint'  => 'Stomachache',
        ])->json('data');

        $this->putJson("/api/clinic/visits/{$visit['public_id']}", [
            'diagnosis'  => 'Gastritis',
            'disposition' => 'Released',
        ])->assertOk()->assertJsonPath('data.diagnosis', 'Gastritis');
    }

    public function test_nurse_can_delete_visit(): void
    {
        $this->actAs('School Nurse');
        $student = $this->makeStudent();

        $visit = $this->postJson('/api/clinic/visits', [
            'student_id' => $student->reg_id,
            'visit_date' => '2025-06-10',
            'complaint'  => 'Toothache',
        ])->json('data');

        $this->deleteJson("/api/clinic/visits/{$visit['public_id']}")->assertStatus(204);
    }

    // ── Health Incidents ──────────────────────────────────────────────────────

    public function test_nurse_can_list_incidents(): void
    {
        $this->actAs('School Nurse');
        $this->getJson('/api/clinic/incidents')->assertOk();
    }

    public function test_nurse_can_log_incident(): void
    {
        $this->actAs('School Nurse');
        $student = $this->makeStudent();

        $this->postJson('/api/clinic/incidents', [
            'student_id'        => $student->reg_id,
            'incident_type'     => 'Accident',
            'incident_datetime' => '2025-06-10 09:30:00',
            'location'          => 'Gymnasium',
            'description'       => 'Student slipped and fell',
        ])->assertStatus(201)
          ->assertJsonPath('data.status', 'Open');
    }

    public function test_incident_requires_student_type_datetime_and_description(): void
    {
        $this->actAs('School Nurse');
        $this->postJson('/api/clinic/incidents', [])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['student_id', 'incident_type', 'incident_datetime', 'description']);
    }

    public function test_nurse_can_close_incident(): void
    {
        $this->actAs('School Nurse');
        $student  = $this->makeStudent();
        $incident = $this->postJson('/api/clinic/incidents', [
            'student_id'        => $student->reg_id,
            'incident_type'     => 'Illness',
            'incident_datetime' => '2025-06-11 10:00:00',
            'description'       => 'Student felt dizzy in class',
        ])->json('data');

        $this->putJson("/api/clinic/incidents/{$incident['public_id']}", [
            'status' => 'Closed',
        ])->assertOk()->assertJsonPath('data.status', 'Closed');
    }

    public function test_nurse_can_delete_incident(): void
    {
        $this->actAs('School Nurse');
        $student  = $this->makeStudent();
        $incident = $this->postJson('/api/clinic/incidents', [
            'student_id'        => $student->reg_id,
            'incident_type'     => 'Other',
            'incident_datetime' => '2025-06-12 11:00:00',
            'description'       => 'Minor cut on finger',
        ])->json('data');

        $this->deleteJson("/api/clinic/incidents/{$incident['public_id']}")->assertStatus(204);
    }

    // ── Student portal ────────────────────────────────────────────────────────

    public function test_authenticated_user_can_call_my_health_record_endpoint(): void
    {
        // Any authenticated user can hit the endpoint — returns null if no record
        $this->actAs('Student');
        $this->getJson('/api/clinic/my-health-record')->assertOk();
    }

    // ── Authorization ─────────────────────────────────────────────────────────

    public function test_non_authorized_role_is_rejected(): void
    {
        $this->actAs('Cashier');
        $this->getJson('/api/clinic/health-records')->assertStatus(403);
    }
}
