<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_terms', function (Blueprint $table) {
            $table->id('pterm_id');
            $table->string('payment_term', 55)->default('-');
            $table->string('category', 55)->default('-');
            $table->string('month_set_up', 2)->default('-');
            $table->string('year_set_up', 4)->default('-');
            $table->string('dept', 55)->default('-');
            $table->string('schoolYear', 9);
            $table->timestamps();

            $table->index('schoolYear');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_terms');
    }
};
