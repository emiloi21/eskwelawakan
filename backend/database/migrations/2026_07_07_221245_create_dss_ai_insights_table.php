<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dss_ai_insights', function (Blueprint $table) {
            $table->id();
            $table->string('insight_type'); // e.g., 'dashboard', 'enrollment', 'academic'
            $table->string('school_year', 9); // e.g., '2025-2026'
            $table->string('semester', 25);
            $table->json('metrics_snapshot'); // The raw data fed to the algorithm
            $table->longText('explanation'); // Narrative text or markdown analysis
            $table->json('predictions')->nullable(); // Projected data storage
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dss_ai_insights');
    }
};