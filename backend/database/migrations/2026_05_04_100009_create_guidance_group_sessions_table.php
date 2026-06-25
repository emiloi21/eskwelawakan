<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guidance_group_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('school_year_id');
            $table->string('session_title');
            $table->enum('session_type', [
                'group_counseling',
                'psychoeducational',
                'career_guidance',
                'information',
                'values_formation',
                'homeroom_guidance',
            ]);
            $table->string('target_group')->nullable(); // e.g. "Grade 10 students with peer conflict"
            $table->date('session_date');
            $table->time('start_time')->nullable();
            $table->time('end_time')->nullable();
            $table->string('venue')->nullable();
            $table->unsignedBigInteger('facilitator_id');
            $table->text('objectives')->nullable();
            $table->text('activities')->nullable();
            $table->text('observations')->nullable();
            $table->unsignedSmallInteger('attendee_count')->default(0);
            $table->timestamps();

            $table->foreign('school_year_id')->references('id')->on('school_years')->onDelete('cascade');
            $table->foreign('facilitator_id')->references('id')->on('users')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guidance_group_sessions');
    }
};
