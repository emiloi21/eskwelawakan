<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('classes', function (Blueprint $table) {
            $table->id('class_id');
            $table->string('gradeLevel', 255)->default('-');
            $table->string('strand', 255)->default('-');
            $table->string('major', 55)->default('N/A');
            $table->string('section', 255)->default('-');
            $table->string('dept', 55)->default('-');
            $table->unsignedBigInteger('adviser_id')->default(0);
            $table->string('adviser', 255)->default('-');
            $table->string('schoolYear', 9)->default('-');
            $table->string('semester', 255)->default('-');
            $table->timestamps();

            $table->index('schoolYear');
            $table->index('dept');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('classes');
    }
};
