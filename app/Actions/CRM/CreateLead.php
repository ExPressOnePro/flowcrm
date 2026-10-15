<?php

namespace App\Actions\CRM;

use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CreateLead
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(User $actor, array $data): Lead
    {
        return DB::transaction(function () use ($actor, $data): Lead {
            return Lead::query()->create([
                ...$data,
                'created_by' => $actor->id,
                'assigned_to' => $data['assigned_to'] ?? $actor->id,
                'currency' => $data['currency'] ?? 'EUR',
            ]);
        });
    }
}
