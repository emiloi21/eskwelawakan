<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('requirements', function (Blueprint $table) {
            $table->id('require_id');
            $table->string('dept', 55)->nullable();
            $table->string('gradeLevel', 55)->nullable();
            $table->string('classification', 255)->nullable();
            $table->string('requirement_name', 255)->nullable();
            $table->string('description', 255)->nullable();
            $table->string('schoolYear', 9)->nullable();
            $table->string('type', 55)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('requirements');
    }
};
