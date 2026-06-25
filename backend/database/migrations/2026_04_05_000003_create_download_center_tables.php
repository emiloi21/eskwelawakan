<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Download Categories ──────────────────────────────────────────────
        Schema::create('download_categories', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('name', 100)->unique();
            $table->text('description')->nullable();
            $table->unsignedTinyInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // ── Download Files ───────────────────────────────────────────────────
        Schema::create('download_files', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->foreignId('category_id')->nullable()->constrained('download_categories')->nullOnDelete();
            $table->string('title', 255);
            $table->text('description')->nullable();
            $table->string('file_path', 500);
            $table->string('file_name', 255)->comment('Original filename for download');
            $table->string('file_type', 20)->nullable()->comment('pdf, docx, xlsx, etc.');
            $table->unsignedBigInteger('file_size')->default(0)->comment('Bytes');
            $table->unsignedInteger('download_count')->default(0);
            $table->enum('visibility', ['Public', 'Authenticated', 'Staff Only', 'Admin Only'])
                  ->default('Authenticated')
                  ->comment('Public = no login needed; Authenticated = any logged-in user; Staff Only = staff roles; Admin Only = Administrator');
            $table->string('school_year', 9)->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('uploaded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('download_files');
        Schema::dropIfExists('download_categories');
    }
};
