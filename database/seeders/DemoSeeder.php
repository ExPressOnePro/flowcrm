<?php

namespace Database\Seeders;

use App\Actions\Finance\CreateInvoice;
use App\Actions\Finance\RecordPayment;
use App\Actions\Finance\SendInvoice;
use App\Actions\Organizations\CreateOrganization;
use App\Actions\Organizations\EnsureOrganizationRoles;
use App\Enums\CustomerStatus;
use App\Enums\CustomerType;
use App\Enums\OrganizationUserStatus;
use App\Enums\UserStatus;
use App\Models\Contact;
use App\Models\Customer;
use App\Models\Deal;
use App\Models\Lead;
use App\Models\Pipeline;
use App\Models\Task;
use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class DemoSeeder extends Seeder
{
    /**
     * Seed a demo organization with core team members and sample customers.
     */
    public function run(): void
    {
        $createOrganization = app(CreateOrganization::class);
        $ensureRoles = app(EnsureOrganizationRoles::class);

        $owner = User::query()->create([
            'first_name' => 'Vlad',
            'last_name' => 'Morgan',
            'email' => 'vlad@flowcrm.test',
            'password' => 'password',
            'email_verified_at' => now(),
            'status' => UserStatus::Active,
        ]);

        $organization = $createOrganization->execute($owner, [
            'name' => 'Flow Digital Agency',
            'email' => 'hello@flowcrm.test',
            'phone' => '+373 60 000 000',
            'website' => 'https://flowcrm.test',
            'city' => 'Chisinau',
            'country' => 'Moldova',
        ]);

        $ensureRoles->execute($organization);

        $team = [
            [
                'first_name' => 'Anna',
                'last_name' => 'Smith',
                'email' => 'anna@flowcrm.test',
                'role' => 'Sales Manager',
                'job_title' => 'Sales Manager',
            ],
            [
                'first_name' => 'John',
                'last_name' => 'Miller',
                'email' => 'john@flowcrm.test',
                'role' => 'Sales',
                'job_title' => 'Sales Representative',
            ],
            [
                'first_name' => 'Emma',
                'last_name' => 'Brown',
                'email' => 'emma@flowcrm.test',
                'role' => 'Accountant',
                'job_title' => 'Accountant',
            ],
            [
                'first_name' => 'Alex',
                'last_name' => 'Wilson',
                'email' => 'alex@flowcrm.test',
                'role' => 'Employee',
                'job_title' => 'Operations',
            ],
        ];

        app(PermissionRegistrar::class)->setPermissionsTeamId($organization->id);

        foreach ($team as $member) {
            $user = User::query()->create([
                'first_name' => $member['first_name'],
                'last_name' => $member['last_name'],
                'email' => $member['email'],
                'password' => 'password',
                'email_verified_at' => now(),
                'status' => UserStatus::Active,
            ]);

            $organization->users()->attach($user->id, [
                'job_title' => $member['job_title'],
                'status' => OrganizationUserStatus::Active->value,
                'joined_at' => now(),
            ]);

            $role = Role::query()
                ->where('name', $member['role'])
                ->where('organization_id', $organization->id)
                ->firstOrFail();

            $user->assignRole($role);
        }

        app(CurrentOrganization::class)->set($organization);

        $assignees = $organization->users()->pluck('users.id')->all();

        Customer::factory()
            ->count(12)
            ->forOrganization($organization)
            ->state(fn () => [
                'created_by' => $owner->id,
                'assigned_to' => fake()->randomElement($assignees),
                'status' => fake()->randomElement(CustomerStatus::cases()),
                'type' => fake()->randomElement(CustomerType::cases()),
            ])
            ->create()
            ->each(function (Customer $customer) use ($organization): void {
                Contact::factory()
                    ->count(fake()->numberBetween(1, 3))
                    ->forCustomer($customer)
                    ->create([
                        'organization_id' => $organization->id,
                    ]);

                $customer->contacts()->first()?->update(['is_primary' => true]);
            });

        Lead::factory()
            ->count(10)
            ->forOrganization($organization)
            ->state(fn () => [
                'created_by' => $owner->id,
                'assigned_to' => fake()->randomElement($assignees),
            ])
            ->create();

        $pipeline = Pipeline::query()
            ->where('organization_id', $organization->id)
            ->where('is_default', true)
            ->with('stages')
            ->firstOrFail();

        $customers = Customer::query()
            ->where('organization_id', $organization->id)
            ->get();

        $openStages = $pipeline->stages
            ->where('is_won', false)
            ->where('is_lost', false)
            ->values();

        Deal::factory()
            ->count(18)
            ->state(function () use ($organization, $owner, $assignees, $pipeline, $customers, $openStages) {
                $stage = $openStages->random();

                return [
                    'organization_id' => $organization->id,
                    'pipeline_id' => $pipeline->id,
                    'pipeline_stage_id' => $stage->id,
                    'probability' => $stage->probability,
                    'customer_id' => $customers->random()->id,
                    'created_by' => $owner->id,
                    'assigned_to' => fake()->randomElement($assignees),
                ];
            })
            ->create();

        $deals = Deal::query()
            ->where('organization_id', $organization->id)
            ->get();

        Task::factory()
            ->count(25)
            ->forOrganization($organization)
            ->state(function () use ($owner, $assignees, $customers, $deals) {
                $related = fake()->randomElement(['none', 'customer', 'deal']);

                return [
                    'created_by' => $owner->id,
                    'assigned_to' => fake()->randomElement($assignees),
                    'due_at' => fake()->dateTimeBetween('-2 days', '+10 days'),
                    'taskable_type' => $related === 'none' ? null : $related,
                    'taskable_id' => match ($related) {
                        'customer' => $customers->random()->id,
                        'deal' => $deals->random()->id,
                        default => null,
                    },
                ];
            })
            ->create();

        $createInvoice = app(CreateInvoice::class);
        $sendInvoice = app(SendInvoice::class);
        $recordPayment = app(RecordPayment::class);

        for ($index = 0; $index < 12; $index++) {
            $customer = $customers->random();

            $invoice = $createInvoice->execute($owner, [
                'customer_id' => $customer->id,
                'issue_date' => now()->subDays(fake()->numberBetween(0, 40))->toDateString(),
                'due_date' => now()->addDays(fake()->numberBetween(-5, 30))->toDateString(),
                'currency' => $organization->currency ?? 'EUR',
                'discount' => fake()->randomElement([0, 0, 50, 100]),
                'notes' => fake()->optional(0.3)->sentence(),
                'items' => [
                    [
                        'description' => fake()->randomElement([
                            'Website redesign',
                            'Monthly retainer',
                            'ERP integration',
                            'Support package',
                            'Brand identity',
                        ]),
                        'quantity' => fake()->numberBetween(1, 3),
                        'unit_price' => fake()->randomFloat(2, 400, 4500),
                        'tax_rate' => 20,
                    ],
                    [
                        'description' => fake()->randomElement([
                            'Hosting',
                            'Maintenance',
                            'Consulting hours',
                            'Licensing',
                        ]),
                        'quantity' => fake()->numberBetween(1, 12),
                        'unit_price' => fake()->randomFloat(2, 40, 300),
                        'tax_rate' => 20,
                    ],
                ],
            ]);

            if ($index < 3) {
                continue;
            }

            $sendInvoice->execute($invoice);

            if ($index < 6) {
                continue;
            }

            $balance = (float) $invoice->fresh()->balance;
            $partial = round($balance * fake()->randomFloat(2, 0.3, 0.7), 2);

            $recordPayment->execute($invoice->fresh(), $owner, [
                'amount' => $partial,
                'payment_method' => fake()->randomElement(['bank_transfer', 'card', 'cash']),
                'reference' => fake()->bothify('PAY-####'),
                'paid_at' => now()->subDays(fake()->numberBetween(0, 20)),
            ]);

            if ($index >= 9) {
                $remaining = (float) $invoice->fresh()->balance;

                if ($remaining > 0) {
                    $recordPayment->execute($invoice->fresh(), $owner, [
                        'amount' => $remaining,
                        'payment_method' => 'bank_transfer',
                        'reference' => fake()->bothify('PAY-####'),
                        'paid_at' => now()->subDays(fake()->numberBetween(0, 5)),
                    ]);
                }
            }
        }
    }
}
