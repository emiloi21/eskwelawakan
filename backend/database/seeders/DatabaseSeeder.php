<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\SchoolPreference;
use App\Models\SchoolYear;
use App\Models\Personnel;
use App\Models\ClassModel;
use App\Models\Student;
use App\Models\AccountsAssessment;
use App\Models\AccountsCategory;
use App\Models\AccountsParticular;
use App\Models\AccountsCatParticular;
use App\Models\ReceiptGen;
use App\Models\IdcodeGen;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // All staff/system user accounts (idempotent — uses firstOrCreate)
        $this->call(StaffAccountsSeeder::class);

        // School preferences
        SchoolPreference::create([
            'deped_id' => '305432',
            'region' => 'Region IV-A',
            'division' => 'Laguna',
            'schoolName' => 'St. Vincent High School',
            'address' => 'Sample Address, Laguna',
            'emailAddress' => 'info@svhs.edu.ph',
            'contactNumber' => '09123456789',
            'activeSchoolYear' => '2025-2026',
            'activeSemester' => '1st Semester',
        ]);

        // School years
        SchoolYear::create([
            'school_year' => '2024-2025',
            'status' => 'Inactive',
            'fy_closed' => true,
            'fy_closed_at' => now(),
        ]);

        SchoolYear::create([
            'school_year' => '2025-2026',
            'status' => 'Active',
        ]);

        // Personnel
        $personnel = Personnel::create([
            'fname' => 'Juan',
            'lname' => 'Dela Cruz',
            'classification' => 'Teaching',
            'position' => 'Adviser',
            'dept' => 'Senior High School',
        ]);

        // Class
        $class = ClassModel::create([
            'gradeLevel' => 'Grade 11',
            'strand' => 'STEM',
            'section' => 'Section A',
            'dept' => 'Senior High School',
            'adviser_id' => $personnel->personnel_id,
            'adviser' => 'Dela Cruz, Juan',
            'schoolYear' => '2025-2026',
            'semester' => '1st Semester',
        ]);

        // Assessment
        $assessment = AccountsAssessment::create([
            'dept' => 'Senior High School',
            'gradeLevel' => 'Grade 11',
            'strand' => 'STEM',
            'schoolYear' => '2025-2026',
            'coverage' => 'Full Year',
            'description' => 'SHS Grade 11 STEM Assessment',
        ]);

        // Category
        $category = AccountsCategory::create([
            'gradeLevel' => 'Grade 11',
            'strand' => 'STEM',
            'schoolYear' => '2025-2026',
            'account_code' => 'TF-001',
            'description' => 'Tuition Fee',
            'totalAmount' => 25000.00,
        ]);

        // Particular
        $particular = AccountsParticular::create([
            'gradeLevel' => 'Grade 11',
            'strand' => 'STEM',
            'schoolYear' => '2025-2026',
            'semester' => '1st Semester',
            'account_code' => 'TF-001',
            'description' => 'Tuition Fee',
            'amount' => 25000.00,
        ]);

        // Cat <-> Particular mapping
        AccountsCatParticular::create([
            'category_id' => $category->category_id,
            'particular_id' => $particular->particular_id,
            'account_code' => 'TF-001',
            'description' => 'Tuition Fee',
            'amount' => 25000.00,
            'paymentTerm' => 2, // Monthly — Tuition Fee
            'schoolYear' => '2025-2026',
            'semester' => '1st Semester',
        ]);

        // Student
        Student::create([
            'lrn' => '123456789012',
            'student_id' => 'SHS-2025-0001',
            'lname' => 'Santos',
            'fname' => 'Maria',
            'mname' => 'Garcia',
            'suffix' => '',
            'bdMM' => '05',
            'bdDD' => '15',
            'bdYYYY' => '2008',
            'sex' => 'Female',
            'age' => 17,
            'address_street' => '123 Sample St',
            'address_brgy' => 'Brgy. Sample',
            'address_city_mun' => 'Sample City',
            'address_province' => 'Laguna',
            'guardian_lname' => 'Santos',
            'guardian_fname' => 'Pedro',
            'guardian_contact' => '09191234567',
            'guardian_relation' => 'Father',
            'last_school' => 'Sample Elementary School',
            'last_school_sy' => '2023-2024',
            'last_school_type' => 'Public',
            'class_id' => $class->class_id,
            'dept' => 'Senior High School',
            'gradeLevel' => 'Grade 11',
            'strand' => 'STEM',
            'section' => 'Section A',
            'classification' => 'New',
            'schoolYear' => '2025-2026',
            'appDate' => '2025-06-01',
            'appTime' => '08:00 AM',
            'assessment_id' => $assessment->assessment_id,
            'status' => 'Enrolled',
        ]);

        // Receipt counter
        ReceiptGen::create(['current_or' => 1000]);

        // ID code generator
        IdcodeGen::create([
            'dept' => 'Senior High School',
            'prefix' => 'SHS',
            'last_idNum' => 5, // bumped to account for TestDataSeeder students
        ]);

        // Comprehensive test data (teachers, students, parents, assessments)
        $this->call(TestDataSeeder::class);

        // ── Optional: 5,000-student mock dataset for full-system testing ──────
        // Run separately for performance:
        //   php artisan db:seed --class="Database\Seeders\Mock\MockDataSeeder"
    }
}
