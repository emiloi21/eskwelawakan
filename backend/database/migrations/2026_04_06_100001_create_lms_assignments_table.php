<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lms_assignments', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('class_id');            // FK → classes.class_id
            $table->unsignedBigInteger('created_by');          // FK → users.id (teacher)
            $table->enum('type', ['assignment', 'quiz', 'material'])->default('assignment');
            $table->string('title');
            $table->longText('instructions')->nullable();
            $table->decimal('points', 6, 2)->nullable();
            $table->timestamp('due_date')->nullable();
            $table->string('topic', 100)->nullable();           // grouping label e.g. "Week 1"
            $table->boolean('allow_late')->default(true);
            $table->timestamps();

            $table->foreign('class_id')->references('class_id')->on('classes')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lms_assignments');
    }
};
