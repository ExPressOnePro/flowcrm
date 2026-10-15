<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicle_couplings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('tractor_id')->constrained('vehicles')->restrictOnDelete();
            $table->foreignId('trailer_id')->constrained('vehicles')->restrictOnDelete();
            $table->unsignedTinyInteger('position')->default(1);
            $table->timestamp('coupled_at');
            $table->timestamp('uncoupled_at')->nullable();
            $table->foreignId('coupled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('uncoupled_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['tractor_id', 'uncoupled_at']);
            $table->index(['trailer_id', 'uncoupled_at']);
            $table->index(['organization_id', 'coupled_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vehicle_couplings');
    }
};
