<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('waybills', function (Blueprint $table) {
            $table->string('basis', 255)->nullable()->after('route');
            $table->decimal('departure_fuel_l', 8, 1)->nullable()->after('departure_odometer_km');
            $table->decimal('return_fuel_l', 8, 1)->nullable()->after('return_odometer_km');
            $table->decimal('fuel_added_l', 8, 1)->nullable()->after('return_fuel_l');
        });
    }

    public function down(): void
    {
        Schema::table('waybills', function (Blueprint $table) {
            $table->dropColumn(['basis', 'departure_fuel_l', 'return_fuel_l', 'fuel_added_l']);
        });
    }
};
