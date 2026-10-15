<?php

namespace App\Actions\CRM;

use App\Actions\Sales\CreateDeal;
use App\Enums\CustomerStatus;
use App\Enums\CustomerType;
use App\Enums\LeadStatus;
use App\Models\Customer;
use App\Models\Lead;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class ConvertLead
{
    public function __construct(
        private CreateContact $createContact,
        private CreateDeal $createDeal,
    ) {}

    /**
     * Convert a lead into a customer (and primary contact), optionally creating a deal.
     *
     * @param  array{create_deal?: bool}  $options
     */
    public function execute(Lead $lead, User $actor, array $options = []): Customer
    {
        if ($lead->isConverted()) {
            throw new InvalidArgumentException('Lead is already converted.');
        }

        $createDeal = (bool) ($options['create_deal'] ?? true);

        return DB::transaction(function () use ($lead, $actor, $createDeal): Customer {
            $isCompany = filled($lead->company_name);

            $customer = Customer::query()->create([
                'type' => $isCompany ? CustomerType::Company : CustomerType::Individual,
                'name' => $isCompany
                    ? $lead->company_name
                    : $lead->name,
                'company_name' => $lead->company_name,
                'email' => $lead->email,
                'phone' => $lead->phone,
                'source' => $lead->source,
                'status' => CustomerStatus::Active,
                'assigned_to' => $lead->assigned_to ?? $actor->id,
                'created_by' => $actor->id,
                'notes' => $lead->notes,
            ]);

            $this->createContact->execute($customer, [
                'first_name' => $lead->first_name,
                'last_name' => $lead->last_name,
                'email' => $lead->email,
                'phone' => $lead->phone,
                'position' => $isCompany ? 'Primary contact' : null,
                'is_primary' => true,
            ]);

            $dealId = null;

            if ($createDeal) {
                $deal = $this->createDeal->execute($actor, [
                    'customer_id' => $customer->id,
                    'title' => $lead->company_name ?: $customer->name,
                    'value' => $lead->estimated_value ?? 0,
                    'currency' => $lead->currency ?? 'EUR',
                    'assigned_to' => $lead->assigned_to ?? $actor->id,
                    'description' => $lead->notes,
                ]);

                $dealId = $deal->id;
            }

            $lead->update([
                'status' => LeadStatus::Converted,
                'converted_customer_id' => $customer->id,
                'converted_deal_id' => $dealId,
                'converted_at' => now(),
            ]);

            return $customer->refresh();
        });
    }
}
