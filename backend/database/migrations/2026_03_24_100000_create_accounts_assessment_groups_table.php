<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts_assessment_groups', function (Blueprint $table) {
            $table->id('assessment_group_id');
            $table->string('gradeLevel', 55)->default('-');
            $table->string('strand', 55)->default('N/A');
            $table->string('major', 55)->default('N/A');
            $table->string('schoolYear', 9)->default('-');
            $table->string('semester', 55)->default('N/A');
            // account_code field removed - not applicable for assessments
            $table->string('description', 255)->default('-');
            $table->decimal('totalAmount', 13, 2)->default(0.00);
            $table->timestamps();

            $table->index('schoolYear');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts_assessment_groups');
    }
};
