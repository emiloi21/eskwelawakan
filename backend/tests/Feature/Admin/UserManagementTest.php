<?php

namespace Tests\Feature\Admin;

use Tests\TestCase;

/**
 * User management tests
 *
 * Workflows:
 * - List users
 * - Create user (all required fields)
 * - Duplicate username → 422
 * - Update user info
 * - Reset password
 * - Change user status (Active / Inactive)
 * - Non-admin cannot access user management
 */
class UserManagementTest extends TestCase
{
    // ── List ──────────────────────────────────────────────────────────────────

    public function test_admin_can_list_users(): void
    {
        $this->actAs('Administrator');
        $this->makeUser('HR');
        $this->makeUser('Cashier');

        $this->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonStructure(['data']);
    }

    // ── Create ────────────────────────────────────────────────────────────────

    public function test_admin_can_create_user(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/admin/users', [
            'fname'    => 'Maria',
            'lname'    => 'Santos',
            'username' => 'msantos',
            'password' => 'password123',
            'access'   => 'Registrar',
            'status'   => 'Active',
        ])->assertStatus(201)
            ->assertJsonPath('data.username', 'msantos');
    }

    public function test_duplicate_username_returns_422(): void
    {
        $this->actAs('Administrator');
        $this->makeUser('HR', ['username' => 'taken_user']);

        $this->postJson('/api/admin/users', [
            'fname'    => 'Another',
            'lname'    => 'Person',
            'username' => 'taken_user',
            'password' => 'password123',
            'access'   => 'HR',
            'status'   => 'Active',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['username']);
    }

    public function test_create_user_requires_mandatory_fields(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/admin/users', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['fname', 'lname', 'username', 'password', 'access']);
    }

    // ── Show ──────────────────────────────────────────────────────────────────

    public function test_admin_can_view_user_detail(): void
    {
        $this->actAs('Administrator');
        $user = $this->makeUser('Cashier');

        $this->getJson("/api/admin/users/{$user->public_id}")
            ->assertOk()
            ->assertJsonPath('data.id', $user->id);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public function test_admin_can_update_user(): void
    {
        $this->actAs('Administrator');
        $user = $this->makeUser('HR');

        $this->putJson("/api/admin/users/{$user->public_id}", [
            'fname'  => 'NewFirst',
            'lname'  => 'NewLast',
            'access' => 'Cashier',
            'status' => 'Active',
        ])->assertOk()
            ->assertJsonPath('data.fname', 'NewFirst');
    }

    // ── Status toggle ─────────────────────────────────────────────────────────

    public function test_admin_can_deactivate_user(): void
    {
        $this->actAs('Administrator');
        $user = $this->makeUser('HR', ['status' => 'Active']);

        $this->deleteJson("/api/admin/users/{$user->public_id}")
            ->assertOk();

        $this->getJson("/api/admin/users/{$user->public_id}")
            ->assertJsonPath('data.status', 'Inactive');
    }

    // ── Password reset ────────────────────────────────────────────────────────

    public function test_admin_can_reset_user_password(): void
    {
        $this->actAs('Administrator');
        $user = $this->makeUser('Registrar', ['username' => 'resetme']);

        $response = $this->postJson("/api/admin/users/{$user->public_id}/reset-password")
            ->assertOk()
            ->assertJsonStructure(['data' => ['new_password']]);

        // New auto-generated password should allow login
        $newPassword = $response->json('data.new_password');
        $this->postJson('/api/auth/login', [
            'username' => 'resetme',
            'password' => $newPassword,
        ])->assertOk();
    }

    // ── Role guard ────────────────────────────────────────────────────────────

    public function test_non_admin_cannot_list_users(): void
    {
        $this->actAs('HR');

        $this->getJson('/api/admin/users')
            ->assertStatus(403);
    }

    public function test_non_admin_cannot_create_user(): void
    {
        $this->actAs('Registrar');

        $this->postJson('/api/admin/users', [
            'fname'    => 'X',
            'lname'    => 'Y',
            'username' => 'xy',
            'password' => 'pw',
            'access'   => 'Cashier',
        ])->assertStatus(403);
    }
}
