<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_requirements', function (Blueprint $table) {
            $table->id('stud_reqs_id');
            $table->unsignedBigInteger('require_id')->default(0);
            $table->string('student_id', 12)->nullable();
            $table->string('schoolYear', 9)->default('-');
            $table->timestamps();

            $table->index('require_id');
            $table->index('student_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_requirements');
    }
};
