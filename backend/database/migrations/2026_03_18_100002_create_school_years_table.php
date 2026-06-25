<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_years', function (Blueprint $table) {
            $table->id();
            $table->string('school_year', 9)->unique(); // e.g., 2025-2026
            $table->string('status', 10)->default('Inactive'); // Active, Inactive
            $table->date('fy_start_date')->nullable();
            $table->date('fy_end_date')->nullable();
            $table->boolean('fy_closed')->default(false);
            $table->dateTime('fy_closed_at')->nullable();
            $table->unsignedBigInteger('fy_closed_by')->nullable();
            $table->timestamps();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_years');
    }
};
