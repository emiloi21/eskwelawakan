<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guidance_referrals', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('reg_id');
            $table->unsignedBigInteger('case_id')->nullable(); // populated when converted to a case
            $table->enum('referral_type', ['self', 'teacher', 'parent', 'admin', 'nurse']);
            $table->string('referrer_name');
            $table->string('referrer_role')->nullable(); // Subject Teacher, Class Adviser, Principal, etc.
            $table->unsignedBigInteger('referrer_user_id')->nullable();
            $table->text('concern_description');
            $table->enum('urgency', ['routine', 'urgent', 'crisis'])->default('routine');
            $table->date('referred_at');
            $table->timestamp('acknowledged_at')->nullable();
            $table->unsignedBigInteger('acknowledged_by')->nullable();
            $table->text('action_taken')->nullable();
            $table->enum('status', ['pending', 'acknowledged', 'converted_to_case', 'declined'])->default('pending');
            $table->timestamps();

            $table->foreign('reg_id')->references('reg_id')->on('students')->onDelete('cascade');
            $table->foreign('case_id')->references('id')->on('guidance_case_records')->onDelete('set null');
            $table->foreign('referrer_user_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('acknowledged_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guidance_referrals');
    }
};
