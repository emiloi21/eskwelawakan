<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Links a user account to a faculty/staff record (for Teacher portal)
            $table->unsignedBigInteger('personnel_id')->nullable()->after('profile_image');
            // Links a user account to a student record (for Student portal)
            $table->unsignedBigInteger('reg_id')->nullable()->after('personnel_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['personnel_id', 'reg_id']);
        });
    }
};
