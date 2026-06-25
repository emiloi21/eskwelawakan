<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('discount_codes', function (Blueprint $table) {
            $table->id('discount_code_id');
            $table->string('public_id', 26)->unique();
            $table->string('code', 50)->unique();
            $table->string('description', 255);
            $table->unsignedBigInteger('acct_discount_id')->index();
            $table->unsignedBigInteger('deduct_category_id')->index();
            $table->unsignedInteger('max_uses')->nullable();
            $table->unsignedInteger('uses_count')->default(0);
            $table->date('valid_from')->nullable();
            $table->date('valid_until')->nullable();
            $table->string('dept_restriction', 55)->nullable();
            $table->string('grade_level_restriction', 55)->nullable();
            $table->string('classification_restriction', 55)->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();
        });

        Schema::create('discount_code_redemptions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('discount_code_id')->index();
            $table->integer('reg_id')->index();
            $table->string('school_year', 9)->nullable();
            $table->timestamps();

            $table->unique(['discount_code_id', 'reg_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('discount_code_redemptions');
        Schema::dropIfExists('discount_codes');
    }
};
