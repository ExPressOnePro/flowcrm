<?php

namespace App\Actions\CRM;

use App\Models\Customer;
use Illuminate\Support\Facades\DB;

class DeleteCustomer
{
    public function execute(Customer $customer): void
    {
        DB::transaction(function () use ($customer): void {
            $customer->delete();
        });
    }
}
