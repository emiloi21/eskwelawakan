<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('student_requirements', function (Blueprint $table) {
            $table->unsignedBigInteger('reg_id')->default(0)->after('student_id');
            $table->string('status', 25)->default('For Validation')->after('schoolYear');
            $table->string('file_path', 255)->nullable()->after('status');
            $table->string('remarks', 255)->nullable()->after('file_path');

            $table->index('reg_id');
        });
    }

    public function down(): void
    {
        Schema::table('student_requirements', function (Blueprint $table) {
            $table->dropIndex(['reg_id']);
            $table->dropColumn(['reg_id', 'status', 'file_path', 'remarks']);
        });
    }
};
