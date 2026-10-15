<?php

namespace App\Actions\Sales;

use App\Models\Deal;
use Illuminate\Support\Facades\DB;

class UpdateDeal
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Deal $deal, array $data): Deal
    {
        return DB::transaction(function () use ($deal, $data): Deal {
            $deal->update($data);

            return $deal->refresh();
        });
    }
}
