<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_types', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('subject', 20);
            $table->string('name');
            $table->boolean('has_expiry')->default(true);
            $table->boolean('is_mandatory')->default(false);
            $table->json('vehicle_categories')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['organization_id', 'subject', 'name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_types');
    }
};
