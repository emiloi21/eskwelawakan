<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_interventions', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('student_id');
            $table->foreign('student_id')->references('reg_id')->on('students')->cascadeOnDelete();
            $table->foreignId('school_year_id')->constrained('school_years')->cascadeOnDelete();
            $table->text('flagged_reason');
            $table->enum('intervention_status', ['flagged', 'under_intervention', 'resolved'])->default('flagged');
            $table->text('notes')->nullable();
            $table->foreignId('flagged_by')->constrained('users')->cascadeOnDelete();
            $table->timestamp('flagged_at')->useCurrent();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['student_id', 'school_year_id']);
            $table->index('intervention_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_interventions');
    }
};
