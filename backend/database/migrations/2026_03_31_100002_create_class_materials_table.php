<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_materials', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('class_id');
            $table->unsignedBigInteger('user_id');   // teacher who uploaded
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->string('file_path');             // relative path on public disk
            $table->string('file_name');             // original filename
            $table->unsignedBigInteger('file_size'); // bytes
            $table->string('mime_type', 100);
            $table->timestamps();

            $table->foreign('class_id')
                  ->references('class_id')
                  ->on('classes')
                  ->cascadeOnDelete();

            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->cascadeOnDelete();

            $table->index(['class_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_materials');
    }
};
