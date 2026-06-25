<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accounts_categories', function (Blueprint $table) {
            $table->string('semester', 55)->default('N/A')->after('schoolYear');
        });
    }

    public function down(): void
    {
        Schema::table('accounts_categories', function (Blueprint $table) {
            $table->dropColumn('semester');
        });
    }
};
