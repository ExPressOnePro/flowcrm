<?php

namespace App\Actions\Sales;

use App\Models\Deal;
use Illuminate\Support\Facades\DB;

class DeleteDeal
{
    public function execute(Deal $deal): void
    {
        DB::transaction(function () use ($deal): void {
            $deal->delete();
        });
    }
}
