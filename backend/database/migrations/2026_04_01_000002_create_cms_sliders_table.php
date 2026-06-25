<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cms_sliders', function (Blueprint $table) {
            $table->id();

            // Content
            $table->string('title');
            $table->string('subtitle')->nullable();

            // Background
            $table->string('bg_image')->nullable();          // storage path
            $table->string('bg_color', 7)->default('#1e40af'); // fallback solid color (hex)
            $table->string('bg_overlay_color', 7)->default('#000000');
            $table->unsignedTinyInteger('bg_overlay_opacity')->default(50); // 0–100

            // CTA Button 1
            $table->string('btn1_label')->nullable();
            $table->string('btn1_link')->nullable();
            $table->string('btn1_variant')->default('secondary'); // primary|secondary|outline|ghost

            // CTA Button 2
            $table->string('btn2_label')->nullable();
            $table->string('btn2_link')->nullable();
            $table->string('btn2_variant')->default('outline');

            // Layout
            $table->enum('text_align', ['left', 'center', 'right'])->default('center');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cms_sliders');
    }
};
