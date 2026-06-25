<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attendance', function (Blueprint $table) {
            $table->id('attendance_id');
            $table->unsignedBigInteger('reg_id');   // student
            $table->unsignedBigInteger('class_id'); // class/section
            $table->date('date');
            $table->enum('status', ['Present', 'Absent', 'Late', 'Excused', 'Half Day'])->default('Present');
            $table->string('remarks', 255)->nullable();
            $table->timestamps();

            $table->unique(['reg_id', 'class_id', 'date']);
            $table->index('class_id');
            $table->index('date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance');
    }
};
