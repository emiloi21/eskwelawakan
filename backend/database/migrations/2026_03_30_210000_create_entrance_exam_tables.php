<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('entrance_exam_slots', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('school_year', 10)->index();
            $table->string('dept', 55)->nullable();
            $table->string('grade_level', 55)->nullable();
            $table->date('exam_date');
            $table->time('exam_time');
            $table->string('location', 200);
            $table->unsignedSmallInteger('capacity')->default(30);
            $table->text('notes')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['school_year', 'exam_date']);
        });

        Schema::create('entrance_exam_bookings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('slot_id');
            $table->string('reg_id', 50);
            $table->unsignedBigInteger('booked_by')->nullable();
            $table->string('result', 10)->nullable();   // null / Pass / Fail
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->unique(['slot_id', 'reg_id']);
            $table->foreign('slot_id')
                  ->references('id')
                  ->on('entrance_exam_slots')
                  ->cascadeOnDelete();
            $table->index('reg_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('entrance_exam_bookings');
        Schema::dropIfExists('entrance_exam_slots');
    }
};
