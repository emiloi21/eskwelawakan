<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_codes', function (Blueprint $table) {
            $table->id('ac_id');
            $table->string('gradeLevel', 55)->nullable();
            $table->string('account_group', 55)->nullable();
            $table->string('account_code', 15)->nullable();
            $table->string('description', 255)->nullable();
            $table->decimal('amt_paid', 13, 2)->default(0.00);
            $table->string('payment_type', 55)->nullable();
            $table->unsignedBigInteger('personnel_user_id')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_codes');
    }
};
