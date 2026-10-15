<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('waybills', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('branch_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedSmallInteger('number_year')->nullable();
            $table->unsignedInteger('number_seq')->nullable();
            $table->string('number', 30)->nullable();
            $table->string('status')->default('draft');
            $table->foreignId('vehicle_id')->constrained()->restrictOnDelete();
            $table->foreignId('trailer_id')->nullable()->constrained('vehicles')->restrictOnDelete();
            $table->foreignId('driver_id')->constrained()->restrictOnDelete();
            $table->string('route', 500);
            $table->text('notes')->nullable();
            $table->timestamp('planned_departure_at');
            $table->timestamp('planned_return_at')->nullable();
            $table->timestamp('departure_at')->nullable();
            $table->unsignedInteger('departure_odometer_km')->nullable();
            $table->foreignId('departure_reading_id')->nullable()->constrained('odometer_readings')->nullOnDelete();
            $table->timestamp('return_at')->nullable();
            $table->unsignedInteger('return_odometer_km')->nullable();
            $table->foreignId('return_reading_id')->nullable()->constrained('odometer_readings')->nullOnDelete();
            $table->unsignedInteger('distance_km')->nullable();
            $table->foreignId('issued_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('issued_at')->nullable();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('cancelled_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('idempotency_key', 64)->nullable();
            $table->timestamps();

            $table->unique(['organization_id', 'number_year', 'number_seq']);
            $table->unique(['organization_id', 'idempotency_key']);
            $table->index(['organization_id', 'status', 'planned_departure_at']);
            $table->index(['vehicle_id', 'status']);
            $table->index(['driver_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waybills');
    }
};
