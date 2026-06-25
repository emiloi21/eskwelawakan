<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // SOAP progress notes — one per session
        Schema::create('guidance_case_notes', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('session_id');
            $table->unsignedBigInteger('case_id');
            $table->date('note_date');
            $table->text('subjective');   // S — what the client reported/expressed
            $table->text('objective');    // O — counselor's observations
            $table->text('assessment');   // A — clinical impression, risk
            $table->text('plan');         // P — next steps, homework, referral
            $table->unsignedBigInteger('written_by');
            $table->timestamps();

            $table->foreign('session_id')->references('id')->on('guidance_sessions')->onDelete('cascade');
            $table->foreign('case_id')->references('id')->on('guidance_case_records')->onDelete('cascade');
            $table->foreign('written_by')->references('id')->on('users')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guidance_case_notes');
    }
};
