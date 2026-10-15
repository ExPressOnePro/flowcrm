<?php

namespace App\Actions\CRM;

use App\Models\Contact;
use Illuminate\Support\Facades\DB;

class DeleteContact
{
    public function execute(Contact $contact): void
    {
        DB::transaction(function () use ($contact): void {
            $contact->delete();
        });
    }
}
