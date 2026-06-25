<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guidance_anecdotal_records', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('reg_id');
            $table->string('observed_by_name');
            $table->string('observed_by_role')->default('Teacher'); // Teacher, Adviser, School Nurse, etc.
            $table->unsignedBigInteger('observed_by_user_id')->nullable(); // optional link to users table
            $table->date('observation_date');
            $table->string('location')->nullable(); // Classroom, Cafeteria, Corridor, etc.
            $table->text('behavior_description'); // Objective narrative of what was observed
            $table->text('interpretation')->nullable(); // Observer's notes/interpretation
            $table->unsignedBigInteger('filed_by'); // guidance counselor who accepted and filed it
            $table->timestamps();

            $table->foreign('reg_id')->references('reg_id')->on('students')->onDelete('cascade');
            $table->foreign('observed_by_user_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('filed_by')->references('id')->on('users')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guidance_anecdotal_records');
    }
};
