<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('refund_requests', function (Blueprint $table) {
            $table->id('refund_id');
            $table->unsignedBigInteger('reg_id');
            $table->unsignedBigInteger('category_id');
            $table->decimal('amt_excess', 13, 2);
            $table->dateTime('date_time')->useCurrent();
            $table->unsignedBigInteger('personnel_user_id');
            $table->string('status', 15)->default('On Process');
            $table->timestamps();

            $table->index('reg_id');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refund_requests');
    }
};
