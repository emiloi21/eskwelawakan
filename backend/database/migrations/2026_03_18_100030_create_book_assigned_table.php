<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('book_assigned', function (Blueprint $table) {
            $table->id('b_a_id');
            $table->unsignedBigInteger('reg_id');
            $table->unsignedBigInteger('particular_id')->comment('student_other_fees - particular_id');
            $table->unsignedBigInteger('book_id');
            $table->decimal('book_amt', 13, 2)->default(0.00);
            $table->timestamps();

            $table->index('reg_id');
            $table->index('book_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('book_assigned');
    }
};
