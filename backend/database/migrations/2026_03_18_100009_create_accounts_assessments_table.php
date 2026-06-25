<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts_assessments', function (Blueprint $table) {
            $table->id('assessment_id');
            $table->string('dept', 55)->default('-');
            $table->string('gradeLevel', 55)->default('-');
            $table->string('strand', 55)->default('-');
            $table->string('major', 55)->default('N/A');
            $table->string('schoolYear', 9)->default('-');
            $table->string('coverage', 55)->default('-');
            $table->string('description', 255)->default('-');
            $table->timestamps();

            $table->index('schoolYear');
            $table->index('dept');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts_assessments');
    }
};
