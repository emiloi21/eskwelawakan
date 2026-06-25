<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Test Users Seeder
 *
 * Creates one test user account per role that wasn't seeded by the main seeder.
 * Credentials: username = role slug, password = role_slug + "123"
 * e.g. hr / hr123, custodian / custodian123
 *
 * DO NOT run in production.
 */
class TestUsersSeeder extends Seeder
{
    public function run(): void
    {
        $users = [
            // ── HRMS ──────────────────────────────────────────────────────────
            [
                'username'   => 'hr',
                'password'   => 'hr123',
                'fname'      => 'Maria',
                'lname'      => 'Santos',
                'email'      => 'hr@svhs.edu.ph',
                'access'     => 'HR',
                'department' => 'Admin',
            ],
            // ── Custodian ────────────────────────────────────────────────────
            [
                'username'   => 'custodian',
                'password'   => 'custodian123',
                'fname'      => 'Pedro',
                'lname'      => 'Reyes',
                'email'      => 'custodian@svhs.edu.ph',
                'access'     => 'Custodian',
                'department' => 'Admin',
            ],
            // ── Registrar ────────────────────────────────────────────────────
            [
                'username'   => 'registrar',
                'password'   => 'registrar123',
                'fname'      => 'Ana',
                'lname'      => 'Macaraeg',
                'email'      => 'registrar@svhs.edu.ph',
                'access'     => 'Registrar',
                'department' => 'Registrar',
            ],
            // ── Cashier ──────────────────────────────────────────────────────
            [
                'username'   => 'cashier',
                'password'   => 'cashier123',
                'fname'      => 'Lorna',
                'lname'      => 'Villanueva',
                'email'      => 'cashier@svhs.edu.ph',
                'access'     => 'Cashier',
                'department' => 'Accounting',
            ],
            // ── Teacher ──────────────────────────────────────────────────────
            [
                'username'   => 'teacher',
                'password'   => 'teacher123',
                'fname'      => 'Juan',
                'lname'      => 'Dela Cruz',
                'email'      => 'teacher@svhs.edu.ph',
                'access'     => 'Teacher',
                'department' => 'Senior High School',
            ],
            // ── Student ──────────────────────────────────────────────────────
            [
                'username'   => 'student',
                'password'   => 'student123',
                'fname'      => 'Carlo',
                'lname'      => 'Bautista',
                'email'      => 'student@svhs.edu.ph',
                'access'     => 'Student',
                'department' => 'Senior High School',
            ],
            // ── Parent ───────────────────────────────────────────────────────
            [
                'username'   => 'parent',
                'password'   => 'parent123',
                'fname'      => 'Rosa',
                'lname'      => 'Bautista',
                'email'      => 'parent@svhs.edu.ph',
                'access'     => 'Parent',
                'department' => null,
            ],
        ];

        foreach ($users as $u) {
            User::firstOrCreate(
                ['username' => $u['username']],
                [
                    'password'   => Hash::make($u['password']),
                    'fname'      => $u['fname'],
                    'lname'      => $u['lname'],
                    'email'      => $u['email'],
                    'access'     => $u['access'],
                    'department' => $u['department'],
                    'status'     => 'Active',
                ]
            );
        }

        $this->command->info('Test users created (skipped if already exist):');
        $this->command->table(
            ['Username', 'Password', 'Role'],
            array_map(fn($u) => [$u['username'], $u['password'], $u['access']], $users)
        );
    }
}
