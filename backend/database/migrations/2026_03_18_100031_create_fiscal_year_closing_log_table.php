<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fiscal_year_closing_log', function (Blueprint $table) {
            $table->id('log_id');
            $table->string('schoolYear', 9);
            $table->integer('students_processed')->default(0);
            $table->decimal('total_amount_converted', 15, 2)->default(0.00);
            $table->integer('records_updated')->default(0);
            $table->unsignedBigInteger('processed_by')->nullable();
            $table->dateTime('processed_at')->useCurrent();
            $table->string('status', 20)->default('Completed')->comment('Completed, Failed, Partial');
            $table->text('error_message')->nullable();
            $table->timestamps();

            $table->index('schoolYear');
            $table->index('processed_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fiscal_year_closing_log');
    }
};
