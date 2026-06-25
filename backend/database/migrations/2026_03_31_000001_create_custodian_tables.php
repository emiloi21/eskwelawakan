<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Property Categories ──────────────────────────────────────────────
        Schema::create('property_categories', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('name', 100)->unique();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // ── Property Items (Fixed Assets) ────────────────────────────────────
        Schema::create('property_items', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('property_no', 60)->unique()->comment('Barcode / property tag number');
            $table->string('name', 150);
            $table->foreignId('category_id')->nullable()->constrained('property_categories')->nullOnDelete();
            $table->string('brand', 80)->nullable();
            $table->string('model', 80)->nullable();
            $table->string('serial_no', 100)->nullable();
            $table->enum('condition', ['Good', 'Fair', 'Poor', 'Condemned'])->default('Good');
            $table->enum('status', ['Active', 'In Repair', 'Disposed', 'Lost'])->default('Active');
            $table->string('location', 150)->nullable()->comment('Room/area where the item is kept');
            $table->date('date_acquired')->nullable();
            $table->decimal('acquisition_cost', 12, 2)->nullable();
            $table->unsignedTinyInteger('useful_life_years')->nullable();
            $table->string('assigned_to', 150)->nullable()->comment('Person/department responsible');
            $table->text('remarks')->nullable();
            $table->string('photo')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        // ── Consumable Categories ────────────────────────────────────────────
        Schema::create('consumable_categories', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('name', 100)->unique();
            $table->string('default_unit', 30)->default('pcs')->comment('Default unit of measure');
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // ── Consumable Items ─────────────────────────────────────────────────
        Schema::create('consumable_items', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('name', 150);
            $table->foreignId('category_id')->nullable()->constrained('consumable_categories')->nullOnDelete();
            $table->string('unit', 30)->default('pcs');
            $table->integer('quantity_on_hand')->default(0);
            $table->integer('reorder_point')->default(5)->comment('Alert when stock falls at or below this');
            $table->string('location', 150)->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        // ── Consumable Transactions ──────────────────────────────────────────
        Schema::create('consumable_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->foreignId('item_id')->constrained('consumable_items')->cascadeOnDelete();
            $table->enum('type', ['in', 'out', 'adjustment']);
            $table->integer('quantity')->comment('Signed quantity (negative for out/adjustments is stored as positive; type determines direction)');
            $table->string('reference_no', 80)->nullable();
            $table->text('remarks')->nullable();
            $table->foreignId('performed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('transacted_at')->useCurrent();
            $table->timestamps();
        });

        // ── Facilities ───────────────────────────────────────────────────────
        Schema::create('facilities', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('name', 150);
            $table->text('description')->nullable();
            $table->string('location', 150)->nullable();
            $table->unsignedSmallInteger('capacity')->nullable()->comment('Max number of people');
            $table->text('amenities')->nullable()->comment('Comma-separated or free text list');
            $table->enum('status', ['Available', 'Under Maintenance', 'Inactive'])->default('Available');
            $table->string('photo')->nullable();
            $table->timestamps();
        });

        // ── Facility Bookings ────────────────────────────────────────────────
        Schema::create('facility_bookings', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->foreignId('facility_id')->constrained('facilities')->cascadeOnDelete();
            $table->foreignId('requested_by')->constrained('users')->cascadeOnDelete();
            $table->string('title', 150)->comment('Event/activity title');
            $table->text('purpose')->nullable();
            $table->date('event_date');
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedSmallInteger('attendee_count')->nullable();
            $table->enum('status', ['Pending', 'Approved', 'Rejected', 'Cancelled'])->default('Pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('approver_remarks')->nullable();
            $table->text('notes')->nullable()->comment('Requester notes');
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('facility_bookings');
        Schema::dropIfExists('facilities');
        Schema::dropIfExists('consumable_transactions');
        Schema::dropIfExists('consumable_items');
        Schema::dropIfExists('consumable_categories');
        Schema::dropIfExists('property_items');
        Schema::dropIfExists('property_categories');
    }
};
