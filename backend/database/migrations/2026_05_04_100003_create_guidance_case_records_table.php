<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guidance_case_records', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('reg_id');
            $table->unsignedBigInteger('school_year_id');
            $table->string('case_number', 30)->unique(); // e.g. GC-2026-0001
            $table->enum('case_type', [
                'academic',
                'behavioral',
                'personal_social',
                'career',
                'family',
                'crisis',
                'child_protection',
            ]);
            $table->text('presenting_concern');
            $table->enum('urgency', ['routine', 'urgent', 'crisis'])->default('routine');
            $table->enum('status', [
                'open',
                'ongoing',
                'resolved',
                'referred_external',
                'referred_cpc',
                'closed_transferred',
                'closed_withdrawn',
            ])->default('open');
            $table->unsignedBigInteger('assigned_counselor_id');
            $table->boolean('parent_notified')->default(false);
            $table->timestamp('parent_notified_at')->nullable();
            $table->timestamp('opened_at')->useCurrent();
            $table->timestamp('closed_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->foreign('reg_id')->references('reg_id')->on('students')->onDelete('cascade');
            $table->foreign('school_year_id')->references('id')->on('school_years')->onDelete('cascade');
            $table->foreign('assigned_counselor_id')->references('id')->on('users')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guidance_case_records');
    }
};
