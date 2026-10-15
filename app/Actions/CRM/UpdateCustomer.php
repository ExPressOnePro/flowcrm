<?php

namespace App\Actions\CRM;

use App\Models\Customer;
use Illuminate\Support\Facades\DB;

class UpdateCustomer
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Customer $customer, array $data): Customer
    {
        return DB::transaction(function () use ($customer, $data): Customer {
            $customer->update($data);

            return $customer->refresh();
        });
    }
}
