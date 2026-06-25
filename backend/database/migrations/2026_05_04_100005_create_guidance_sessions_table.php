<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guidance_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('case_id');
            $table->unsignedTinyInteger('session_number')->default(1);
            $table->date('session_date');
            $table->time('session_time')->nullable();
            $table->unsignedSmallInteger('duration_minutes')->nullable();
            $table->enum('session_type', ['individual', 'group', 'family', 'phone'])->default('individual');
            $table->string('approach_used')->nullable(); // Client-Centered, CBT, SFT, etc.
            $table->text('presenting_issues')->nullable();
            $table->text('interventions_done')->nullable();
            $table->text('response_to_intervention')->nullable();
            $table->enum('risk_level', ['none', 'low', 'moderate', 'high'])->default('none');
            $table->text('next_steps')->nullable();
            $table->date('follow_up_date')->nullable();
            $table->unsignedBigInteger('counselor_id');
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('guidance_case_records')->onDelete('cascade');
            $table->foreign('counselor_id')->references('id')->on('users')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guidance_sessions');
    }
};
