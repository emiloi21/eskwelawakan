<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dss_recommendations', function (Blueprint $table) {
            $table->id();
            $table->string('public_id', 20)->unique();
            $table->text('recommendation_text');
            $table->enum('category', ['enrollment', 'academic', 'faculty', 'resource', 'general'])->default('general');
            $table->enum('priority', ['high', 'medium', 'low'])->default('medium');
            $table->text('basis');
            $table->foreignId('related_warning_id')->nullable()->constrained('early_warnings')->nullOnDelete();
            $table->boolean('is_actioned')->default(false);
            $table->foreignId('actioned_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('actioned_at')->nullable();
            $table->timestamp('generated_at')->useCurrent();
            $table->timestamps();

            $table->index(['is_actioned', 'priority']);
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dss_recommendations');
    }
};
