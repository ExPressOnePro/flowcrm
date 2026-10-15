<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * One row per expiry threshold already announced for a document, so the
     * scheduler never repeats a notification.
     */
    public function up(): void
    {
        Schema::create('document_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('document_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('threshold_days');
            $table->timestamp('created_at')->nullable();

            $table->unique(['document_id', 'threshold_days']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_alerts');
    }
};
