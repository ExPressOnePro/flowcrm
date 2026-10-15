<?php

namespace App\Http\Controllers;

use App\Actions\CRM\CreateContact;
use App\Actions\CRM\DeleteContact;
use App\Actions\CRM\UpdateContact;
use App\Http\Requests\CRM\StoreContactRequest;
use App\Http\Requests\CRM\UpdateContactRequest;
use App\Models\Contact;
use App\Models\Customer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class ContactController extends Controller
{
    public function store(
        StoreContactRequest $request,
        Customer $customer,
        CreateContact $createContact,
    ): RedirectResponse {
        Gate::authorize('create', Contact::class);

        $createContact->execute($customer, $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Contact added.'),
        ]);

        return to_route('customers.show', $customer);
    }

    public function update(
        UpdateContactRequest $request,
        Customer $customer,
        Contact $contact,
        UpdateContact $updateContact,
    ): RedirectResponse {
        abort_unless($contact->customer_id === $customer->id, 404);

        Gate::authorize('update', $contact);

        $updateContact->execute($contact, $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Contact updated.'),
        ]);

        return to_route('customers.show', $customer);
    }

    public function destroy(
        Customer $customer,
        Contact $contact,
        DeleteContact $deleteContact,
    ): RedirectResponse {
        abort_unless($contact->customer_id === $customer->id, 404);

        Gate::authorize('delete', $contact);

        $deleteContact->execute($contact);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Contact deleted.'),
        ]);

        return to_route('customers.show', $customer);
    }
}
