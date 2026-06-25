<?php

namespace Database\Seeders\Mock;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * MockDataSeeder — Master entry point for all mock data.
 *
 * Calls sub-seeders in dependency order:
 *  1. MockStudentsSeeder          — 5,000 students (5 SYs) + portal accounts + parent links
 *  2. MockGradeSchoolSeeder       — Grade School students: Kinder + Grade 1–6 (all SYs)
 *  3. MockAttendanceGradesSeeder  — Attendance + Q1/Q2 grades for 2025-2026 enrolled students
 *  4. MockAcademicHistorySeeder   — Q3/Q4 grades (2025-2026) + full annual grades (2021-2025)
 *  5. MockClinicCustodianSeeder   — Health records, clinic visits, property, consumables, facilities
 *  6. MockSupplyClearanceSeeder   — Supply requests, inventory checks, clearance templates + records
 *  7. MockHrmsPayrollSeeder       — HRMS leave apps, attendance logs, salary settings, payroll periods
 *  8. MockAccountingPaymentsSeeder— Assessment masters, student assessments, payments, journal entries
 *
 * Run:
 *   php artisan db:seed --class="Database\Seeders\Mock\MockDataSeeder"
 *
 * This seeder is ADDITIVE — it never truncates any table and is safe to run
 * on a database that already has production or test data.
 *
 * Re-run safety: each sub-seeder guards its tables with
 * count() > N checks and insertOrIgnore calls.
 */
class MockDataSeeder extends Seeder
{
    public function run(): void
    {
        $started = Carbon::now();

        $this->command->line('');
        $this->command->info('╔══════════════════════════════════════════════════════════════╗');
        $this->command->info('║         SVHS SMS — Mock Data Seeder v1.0                    ║');
        $this->command->info('║   Seeding realistic 5,000-student dataset across all modules ║');
        $this->command->info('╚══════════════════════════════════════════════════════════════╝');
        $this->command->line('');

        // ── 1. Students ──────────────────────────────────────────────────────
        $this->command->info('━━ [1/8] Students, Portal Accounts & Parent Links');
        $this->call(MockStudentsSeeder::class);
        $this->command->line('');

        // ── 2. Grade School students ─────────────────────────────────────────
        $this->command->info('━━ [2/8] Grade School Students (Kinder to Grade 6)');
        $this->call(MockGradeSchoolSeeder::class);
        $this->command->line('');

        // ── 3. Attendance & Grades (1st Semester) ────────────────────────────
        $this->command->info('━━ [3/8] Attendance & 1st Semester Grades (SY 2025-2026)');
        $this->call(MockAttendanceGradesSeeder::class);
        $this->command->line('');

        // ── 4. Academic History ──────────────────────────────────────────────
        $this->command->info('━━ [4/8] Academic History (2nd Sem 2025-2026 + full years 2021-2025)');
        $this->call(MockAcademicHistorySeeder::class);
        $this->command->line('');

        // ── 5. Clinic & Custodian ────────────────────────────────────────────
        $this->command->info('━━ [5/8] Clinic Records & Property Custodian');
        $this->call(MockClinicCustodianSeeder::class);
        $this->command->line('');

        // ── 6. Supply & Clearance ────────────────────────────────────────────
        $this->command->info('━━ [6/8] Supply Requests & Clearance');
        $this->call(MockSupplyClearanceSeeder::class);
        $this->command->line('');

        // ── 7. HRMS & Payroll ────────────────────────────────────────────────
        $this->command->info('━━ [7/8] HRMS Leave, Attendance & Payroll');
        $this->call(MockHrmsPayrollSeeder::class);
        $this->command->line('');

        // ── 8. Accounting & Payments ─────────────────────────────────────────
        $this->command->info('━━ [8/8] Accounting: Assessments, Payments & Journal Entries (all SYs)');
        $this->call(MockAccountingPaymentsSeeder::class);
        $this->command->line('');

        // ── Summary ──────────────────────────────────────────────────────────
        $elapsed = $started->diffInSeconds(Carbon::now());
        $this->printSummary($elapsed);
    }

    private function printSummary(int $elapsed): void
    {
        $students     = DB::table('students')->count();
        $users        = DB::table('users')->count();
        $parents      = DB::table('parent_students')->count();
        $attendance   = DB::table('attendance')->count();
        $grades       = DB::table('grades')->count();
        $clinicVisits = DB::table('clinic_visits')->count();
        $property     = DB::table('property_items')->count();
        $consumables  = DB::table('consumable_items')->count();
        $supplyReqs   = DB::table('supply_requests')->count();
        $clearance    = DB::table('clearance_records')->count();
        $payroll      = DB::table('payroll_periods')->count();
        $payments     = DB::table('student_payment_data')->count();
        $journals     = DB::table('journal_entries')->count();

        $this->command->line('');
        $this->command->info('╔══════════════════════════════════════════════════════════════╗');
        $this->command->info('║                  MOCK DATA SEEDER — SUMMARY                 ║');
        $this->command->info('╠══════════════════════════════════════════════════════════════╣');
        $this->command->info(sprintf('║  Students (all SYs)   : %6d                               ║', $students));
        $this->command->info(sprintf('║  Portal users         : %6d                               ║', $users));
        $this->command->info(sprintf('║  Parent-student links : %6d                               ║', $parents));
        $this->command->info(sprintf('║  Attendance records   : %6d                               ║', $attendance));
        $this->command->info(sprintf('║  Grade records        : %6d                               ║', $grades));
        $this->command->info(sprintf('║  Clinic visits        : %6d                               ║', $clinicVisits));
        $this->command->info(sprintf('║  Property items       : %6d                               ║', $property));
        $this->command->info(sprintf('║  Consumable items     : %6d                               ║', $consumables));
        $this->command->info(sprintf('║  Supply requests      : %6d                               ║', $supplyReqs));
        $this->command->info(sprintf('║  Clearance records    : %6d                               ║', $clearance));
        $this->command->info(sprintf('║  Payroll periods      : %6d                               ║', $payroll));
        $this->command->info(sprintf('║  Payment transactions : %6d                               ║', $payments));
        $this->command->info(sprintf('║  Journal entries      : %6d                               ║', $journals));
        $this->command->info('╠══════════════════════════════════════════════════════════════╣');
        $this->command->info(sprintf('║  Completed in %d seconds                                    ║', $elapsed));
        $this->command->info('╚══════════════════════════════════════════════════════════════╝');
        $this->command->line('');
    }
}
