<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('guidance_external_referrals', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->unsignedBigInteger('case_id');
            $table->string('agency_name');
            $table->enum('agency_type', [
                'dswd',
                'pnp_wcpd',
                'mental_health',
                'hospital',
                'ngo',
                'barangay',
                'lgu',
                'other',
            ]);
            $table->string('contact_person')->nullable();
            $table->string('contact_number', 30)->nullable();
            $table->text('reason_for_referral');
            $table->text('services_requested')->nullable();
            $table->date('referred_at');
            $table->boolean('school_head_cosigned')->default(false);
            $table->date('follow_up_date')->nullable();
            $table->text('outcome')->nullable();
            $table->enum('status', ['sent', 'accepted', 'in_progress', 'completed', 'declined'])->default('sent');
            $table->unsignedBigInteger('referred_by');
            $table->timestamps();

            $table->foreign('case_id')->references('id')->on('guidance_case_records')->onDelete('cascade');
            $table->foreign('referred_by')->references('id')->on('users')->onDelete('restrict');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('guidance_external_referrals');
    }
};
