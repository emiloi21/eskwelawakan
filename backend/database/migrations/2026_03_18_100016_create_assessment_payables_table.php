<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_payables', function (Blueprint $table) {
            $table->id('assess_payable_id');
            $table->unsignedBigInteger('assessment_id')->default(0);
            $table->unsignedBigInteger('category_id')->default(0);
            $table->decimal('total_amt_payable', 13, 2)->default(0.00);
            $table->string('schoolYear', 9)->default('-');
            $table->timestamps();

            $table->index('assessment_id');
            $table->index('schoolYear');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_payables');
    }
};
