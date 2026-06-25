<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('faculty_staff', function (Blueprint $table) {
            $table->id('personnel_id');
            $table->string('img', 255)->default('img/nfc.png');
            $table->string('fullname', 255)->default('-');
            $table->mediumText('description');
            $table->string('classification', 25)->default('Grade School');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('faculty_staff');
    }
};
