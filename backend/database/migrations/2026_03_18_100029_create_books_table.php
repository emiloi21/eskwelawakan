<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('books', function (Blueprint $table) {
            $table->id('book_id');
            $table->string('book_title', 55)->nullable();
            $table->decimal('book_amt', 13, 2)->default(0.00);
            $table->string('gradeLevel', 25)->nullable();
            $table->string('strand', 55)->nullable();
            $table->string('schoolYear', 9)->nullable();
            $table->string('status', 15)->default('Active');
            $table->boolean('is_deleted')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('books');
    }
};
