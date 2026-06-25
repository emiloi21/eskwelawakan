<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lms_discussion_replies', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('discussion_id');
            $table->unsignedBigInteger('user_id');
            $table->longText('body');
            $table->timestamps();

            $table->foreign('discussion_id')->references('id')->on('lms_discussions')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lms_discussion_replies');
    }
};
