<?php

namespace App\Http\Controllers;

use App\Actions\Finance\CreateInvoice;
use App\Actions\Finance\DeleteInvoice;
use App\Actions\Finance\RecordPayment;
use App\Actions\Finance\SendInvoice;
use App\Enums\InvoiceStatus;
use App\Http\Requests\CRM\StoreInvoiceRequest;
use App\Http\Requests\CRM\StorePaymentRequest;
use App\Models\Customer;
use App\Models\Invoice;
use App\Support\CurrentOrganization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;
use InvalidArgumentException;

class InvoiceController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Invoice::class);

        $invoices = Invoice::query()
            ->with(['customer:id,name'])
            ->when(
                $request->filled('search'),
                function ($query) use ($request): void {
                    $search = $request->string('search')->toString();
                    $query->where(function ($query) use ($search): void {
                        $query->where('number', 'like', "%{$search}%")
                            ->orWhereHas('customer', fn ($customerQuery) => $customerQuery->where('name', 'like', "%{$search}%"));
                    });
                },
            )
            ->when(
                $request->filled('status'),
                fn ($query) => $query->where('status', $request->string('status')->toString()),
            )
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Invoice $invoice) => [
                'id' => $invoice->id,
                'number' => $invoice->number,
                'status' => $invoice->status->value,
                'total' => $invoice->total,
                'balance' => $invoice->balance,
                'currency' => $invoice->currency,
                'issue_date' => $invoice->issue_date?->toDateString(),
                'due_date' => $invoice->due_date?->toDateString(),
                'customer' => $invoice->customer ? [
                    'id' => $invoice->customer->id,
                    'name' => $invoice->customer->name,
                ] : null,
            ]);

        return Inertia::render('invoices/index', [
            'invoices' => $invoices,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'status' => $request->string('status')->toString(),
            ],
            'statuses' => collect(InvoiceStatus::cases())->map->value,
            'can' => [
                'create' => Gate::allows('create', Invoice::class),
            ],
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Invoice::class);

        return Inertia::render('invoices/create', [
            'customers' => Customer::query()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (Customer $customer) => [
                    'id' => $customer->id,
                    'name' => $customer->name,
                ]),
            'default_currency' => app(CurrentOrganization::class)->get()?->currency ?? 'EUR',
        ]);
    }

    public function store(StoreInvoiceRequest $request, CreateInvoice $createInvoice): RedirectResponse
    {
        $invoice = $createInvoice->execute($request->user(), $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Invoice created.'),
        ]);

        return to_route('invoices.show', $invoice);
    }

    public function show(Invoice $invoice): Response
    {
        Gate::authorize('view', $invoice);

        $invoice->load([
            'customer:id,name,email',
            'items',
            'payments.createdBy:id,first_name,last_name',
            'createdBy:id,first_name,last_name',
        ]);

        return Inertia::render('invoices/show', [
            'invoice' => [
                'id' => $invoice->id,
                'number' => $invoice->number,
                'status' => $invoice->status->value,
                'issue_date' => $invoice->issue_date?->toDateString(),
                'due_date' => $invoice->due_date?->toDateString(),
                'currency' => $invoice->currency,
                'subtotal' => $invoice->subtotal,
                'tax' => $invoice->tax,
                'discount' => $invoice->discount,
                'total' => $invoice->total,
                'paid_amount' => $invoice->paid_amount,
                'balance' => $invoice->balance,
                'notes' => $invoice->notes,
                'customer' => $invoice->customer ? [
                    'id' => $invoice->customer->id,
                    'name' => $invoice->customer->name,
                    'email' => $invoice->customer->email,
                ] : null,
                'created_by' => $invoice->createdBy ? [
                    'id' => $invoice->createdBy->id,
                    'name' => $invoice->createdBy->name,
                ] : null,
                'items' => $invoice->items->map(fn ($item) => [
                    'id' => $item->id,
                    'description' => $item->description,
                    'quantity' => $item->quantity,
                    'unit_price' => $item->unit_price,
                    'tax_rate' => $item->tax_rate,
                    'subtotal' => $item->subtotal,
                    'tax_amount' => $item->tax_amount,
                    'total' => $item->total,
                ]),
                'payments' => $invoice->payments->map(fn ($payment) => [
                    'id' => $payment->id,
                    'amount' => $payment->amount,
                    'currency' => $payment->currency,
                    'payment_method' => $payment->payment_method,
                    'reference' => $payment->reference,
                    'paid_at' => $payment->paid_at?->toIso8601String(),
                    'notes' => $payment->notes,
                    'created_by' => $payment->createdBy?->name,
                ]),
            ],
            'can' => [
                'send' => Gate::allows('send', $invoice) && $invoice->status === InvoiceStatus::Draft,
                'pay' => Gate::allows('create', \App\Models\Payment::class)
                    && ! in_array($invoice->status, [InvoiceStatus::Draft, InvoiceStatus::Cancelled, InvoiceStatus::Paid], true)
                    && (float) $invoice->balance > 0,
                'delete' => Gate::allows('delete', $invoice),
            ],
        ]);
    }

    public function send(Invoice $invoice, SendInvoice $sendInvoice): RedirectResponse
    {
        Gate::authorize('send', $invoice);

        $sendInvoice->execute($invoice);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Invoice marked as sent.'),
        ]);

        return back();
    }

    public function destroy(Invoice $invoice, DeleteInvoice $deleteInvoice): RedirectResponse
    {
        Gate::authorize('delete', $invoice);

        try {
            $deleteInvoice->execute($invoice);
        } catch (InvalidArgumentException $exception) {
            return back()->withErrors(['invoice' => $exception->getMessage()]);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Invoice removed.'),
        ]);

        return to_route('invoices.index');
    }

    public function storePayment(
        StorePaymentRequest $request,
        Invoice $invoice,
        RecordPayment $recordPayment,
    ): RedirectResponse {
        Gate::authorize('create', \App\Models\Payment::class);

        try {
            $recordPayment->execute($invoice, $request->user(), $request->validated());
        } catch (InvalidArgumentException $exception) {
            return back()->withErrors(['amount' => $exception->getMessage()]);
        }

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Payment recorded.'),
        ]);

        return back();
    }
}
