<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * StaffAccountsSeeder
 *
 * Creates the base staff user accounts required by every environment.
 * Uses firstOrCreate so it is safe to run on a database that already
 * has these accounts (idempotent).
 *
 * Run standalone (e.g. after the DB already has mock data):
 *   php artisan db:seed --class="Database\Seeders\StaffAccountsSeeder"
 */
class StaffAccountsSeeder extends Seeder
{
    public function run(): void
    {
        $staff = [
            [
                'username'   => 'admin',
                'password'   => 'admin123',
                'fname'      => 'System',
                'lname'      => 'Administrator',
                'email'      => 'admin@svhs.edu.ph',
                'access'     => 'Administrator',
                'department' => 'Admin',
            ],
            [
                'username'   => 'encoder',
                'password'   => 'encoder123',
                'fname'      => 'Test',
                'lname'      => 'Encoder',
                'email'      => 'encoder@svhs.edu.ph',
                'access'     => 'Encoder',
                'department' => 'Senior High School',
            ],
            [
                'username'   => 'registrar',
                'password'   => 'registrar123',
                'fname'      => 'Test',
                'lname'      => 'Registrar',
                'email'      => 'registrar@svhs.edu.ph',
                'access'     => 'Registrar',
                'department' => 'Registrar',
            ],
            [
                'username'   => 'accounting',
                'password'   => 'accounting123',
                'fname'      => 'Test',
                'lname'      => 'Accounting',
                'email'      => 'accounting@svhs.edu.ph',
                'access'     => 'Accounting Staff',
                'department' => 'Admin',
            ],
            [
                'username'   => 'cashier',
                'password'   => 'cashier123',
                'fname'      => 'Test',
                'lname'      => 'Cashier',
                'email'      => 'cashier@svhs.edu.ph',
                'access'     => 'Cashier',
                'department' => 'Accounting',
            ],
            [
                'username'   => 'hr',
                'password'   => 'hr123',
                'fname'      => 'Test',
                'lname'      => 'HR',
                'email'      => 'hr@svhs.edu.ph',
                'access'     => 'HR',
                'department' => 'Admin',
            ],
            [
                'username'   => 'custodian',
                'password'   => 'custodian123',
                'fname'      => 'Test',
                'lname'      => 'Custodian',
                'email'      => 'custodian@svhs.edu.ph',
                'access'     => 'Custodian',
                'department' => 'Admin',
            ],
            [
                'username'   => 'librarian',
                'password'   => 'librarian123',
                'fname'      => 'Test',
                'lname'      => 'Librarian',
                'email'      => 'librarian@svhs.edu.ph',
                'access'     => 'Librarian',
                'department' => 'Library',
            ],
            [
                'username'   => 'nurse',
                'password'   => 'nurse123',
                'fname'      => 'Test',
                'lname'      => 'Nurse',
                'email'      => 'nurse@svhs.edu.ph',
                'access'     => 'School Nurse',
                'department' => 'Clinic',
            ],
            [
                'username'   => 'frontdesk',
                'password'   => 'frontdesk123',
                'fname'      => 'Test',
                'lname'      => 'FrontDesk',
                'email'      => 'frontdesk@svhs.edu.ph',
                'access'     => 'Front Desk',
                'department' => 'Front Office',
            ],
            [
                'username'   => 'guidance',
                'password'   => 'guidance123',
                'fname'      => 'Test',
                'lname'      => 'Counselor',
                'email'      => 'guidance@svhs.edu.ph',
                'access'     => 'Guidance Counselor',
                'department' => 'Guidance Office',
            ],
        ];

        foreach ($staff as $account) {
            $plain = $account['password'];
            unset($account['password']);

            User::firstOrCreate(
                ['username' => $account['username']],
                array_merge($account, [
                    'password' => bcrypt($plain),
                    'status'   => 'Active',
                ]),
            );
        }

        $this->command?->info('Staff accounts seeded (' . count($staff) . ' accounts).');
    }
}
