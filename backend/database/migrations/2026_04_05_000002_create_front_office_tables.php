<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Visitor Logs ─────────────────────────────────────────────────────
        Schema::create('visitor_logs', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('visitor_name', 150);
            $table->string('company_org', 150)->nullable();
            $table->string('purpose', 255);
            $table->string('host_name', 150)->nullable()->comment('Person they are visiting');
            $table->enum('id_type', ['PhilSys ID', 'Passport', 'Drivers License', 'UMID', 'Voters ID', 'Other'])->nullable();
            $table->string('id_number', 60)->nullable();
            $table->string('badge_no', 20)->nullable();
            $table->timestamp('check_in_at')->useCurrent();
            $table->timestamp('check_out_at')->nullable();
            $table->string('photo')->nullable();
            $table->enum('status', ['In', 'Out'])->default('In');
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // ── Gate Passes (students leaving campus) ────────────────────────────
        Schema::create('gate_passes', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('student_id');
            $table->foreign('student_id')->references('reg_id')->on('students')->cascadeOnDelete();
            $table->string('purpose', 255);
            $table->string('destination', 255)->nullable();
            $table->foreignId('authorized_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('issued_at')->useCurrent();
            $table->timestamp('expected_return')->nullable();
            $table->timestamp('actual_return')->nullable();
            $table->enum('status', ['Active', 'Returned', 'Expired'])->default('Active');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // ── Correspondence Logs ───────────────────────────────────────────────
        Schema::create('correspondence_logs', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->enum('direction', ['Incoming', 'Outgoing']);
            $table->string('reference_no', 60)->nullable()->index();
            $table->string('from_to', 200)->comment('Sender (Incoming) or Recipient (Outgoing)');
            $table->string('subject', 255);
            $table->string('category', 80)->nullable()->comment('e.g., Memoranda, Letter, Report');
            $table->date('document_date');
            $table->foreignId('handled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->date('follow_up_date')->nullable();
            $table->enum('status', ['Pending', 'Noted', 'Action Taken', 'Archived'])->default('Pending');
            $table->text('notes')->nullable();
            $table->string('file_path')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('correspondence_logs');
        Schema::dropIfExists('gate_passes');
        Schema::dropIfExists('visitor_logs');
    }
};
