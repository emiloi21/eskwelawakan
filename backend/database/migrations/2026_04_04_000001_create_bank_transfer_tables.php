<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // School's bank / e-wallet accounts shown to students for manual transfers
        Schema::create('bank_ewallet_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->enum('account_type', ['bank', 'ewallet']);
            $table->string('provider_name', 100);   // e.g. BDO, BPI, GCash, Maya
            $table->string('account_name', 200);
            $table->string('account_number', 100);
            $table->string('branch', 200)->nullable();         // for banks
            $table->string('qr_code_image', 500)->nullable();  // storage path
            $table->text('instructions')->nullable();           // custom note to student
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        // Student / parent payment upload requests awaiting cashier validation
        Schema::create('bank_transfer_requests', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 26)->unique();
            $table->string('reg_id', 20)->index();
            $table->foreignId('submitted_by')->constrained('users');
            $table->string('school_year', 20);
            $table->decimal('amount', 10, 2);
            $table->foreignId('payment_channel_id')->constrained('bank_ewallet_accounts');
            $table->string('reference_number', 200);
            $table->date('transfer_date');
            $table->text('notes')->nullable();
            $table->string('receipt_path', 500);
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->index();
            $table->text('rejection_reason')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users');
            $table->timestamp('reviewed_at')->nullable();
            $table->string('receipt_num', 20)->nullable();  // linked receipt after approval
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bank_transfer_requests');
        Schema::dropIfExists('bank_ewallet_accounts');
    }
};
