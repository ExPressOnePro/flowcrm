<?php

namespace App\Actions\CRM;

use App\Models\Contact;
use Illuminate\Support\Facades\DB;

class UpdateContact
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Contact $contact, array $data): Contact
    {
        return DB::transaction(function () use ($contact, $data): Contact {
            if (! empty($data['is_primary'])) {
                $contact->customer->contacts()
                    ->whereKeyNot($contact->id)
                    ->update(['is_primary' => false]);
            }

            $contact->update($data);

            return $contact->refresh();
        });
    }
}
