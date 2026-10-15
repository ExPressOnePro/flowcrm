<?php

namespace App\Actions\CRM;

use App\Models\Contact;
use App\Models\Customer;
use Illuminate\Support\Facades\DB;

class CreateContact
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Customer $customer, array $data): Contact
    {
        return DB::transaction(function () use ($customer, $data): Contact {
            if (! empty($data['is_primary'])) {
                $customer->contacts()->update(['is_primary' => false]);
            }

            return $customer->contacts()->create([
                ...$data,
                'organization_id' => $customer->organization_id,
            ]);
        });
    }
}
