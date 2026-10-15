<?php

namespace App\Actions\CRM;

use App\Models\Customer;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CreateCustomer
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(User $actor, array $data): Customer
    {
        return DB::transaction(function () use ($actor, $data): Customer {
            return Customer::query()->create([
                ...$data,
                'created_by' => $actor->id,
                'assigned_to' => $data['assigned_to'] ?? $actor->id,
            ]);
        });
    }
}
