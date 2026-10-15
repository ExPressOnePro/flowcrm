<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Class names written before `Relation::enforceMorphMap()` was enabled.
     *
     * @var array<string, string>
     */
    private const MAP = [
        'App\\Models\\User' => 'user',
        'App\\Models\\Organization' => 'organization',
        'App\\Models\\Customer' => 'customer',
        'App\\Models\\Contact' => 'contact',
        'App\\Models\\Lead' => 'lead',
        'App\\Models\\Deal' => 'deal',
        'App\\Models\\Pipeline' => 'pipeline',
        'App\\Models\\PipelineStage' => 'pipeline_stage',
        'App\\Models\\Task' => 'task',
        'App\\Models\\Invoice' => 'invoice',
        'App\\Models\\InvoiceItem' => 'invoice_item',
        'App\\Models\\Payment' => 'payment',
    ];

    /**
     * @var list<array{0: string, 1: string}>
     */
    private const COLUMNS = [
        ['tasks', 'taskable_type'],
        ['model_has_roles', 'model_type'],
        ['model_has_permissions', 'model_type'],
        ['activity_log', 'subject_type'],
        ['activity_log', 'causer_type'],
    ];

    public function up(): void
    {
        $this->rewrite(self::MAP);
    }

    public function down(): void
    {
        $this->rewrite(array_flip(self::MAP));
    }

    /**
     * @param  array<string, string>  $map
     */
    private function rewrite(array $map): void
    {
        foreach (self::COLUMNS as [$table, $column]) {
            foreach ($map as $from => $to) {
                DB::table($table)->where($column, $from)->update([$column => $to]);
            }
        }
    }
};
