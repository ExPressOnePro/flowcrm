<?php

namespace App\Actions\CRM;

use App\Models\Lead;
use Illuminate\Support\Facades\DB;

class UpdateLead
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Lead $lead, array $data): Lead
    {
        return DB::transaction(function () use ($lead, $data): Lead {
            $lead->update($data);

            return $lead->refresh();
        });
    }
}
