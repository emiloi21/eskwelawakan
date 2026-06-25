<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Supply Requests ──────────────────────────────────────────────────
        Schema::create('supply_requests', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->foreignId('requester_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['Pending', 'Approved', 'Rejected', 'Fulfilled', 'Cancelled'])->default('Pending');
            $table->string('purpose', 200)->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('reviewed_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->text('reviewer_remarks')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('fulfilled_at')->nullable();
            $table->timestamps();
        });

        Schema::create('supply_request_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('request_id')->constrained('supply_requests')->cascadeOnDelete();
            $table->foreignId('item_id')->nullable()->constrained('consumable_items')->nullOnDelete();
            $table->string('item_name', 200)->comment('Denormalized name; also used for free-text requests');
            $table->string('unit', 30)->default('pcs');
            $table->unsignedInteger('quantity_requested');
            $table->unsignedInteger('quantity_fulfilled')->default(0);
            $table->text('remarks')->nullable();
        });

        // ── Year-End Inventory ───────────────────────────────────────────────
        Schema::create('inventory_checks', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('title', 200)->comment('e.g. Room 101 Annual Inventory 2025-2026');
            $table->string('school_year', 20);
            $table->string('location', 150)->comment('Room / office');
            $table->foreignId('assigned_to_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['Pending', 'In Progress', 'Submitted', 'Reviewed'])->default('Pending');
            $table->date('due_date')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->text('assignee_remarks')->nullable();
            $table->foreignId('reviewed_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('custodian_remarks')->nullable();
            $table->timestamps();
        });

        Schema::create('inventory_check_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('check_id')->constrained('inventory_checks')->cascadeOnDelete();
            $table->foreignId('item_id')->nullable()->constrained('property_items')->nullOnDelete();
            $table->string('item_name', 200);
            $table->string('property_no', 60)->nullable();
            $table->unsignedInteger('expected_quantity')->default(1);
            $table->unsignedInteger('counted_quantity')->nullable()->comment('Filled by assignee');
            $table->enum('condition_found', ['Good', 'Fair', 'Poor', 'Missing'])->nullable();
            $table->text('remarks')->nullable();
        });

        // ── Digital Clearance ────────────────────────────────────────────────
        Schema::create('clearance_templates', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('name', 200);
            $table->string('school_year', 20);
            $table->enum('for_type', ['Student', 'Personnel', 'Both'])->default('Both');
            $table->boolean('is_active')->default(false);
            $table->foreignId('created_by_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();
        });

        Schema::create('clearance_template_offices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('clearance_templates')->cascadeOnDelete();
            $table->string('office_name', 100)->comment('e.g. Library, Cashier, Registrar');
            $table->string('responsible_role', 60)->comment('Access role that can sign this office');
            $table->text('description')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(1);
        });

        Schema::create('clearance_records', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->foreignId('template_id')->constrained('clearance_templates')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['Applied', 'In Progress', 'Complete', 'Rejected'])->default('Applied');
            $table->text('notes')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->unique(['template_id', 'user_id']);
        });

        Schema::create('clearance_record_offices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('record_id')->constrained('clearance_records')->cascadeOnDelete();
            $table->foreignId('office_id')->constrained('clearance_template_offices')->cascadeOnDelete();
            $table->string('office_name', 100)->comment('Denormalized');
            $table->enum('status', ['Pending', 'Cleared', 'Returned'])->default('Pending');
            $table->foreignId('cleared_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cleared_at')->nullable();
            $table->text('remarks')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clearance_record_offices');
        Schema::dropIfExists('clearance_records');
        Schema::dropIfExists('clearance_template_offices');
        Schema::dropIfExists('clearance_templates');
        Schema::dropIfExists('inventory_check_items');
        Schema::dropIfExists('inventory_checks');
        Schema::dropIfExists('supply_request_items');
        Schema::dropIfExists('supply_requests');
    }
};
