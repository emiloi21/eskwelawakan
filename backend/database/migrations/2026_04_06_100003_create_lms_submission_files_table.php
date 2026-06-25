<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lms_submission_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('submission_id')->constrained('lms_submissions')->cascadeOnDelete();
            $table->string('original_name');
            $table->string('stored_path', 500);
            $table->string('file_type', 80)->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lms_submission_files');
    }
};
