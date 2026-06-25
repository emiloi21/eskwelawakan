<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guidance_student_profiles', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('reg_id');
            $table->unsignedBigInteger('school_year_id');
            // Family background
            $table->string('father_name')->nullable();
            $table->string('father_occupation')->nullable();
            $table->string('father_contact', 30)->nullable();
            $table->string('mother_name')->nullable();
            $table->string('mother_occupation')->nullable();
            $table->string('mother_contact', 30)->nullable();
            $table->string('guardian_name')->nullable();
            $table->string('guardian_relationship')->nullable();
            $table->string('guardian_contact', 30)->nullable();
            $table->enum('monthly_family_income', ['below_5k', '5k_10k', '10k_20k', '20k_50k', 'above_50k'])->nullable();
            $table->unsignedTinyInteger('siblings_count')->default(0);
            $table->unsignedTinyInteger('birth_order')->nullable();
            $table->enum('living_with', ['both_parents', 'mother_only', 'father_only', 'guardian', 'other'])->default('both_parents');
            // Health / special needs
            $table->text('health_conditions')->nullable();
            $table->text('special_needs')->nullable();
            // Interests / career
            $table->text('interests_hobbies')->nullable();
            $table->text('career_aspirations')->nullable();
            // Program flags
            $table->boolean('is_4ps_beneficiary')->default(false);
            $table->boolean('is_pwd')->default(false);
            $table->boolean('is_solo_parent_child')->default(false);
            // Meta
            $table->text('notes')->nullable();
            $table->unsignedBigInteger('completed_by')->nullable();
            $table->timestamps();

            $table->foreign('reg_id')->references('reg_id')->on('students')->onDelete('cascade');
            $table->foreign('school_year_id')->references('id')->on('school_years')->onDelete('cascade');
            $table->foreign('completed_by')->references('id')->on('users')->onDelete('set null');
            $table->unique(['reg_id', 'school_year_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guidance_student_profiles');
    }
};
