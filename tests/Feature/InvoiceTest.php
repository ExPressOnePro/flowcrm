<?php

namespace Tests\Feature;

use App\Enums\InvoiceStatus;
use App\Models\Customer;
use App\Models\Invoice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InvoiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_users_can_view_invoices_index(): void
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();

        $customer = Customer::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
        ]);

        Invoice::factory()->create([
            'organization_id' => $organization->id,
            'customer_id' => $customer->id,
            'created_by' => $user->id,
            'number' => 'INV-00001',
        ]);

        $this->actingAs($user)
            ->get(route('invoices.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('invoices/index')
                ->has('invoices.data', 1)
            );
    }

    public function test_users_can_create_an_invoice_with_items(): void
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();

        $customer = Customer::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
        ]);

        $response = $this->actingAs($user)->post(route('invoices.store'), [
            'customer_id' => $customer->id,
            'issue_date' => now()->toDateString(),
            'due_date' => now()->addDays(14)->toDateString(),
            'currency' => 'EUR',
            'discount' => 10,
            'notes' => 'Net 14',
            'items' => [
                [
                    'description' => 'Website redesign',
                    'quantity' => 1,
                    'unit_price' => 1000,
                    'tax_rate' => 20,
                ],
                [
                    'description' => 'Hosting',
                    'quantity' => 12,
                    'unit_price' => 20,
                    'tax_rate' => 20,
                ],
            ],
        ]);

        $invoice = Invoice::query()->firstOrFail();

        $response->assertRedirect(route('invoices.show', $invoice));

        $this->assertDatabaseHas('invoices', [
            'id' => $invoice->id,
            'customer_id' => $customer->id,
            'organization_id' => $organization->id,
            'status' => InvoiceStatus::Draft->value,
            'number' => 'INV-00001',
        ]);

        $this->assertSame(2, $invoice->items()->count());
        // 1000 + 240 = 1240 subtotal; tax 248; discount 10; total 1478
        $this->assertEquals(1240.0, (float) $invoice->subtotal);
        $this->assertEquals(248.0, (float) $invoice->tax);
        $this->assertEquals(10.0, (float) $invoice->discount);
        $this->assertEquals(1478.0, (float) $invoice->total);
        $this->assertEquals(1478.0, (float) $invoice->balance);
    }

    public function test_users_can_send_and_record_partial_then_full_payment(): void
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();

        $customer = Customer::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
        ]);

        $invoice = Invoice::factory()->create([
            'organization_id' => $organization->id,
            'customer_id' => $customer->id,
            'created_by' => $user->id,
            'status' => InvoiceStatus::Draft,
            'subtotal' => 1000,
            'tax' => 200,
            'discount' => 0,
            'total' => 1200,
            'paid_amount' => 0,
            'balance' => 1200,
        ]);

        $this->actingAs($user)
            ->post(route('invoices.send', $invoice))
            ->assertRedirect();

        $this->assertSame(InvoiceStatus::Sent, $invoice->fresh()->status);

        $this->actingAs($user)
            ->post(route('invoices.payments.store', $invoice), [
                'amount' => 400,
                'payment_method' => 'bank_transfer',
                'paid_at' => now()->toDateTimeString(),
            ])
            ->assertRedirect();

        $invoice->refresh();
        $this->assertSame(InvoiceStatus::Partial, $invoice->status);
        $this->assertEquals(400.0, (float) $invoice->paid_amount);
        $this->assertEquals(800.0, (float) $invoice->balance);
        $this->assertDatabaseCount('payments', 1);

        $this->actingAs($user)
            ->post(route('invoices.payments.store', $invoice), [
                'amount' => 800,
                'payment_method' => 'card',
                'paid_at' => now()->toDateTimeString(),
            ])
            ->assertRedirect();

        $invoice->refresh();
        $this->assertSame(InvoiceStatus::Paid, $invoice->status);
        $this->assertEquals(1200.0, (float) $invoice->paid_amount);
        $this->assertEquals(0.0, (float) $invoice->balance);
        $this->assertDatabaseCount('payments', 2);
    }

    public function test_invoices_are_isolated_by_organization(): void
    {
        $userA = createUserWithOrganization(['email' => 'a@example.com'], ['name' => 'Org A']);
        $orgA = $userA->organizations()->firstOrFail();

        $customerA = Customer::factory()->create([
            'organization_id' => $orgA->id,
            'created_by' => $userA->id,
        ]);

        $invoiceA = Invoice::factory()->create([
            'organization_id' => $orgA->id,
            'customer_id' => $customerA->id,
            'created_by' => $userA->id,
            'number' => 'INV-ORG-A',
        ]);

        $userB = createUserWithOrganization(['email' => 'b@example.com'], ['name' => 'Org B']);

        $this->actingAs($userB)
            ->get(route('invoices.show', $invoiceA))
            ->assertNotFound();

        $this->actingAs($userB)
            ->get(route('invoices.index'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('invoices/index')
                ->has('invoices.data', 0)
            );
    }

    public function test_cannot_record_payment_on_draft_invoice(): void
    {
        $user = createUserWithOrganization();
        $organization = $user->organizations()->firstOrFail();

        $customer = Customer::factory()->create([
            'organization_id' => $organization->id,
            'created_by' => $user->id,
        ]);

        $invoice = Invoice::factory()->create([
            'organization_id' => $organization->id,
            'customer_id' => $customer->id,
            'created_by' => $user->id,
            'status' => InvoiceStatus::Draft,
            'total' => 500,
            'balance' => 500,
        ]);

        $this->actingAs($user)
            ->from(route('invoices.show', $invoice))
            ->post(route('invoices.payments.store', $invoice), [
                'amount' => 100,
            ])
            ->assertRedirect(route('invoices.show', $invoice))
            ->assertSessionHasErrors('amount');

        $this->assertDatabaseCount('payments', 0);
        $this->assertSame(InvoiceStatus::Draft, $invoice->fresh()->status);
    }
}
