<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Library Categories ───────────────────────────────────────────────
        Schema::create('library_categories', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('name', 100)->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // ── Library Books (Catalog) ──────────────────────────────────────────
        Schema::create('library_books', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('isbn', 30)->nullable()->index();
            $table->string('title', 255);
            $table->string('author', 255);
            $table->string('publisher', 150)->nullable();
            $table->year('year_published')->nullable();
            $table->string('edition', 30)->nullable();
            $table->foreignId('category_id')->nullable()->constrained('library_categories')->nullOnDelete();
            $table->unsignedSmallInteger('total_copies')->default(1);
            $table->unsignedSmallInteger('available_copies')->default(1);
            $table->string('location', 100)->nullable()->comment('Shelf or section in library');
            $table->string('call_number', 60)->nullable()->comment('Dewey Decimal or local call number');
            $table->text('description')->nullable();
            $table->string('cover_photo')->nullable();
            $table->enum('status', ['Available', 'Out of Stock', 'Removed'])->default('Available');
            $table->timestamps();
            $table->softDeletes();
        });

        // ── Library Borrowings ───────────────────────────────────────────────
        Schema::create('library_borrowings', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->foreignId('book_id')->constrained('library_books')->cascadeOnDelete();
            $table->enum('borrower_type', ['student', 'personnel', 'teacher'])->default('student');
            $table->string('borrower_ref', 60)->nullable()->comment('student_id / employee_id');
            $table->string('borrower_name', 200)->comment('Denormalized name for quick display');
            $table->date('borrow_date');
            $table->date('due_date');
            $table->date('returned_date')->nullable();
            $table->decimal('fine_amount', 8, 2)->default(0)->comment('Computed overdue fine');
            $table->enum('status', ['Borrowed', 'Returned', 'Overdue', 'Lost'])->default('Borrowed');
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('received_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('library_borrowings');
        Schema::dropIfExists('library_books');
        Schema::dropIfExists('library_categories');
    }
};
