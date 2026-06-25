<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('early_warnings', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->string('warning_type', 100);
            $table->enum('severity', ['critical', 'warning', 'info'])->default('info');
            $table->text('message');
            $table->string('related_entity_type', 100)->nullable();
            $table->unsignedBigInteger('related_entity_id')->nullable();
            $table->boolean('is_acknowledged')->default(false);
            $table->foreignId('acknowledged_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('acknowledged_at')->nullable();
            $table->timestamp('triggered_at')->useCurrent();
            $table->timestamps();

            $table->index(['is_acknowledged', 'severity']);
            $table->index('warning_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('early_warnings');
    }
};
