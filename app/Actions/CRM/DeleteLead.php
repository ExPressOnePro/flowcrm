<?php

namespace App\Actions\CRM;

use App\Models\Lead;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class DeleteLead
{
    public function execute(Lead $lead): void
    {
        if ($lead->isConverted()) {
            throw new InvalidArgumentException('Converted leads cannot be deleted.');
        }

        DB::transaction(function () use ($lead): void {
            $lead->delete();
        });
    }
}
