<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('personnel', function (Blueprint $table) {
            $table->id('personnel_id');
            $table->string('fname', 55)->default('-');
            $table->string('mname', 55)->default('-');
            $table->string('lname', 55)->default('-');
            $table->string('suffix', 5)->default('-');
            $table->string('classification', 55)->default('-');
            $table->string('position', 55)->default('-');
            $table->string('dept', 55)->default('-');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('personnel');
    }
};
