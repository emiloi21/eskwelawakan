<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Student Health Records (one per student) ──────────────────────────
        Schema::create('student_health_records', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('student_id')->unique();
            $table->foreign('student_id')->references('reg_id')->on('students')->cascadeOnDelete();
            $table->string('blood_type', 5)->nullable()->comment('A+, A-, B+, B-, O+, O-, AB+, AB-');
            $table->decimal('height_cm', 5, 1)->nullable();
            $table->decimal('weight_kg', 5, 1)->nullable();
            $table->string('vision_left', 20)->nullable()->comment('e.g., 20/20');
            $table->string('vision_right', 20)->nullable();
            $table->enum('hearing_left', ['Normal', 'Mild Loss', 'Moderate Loss', 'Severe Loss'])->nullable();
            $table->enum('hearing_right', ['Normal', 'Mild Loss', 'Moderate Loss', 'Severe Loss'])->nullable();
            $table->text('medical_conditions')->nullable()->comment('Chronic illnesses, disabilities');
            $table->text('allergies')->nullable();
            $table->text('current_medications')->nullable();
            $table->json('vaccination_records')->nullable()->comment('[{vaccine, date, administered_by}]');
            $table->date('last_physical_exam')->nullable();
            $table->string('philhealth_no', 30)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // ── Clinic Visits ────────────────────────────────────────────────────
        Schema::create('clinic_visits', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('student_id');
            $table->foreign('student_id')->references('reg_id')->on('students')->cascadeOnDelete();
            $table->date('visit_date');
            $table->time('visit_time')->nullable();
            $table->text('complaint');
            $table->text('diagnosis')->nullable();
            $table->text('treatment_given')->nullable();
            $table->text('medicine_given')->nullable();
            $table->json('vital_signs')->nullable()->comment('{temperature, blood_pressure, pulse_rate, respiratory_rate}');
            $table->string('referred_to', 150)->nullable()->comment('If referred to hospital/specialist');
            $table->enum('disposition', ['Released', 'Sent Home', 'Referred to Hospital', 'Admitted'])->default('Released');
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // ── Health Incidents ─────────────────────────────────────────────────
        Schema::create('health_incidents', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('student_id');
            $table->foreign('student_id')->references('reg_id')->on('students')->cascadeOnDelete();
            $table->enum('incident_type', ['Accident', 'Illness', 'Injury', 'Allergy', 'Other'])->default('Accident');
            $table->dateTime('incident_datetime');
            $table->string('location', 150)->nullable()->comment('e.g., Classroom, Gymnasium');
            $table->text('description');
            $table->text('first_aid_given')->nullable();
            $table->boolean('referred_to_hospital')->default(false);
            $table->string('hospital_name', 150)->nullable();
            $table->text('witnesses')->nullable();
            $table->foreignId('reported_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ['Open', 'Closed', 'Under Follow-up'])->default('Open');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('health_incidents');
        Schema::dropIfExists('clinic_visits');
        Schema::dropIfExists('student_health_records');
    }
};
