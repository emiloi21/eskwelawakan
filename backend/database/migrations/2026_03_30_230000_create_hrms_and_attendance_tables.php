<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // HRMS Departments
        Schema::create('hrms_departments', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // HRMS Positions
        Schema::create('hrms_positions', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('name', 100);
            $table->unsignedBigInteger('department_id')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();

            $table->foreign('department_id')
                  ->references('id')->on('hrms_departments')
                  ->nullOnDelete();
        });

        // HRMS Personnel (school staff / employees)
        Schema::create('hrms_personnel', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('employee_id', 30)->unique();   // also used as barcode value
            $table->unsignedBigInteger('user_id')->nullable(); // linked portal account
            $table->string('fname', 100);
            $table->string('mname', 100)->nullable();
            $table->string('lname', 100);
            $table->unsignedBigInteger('department_id')->nullable();
            $table->unsignedBigInteger('position_id')->nullable();
            $table->enum('employment_type', ['Regular', 'Contractual', 'Part-time'])->default('Regular');
            $table->date('date_hired')->nullable();
            $table->date('date_separated')->nullable();
            $table->enum('status', ['Active', 'Inactive', 'On Leave'])->default('Active');
            $table->enum('gender', ['Male', 'Female'])->nullable();
            $table->date('birthdate')->nullable();
            $table->string('contact', 25)->nullable();
            $table->string('email', 150)->nullable();
            $table->text('address')->nullable();
            $table->string('emergency_contact_name', 150)->nullable();
            $table->string('emergency_contact_number', 25)->nullable();
            $table->string('photo', 255)->nullable();
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('department_id')->references('id')->on('hrms_departments')->nullOnDelete();
            $table->foreign('position_id')->references('id')->on('hrms_positions')->nullOnDelete();
        });

        // Leave types (Vacation, Sick, Emergency, etc.)
        Schema::create('leave_types', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('name', 80);
            $table->smallInteger('days_per_year')->default(5);
            $table->boolean('is_paid')->default(true);
            $table->timestamps();
        });

        // Leave applications
        Schema::create('leave_applications', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('personnel_id');
            $table->unsignedBigInteger('leave_type_id');
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('total_days', 4, 1);
            $table->text('reason')->nullable();
            $table->enum('status', ['Pending', 'Approved', 'Rejected'])->default('Pending');
            $table->unsignedBigInteger('approved_by')->nullable();
            $table->text('approver_remarks')->nullable();
            $table->timestamps();

            $table->foreign('personnel_id')->references('id')->on('hrms_personnel')->cascadeOnDelete();
            $table->foreign('leave_type_id')->references('id')->on('leave_types');
            $table->foreign('approved_by')->references('id')->on('users')->nullOnDelete();
        });

        // Attendance logs (students + personnel via kiosk or manual)
        Schema::create('attendance_logs', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->enum('entity_type', ['student', 'personnel']);
            $table->string('entity_id', 50);    // student_id or employee_id
            $table->timestamp('log_time');
            $table->enum('direction', ['in', 'out']);
            $table->enum('method', ['kiosk', 'manual'])->default('kiosk');
            $table->string('notes', 255)->nullable();
            $table->timestamps();

            $table->index(['entity_type', 'entity_id']);
            $table->index('log_time');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_logs');
        Schema::dropIfExists('leave_applications');
        Schema::dropIfExists('leave_types');
        Schema::dropIfExists('hrms_personnel');
        Schema::dropIfExists('hrms_positions');
        Schema::dropIfExists('hrms_departments');
    }
};
