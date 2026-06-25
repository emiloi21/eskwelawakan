<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('hrms_personnel', function (Blueprint $table) {
            // 4–6 digit numeric PIN for kiosk time-in (unique so no collisions)
            $table->unsignedSmallInteger('pin_code')->nullable()->unique()->after('employee_id');
        });
    }

    public function down(): void
    {
        Schema::table('hrms_personnel', function (Blueprint $table) {
            $table->dropColumn('pin_code');
        });
    }
};
