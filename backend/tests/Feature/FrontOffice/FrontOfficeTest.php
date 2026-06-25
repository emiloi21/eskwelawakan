<?php

namespace Tests\Feature\FrontOffice;

use Tests\TestCase;

/**
 * Front Office module tests
 *
 * Workflows:
 * - Front Desk staff can check in a visitor
 * - Front Desk staff can check out a visitor
 * - Cannot check out already checked-out visitor
 * - Front Desk staff can list visitors
 * - Front Desk staff can issue a gate pass
 * - Front Desk staff can return a gate pass
 * - Cannot return a non-active gate pass
 * - Front Desk staff can log incoming correspondence
 * - Front Desk staff can update correspondence status
 * - Non-authorized role is rejected
 */
class FrontOfficeTest extends TestCase
{
    // ── Visitor Log ───────────────────────────────────────────────────────────

    public function test_front_desk_can_list_visitors(): void
    {
        $this->actAs('Front Desk');
        $this->getJson('/api/front-office/visitors')->assertOk();
    }

    public function test_front_desk_can_check_in_visitor(): void
    {
        $this->actAs('Front Desk');
        $response = $this->postJson('/api/front-office/visitors/check-in', [
            'visitor_name' => 'Maria Santos',
            'purpose'      => 'Parent meeting',
            'host_name'    => 'Mr. Cruz',
        ])->assertStatus(201);

        $this->assertEquals('In', $response->json('data.status'));
        $this->assertNotNull($response->json('data.check_in_at'));
    }

    public function test_check_in_requires_visitor_name_and_purpose(): void
    {
        $this->actAs('Front Desk');
        $this->postJson('/api/front-office/visitors/check-in', [])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['visitor_name', 'purpose']);
    }

    public function test_front_desk_can_check_out_visitor(): void
    {
        $this->actAs('Front Desk');
        $visitor = $this->postJson('/api/front-office/visitors/check-in', [
            'visitor_name' => 'Pedro Lopez',
            'purpose'      => 'Delivery',
        ])->json('data');

        $this->postJson("/api/front-office/visitors/{$visitor['public_id']}/check-out")
             ->assertOk()
             ->assertJsonPath('data.status', 'Out');
    }

    public function test_cannot_check_out_already_checked_out_visitor(): void
    {
        $this->actAs('Front Desk');
        $visitor = $this->postJson('/api/front-office/visitors/check-in', [
            'visitor_name' => 'Dupe Visitor',
            'purpose'      => 'Testing',
        ])->json('data');

        $this->postJson("/api/front-office/visitors/{$visitor['public_id']}/check-out")->assertOk();
        $this->postJson("/api/front-office/visitors/{$visitor['public_id']}/check-out")->assertStatus(422);
    }

    public function test_front_desk_can_delete_visitor_log(): void
    {
        $this->actAs('Front Desk');
        $visitor = $this->postJson('/api/front-office/visitors/check-in', [
            'visitor_name' => 'Delete Me',
            'purpose'      => 'Test',
        ])->json('data');

        $this->deleteJson("/api/front-office/visitors/{$visitor['public_id']}")->assertStatus(204);
    }

    // ── Gate Passes ───────────────────────────────────────────────────────────

    public function test_front_desk_can_list_gate_passes(): void
    {
        $this->actAs('Front Desk');
        $this->getJson('/api/front-office/gate-passes')->assertOk();
    }

    public function test_front_desk_can_issue_gate_pass(): void
    {
        $this->actAs('Front Desk');
        $student = $this->makeStudent();

        $this->postJson('/api/front-office/gate-passes', [
            'student_id'  => $student->reg_id,
            'purpose'     => 'Doctor appointment',
            'destination' => 'City Health Center',
        ])->assertStatus(201)
          ->assertJsonPath('data.status', 'Active');
    }

    public function test_gate_pass_requires_student_and_destination(): void
    {
        $this->actAs('Front Desk');
        $this->postJson('/api/front-office/gate-passes', [])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['student_id', 'purpose', 'destination']);
    }

    public function test_gate_pass_fails_for_invalid_student(): void
    {
        $this->actAs('Front Desk');
        $this->postJson('/api/front-office/gate-passes', [
            'student_id'  => 99999,
            'purpose'     => 'Test',
            'destination' => 'Somewhere',
        ])->assertStatus(422)->assertJsonValidationErrors(['student_id']);
    }

    public function test_front_desk_can_return_gate_pass(): void
    {
        $this->actAs('Front Desk');
        $student = $this->makeStudent();
        $pass    = $this->postJson('/api/front-office/gate-passes', [
            'student_id'  => $student->reg_id,
            'purpose'     => 'Appointment',
            'destination' => 'Hospital',
        ])->json('data');

        $this->postJson("/api/front-office/gate-passes/{$pass['public_id']}/return")
             ->assertOk()
             ->assertJsonPath('data.status', 'Returned');
    }

    public function test_cannot_return_non_active_gate_pass(): void
    {
        $this->actAs('Front Desk');
        $student = $this->makeStudent();
        $pass    = $this->postJson('/api/front-office/gate-passes', [
            'student_id'  => $student->reg_id,
            'purpose'     => 'Appointment',
            'destination' => 'Hospital',
        ])->json('data');

        $this->postJson("/api/front-office/gate-passes/{$pass['public_id']}/return")->assertOk();
        $this->postJson("/api/front-office/gate-passes/{$pass['public_id']}/return")->assertStatus(422);
    }

    // ── Correspondence Log ────────────────────────────────────────────────────

    public function test_front_desk_can_list_correspondence(): void
    {
        $this->actAs('Front Desk');
        $this->getJson('/api/front-office/correspondence')->assertOk();
    }

    public function test_front_desk_can_log_correspondence(): void
    {
        $this->actAs('Front Desk');
        $response = $this->postJson('/api/front-office/correspondence', [
            'direction'     => 'Incoming',
            'from_to'       => 'DepEd Division Office',
            'subject'       => 'Memorandum on School Calendar',
            'document_date' => '2025-06-01',
        ])->assertStatus(201);

        $this->assertEquals('Pending', $response->json('data.status'));
    }

    public function test_correspondence_requires_direction_from_subject_date(): void
    {
        $this->actAs('Front Desk');
        $this->postJson('/api/front-office/correspondence', [])
             ->assertStatus(422)
             ->assertJsonValidationErrors(['direction', 'from_to', 'subject', 'document_date']);
    }

    public function test_front_desk_can_update_correspondence_status(): void
    {
        $this->actAs('Front Desk');
        $log = $this->postJson('/api/front-office/correspondence', [
            'direction'     => 'Outgoing',
            'from_to'       => 'Parent',
            'subject'       => 'Notice',
            'document_date' => '2025-06-01',
        ])->json('data');

        $this->putJson("/api/front-office/correspondence/{$log['public_id']}", [
            'status' => 'Noted',
        ])->assertOk()->assertJsonPath('data.status', 'Noted');
    }

    public function test_non_authorized_role_is_rejected(): void
    {
        $this->actAs('Student');
        $this->getJson('/api/front-office/visitors')->assertStatus(403);
    }
}
