<?php

namespace Tests;

use App\Models\HrmsDepartment;
use App\Models\HrmsPersonnel;
use App\Models\HrmsPosition;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Foundation\Testing\WithFaker;
use Illuminate\Support\Facades\DB;

abstract class TestCase extends BaseTestCase
{
    use RefreshDatabase, WithFaker;

    // ─── User helpers ─────────────────────────────────────────────────────────

    /** Create a User with the given role. */
    protected function makeUser(string $role = 'Administrator', array $extra = []): User
    {
        return User::create(array_merge([
            'username' => $this->faker->unique()->userName() . rand(100, 999),
            'password' => bcrypt('password'),
            'fname'    => $this->faker->firstName(),
            'lname'    => $this->faker->lastName(),
            'email'    => $this->faker->unique()->safeEmail(),
            'access'   => $role,
            'status'   => 'Active',
        ], $extra));
    }

    /** Create a user and set them as the authenticated user for subsequent requests. */
    protected function actAs(string $role = 'Administrator', array $extra = []): User
    {
        $user = $this->makeUser($role, $extra);
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    // ─── School year ──────────────────────────────────────────────────────────

    protected function makeSchoolYear(array $extra = []): SchoolYear
    {
        return SchoolYear::create(array_merge([
            'school_year'   => '2025-2026',
            'status'        => 'Active',
            'fy_start_date' => '2025-06-01',
            'fy_end_date'   => '2026-05-31',
            'fy_closed'     => false,
        ], $extra));
    }

    // ─── Student helper ───────────────────────────────────────────────────────

    protected function makeStudent(array $extra = []): Student
    {
        static $n = 0;
        $n++;
        return Student::create(array_merge([
            'lrn'               => str_pad($n, 12, '0', STR_PAD_LEFT),
            'student_id'        => 'STU-T-' . str_pad($n, 5, '0', STR_PAD_LEFT),
            'fname'             => 'Test',
            'lname'             => 'Student',
            'mname'             => 'N/A',
            'suffix'            => '',
            'bdMM'              => '06',
            'bdDD'              => '15',
            'bdYYYY'            => '2010',
            'sex'               => 'Male',
            'guardian_contact'  => '09170000000',
            'guardian_relation' => 'Father',
            'last_school'       => 'Test School',
            'last_school_sy'    => '2023-2024',
            'last_school_type'  => 'Public',
            'dept'              => 'JHS',
            'gradeLevel'        => 'Grade 7',
            'strand'            => 'N/A',
            'major'             => 'N/A',
            'section'           => 'A',
            'classification'    => 'Regular',
            'schoolYear'        => '2025-2026',
            'appDate'           => '2025-06-01',
            'appTime'           => '08:00 AM',
            'status'            => 'Enrolled',
        ], $extra));
    }

    // ─── HRMS helpers ─────────────────────────────────────────────────────────

    protected function makeDepartment(array $extra = []): HrmsDepartment
    {
        static $n = 0;
        return HrmsDepartment::create(array_merge([
            'name' => 'Department-' . (++$n) . '-' . uniqid(),
        ], $extra));
    }

    protected function makePosition(int $deptId, array $extra = []): HrmsPosition
    {
        static $n = 0;
        return HrmsPosition::create(array_merge([
            'name'          => 'Position-' . (++$n) . '-' . uniqid(),
            'department_id' => $deptId,
        ], $extra));
    }

    protected function makePersonnel(int $deptId, int $posId, array $extra = []): HrmsPersonnel
    {
        static $n = 0;
        return HrmsPersonnel::create(array_merge([
            'employee_id'     => 'EMP-T-' . str_pad(++$n, 5, '0', STR_PAD_LEFT),
            'pin_code'        => str_pad($n, 4, '0', STR_PAD_LEFT),
            'fname'           => $this->faker->firstName(),
            'lname'           => $this->faker->lastName(),
            'department_id'   => $deptId,
            'position_id'     => $posId,
            'employment_type' => 'Regular',
            'status'          => 'Active',
            'date_hired'      => '2022-06-01',
        ], $extra));
    }

    // ─── Payroll statutory data ───────────────────────────────────────────────

    /** Seed minimum statutory data required for payroll computation. */
    protected function seedStatutoryData(): void
    {
        DB::table('payroll_sss_brackets')->insert([
            'salary_from' => 0, 'salary_to' => null, 'msc' => 20000,
            'employee_contribution' => 900, 'employer_contribution' => 1800,
            'ec_contribution' => 10, 'wisp_employee' => 0, 'wisp_employer' => 0,
            'effective_year' => 2025,
        ]);
        DB::table('payroll_philhealth_config')->insert([
            'rate_percent' => 5.00, 'min_monthly_premium' => 500,
            'max_monthly_premium' => 5000, 'effective_year' => 2025,
        ]);
        DB::table('payroll_pagibig_config')->insert([
            'low_salary_threshold' => 1500, 'low_employee_rate' => 0.01,
            'high_employee_rate' => 0.02, 'employer_rate' => 0.02,
            'max_employee_contribution' => 100, 'max_employer_contribution' => 100,
            'effective_year' => 2025,
        ]);
        DB::table('payroll_tax_brackets')->insert([
            ['income_from' => 0,     'income_to' => 20833, 'base_tax' => 0,    'rate_percent' => 0,  'effective_year' => 2025],
            ['income_from' => 20833, 'income_to' => 33332, 'base_tax' => 0,    'rate_percent' => 20, 'effective_year' => 2025],
            ['income_from' => 33333, 'income_to' => null,  'base_tax' => 2500, 'rate_percent' => 25, 'effective_year' => 2025],
        ]);
    }
}

