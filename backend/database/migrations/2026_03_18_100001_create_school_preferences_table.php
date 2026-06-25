<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('school_preferences', function (Blueprint $table) {
            $table->id();
            $table->string('deped_id', 20)->nullable();
            $table->string('logo')->nullable();
            $table->string('region', 100)->nullable();
            $table->string('division', 100)->nullable();
            $table->string('schoolName', 255);
            $table->string('address', 500)->nullable();
            $table->string('emailAddress', 255)->nullable();
            $table->string('contactNumber', 50)->nullable();
            $table->string('activeSchoolYear', 9)->nullable();
            $table->string('activeSemester', 55)->nullable();
            $table->string('slide_bg_img', 255)->default('-');
            $table->boolean('fy_closed')->default(false);
            $table->dateTime('fy_closed_at')->nullable();
            $table->unsignedBigInteger('fy_closed_by')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('school_preferences');
    }
};
