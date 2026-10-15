<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->foreignId('document_type_id')->constrained()->restrictOnDelete();
            $table->string('documentable_type');
            $table->unsignedBigInteger('documentable_id');
            $table->string('number', 100)->nullable();
            $table->string('issuer')->nullable();
            $table->date('issued_on')->nullable();
            $table->date('expires_on')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('archived_at')->nullable();
            $table->foreignId('archived_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('archive_reason')->nullable();
            $table->foreignId('replaced_by_id')->nullable()->constrained('documents')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('idempotency_key', 64)->nullable();
            $table->timestamps();

            $table->index(['documentable_type', 'documentable_id']);
            $table->index(['organization_id', 'archived_at', 'expires_on']);
            $table->unique(['organization_id', 'idempotency_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
