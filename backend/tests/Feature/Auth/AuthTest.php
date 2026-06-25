<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Tests\TestCase;

/**
 * Auth module tests
 *
 * Workflows:
 * - Login with valid credentials → returns token
 * - Login with wrong password → 401
 * - Login with unknown username → 401
 * - Authenticated /me → returns user info
 * - Logout → token revoked
 * - Update profile
 * - Change password
 * - Access protected route without token → 401
 */
class AuthTest extends TestCase
{
    // ── Login ─────────────────────────────────────────────────────────────────

    public function test_login_with_valid_credentials_returns_token(): void
    {
        $user = $this->makeUser('Administrator', ['username' => 'testadmin', 'password' => bcrypt('secret123')]);

        $response = $this->postJson('/api/auth/login', [
            'username' => 'testadmin',
            'password' => 'secret123',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['token', 'user' => ['id', 'username', 'access']]);
    }

    public function test_login_with_wrong_password_returns_422(): void
    {
        $this->makeUser('HR', ['username' => 'hruser', 'password' => bcrypt('correct')]);

        $this->postJson('/api/auth/login', ['username' => 'hruser', 'password' => 'wrong'])
            ->assertStatus(422);
    }

    public function test_login_with_unknown_username_returns_422(): void
    {
        $this->postJson('/api/auth/login', ['username' => 'nobody', 'password' => 'any'])
            ->assertStatus(422);
    }

    public function test_login_missing_fields_returns_422(): void
    {
        $this->postJson('/api/auth/login', [])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['username', 'password']);
    }

    // ── Authenticated endpoints ───────────────────────────────────────────────

    public function test_me_returns_authenticated_user(): void
    {
        $user = $this->actAs('Registrar');

        $this->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.access', 'Registrar');
    }

    public function test_protected_route_without_token_returns_401(): void
    {
        $this->getJson('/api/auth/me')
            ->assertStatus(401);
    }

    // ── Logout ────────────────────────────────────────────────────────────────

    public function test_logout_revokes_token(): void
    {
        $this->actAs('Administrator');

        $this->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonFragment(['message' => 'Logged out']);
    }

    // ── Profile update ────────────────────────────────────────────────────────

    public function test_update_profile_persists_changes(): void
    {
        $this->actAs('Cashier');

        $this->putJson('/api/auth/profile', [
            'fname' => 'UpdatedFirst',
            'lname' => 'UpdatedLast',
        ])->assertOk();

        $this->getJson('/api/auth/me')
            ->assertJsonPath('user.fname', 'UpdatedFirst');
    }

    // ── Change password ───────────────────────────────────────────────────────

    public function test_change_password_succeeds_with_correct_current_password(): void
    {
        $this->makeUser('HR', ['username' => 'pwtest', 'password' => bcrypt('old_pass')]);
        $this->actingAs(User::where('username', 'pwtest')->first(), 'sanctum');

        $this->putJson('/api/auth/password', [
            'current_password'      => 'old_pass',
            'password'              => 'new_pass_123',
            'password_confirmation' => 'new_pass_123',
        ])->assertOk();
    }

    public function test_change_password_fails_with_wrong_current_password(): void
    {
        $this->actAs('HR');

        $this->putJson('/api/auth/password', [
            'current_password'      => 'totally_wrong',
            'password'              => 'new_pass_123',
            'password_confirmation' => 'new_pass_123',
        ])->assertStatus(422);
    }

    // ── Role access ───────────────────────────────────────────────────────────

    public function test_non_admin_cannot_access_admin_routes(): void
    {
        $this->actAs('Cashier');

        $this->getJson('/api/admin/users')
            ->assertStatus(403);
    }
}
