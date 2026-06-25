<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guidance_psych_tests', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('case_id');
            $table->unsignedBigInteger('reg_id');
            $table->string('test_name'); // e.g. "Study Habits Inventory", "Holland RIASEC", "PHQ-9"
            $table->date('test_date');
            $table->unsignedBigInteger('administered_by');
            $table->decimal('raw_score', 8, 2)->nullable();
            $table->decimal('scaled_score', 8, 2)->nullable();
            $table->string('score_interpretation')->nullable(); // e.g. "Average", "Above Average", "Moderate Anxiety"
            $table->text('full_interpretation')->nullable(); // narrative interpretation
            $table->text('recommendations')->nullable();
            $table->boolean('feedback_given')->default(false);
            $table->date('feedback_date')->nullable();
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('guidance_case_records')->onDelete('cascade');
            $table->foreign('reg_id')->references('reg_id')->on('students')->onDelete('cascade');
            $table->foreign('administered_by')->references('id')->on('users')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guidance_psych_tests');
    }
};
