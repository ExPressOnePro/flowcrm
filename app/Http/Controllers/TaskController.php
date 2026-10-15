<?php

namespace App\Http\Controllers;

use App\Actions\Work\CompleteTask;
use App\Actions\Work\CreateTask;
use App\Actions\Work\DeleteTask;
use App\Actions\Work\UpdateTask;
use App\Enums\TaskPriority;
use App\Enums\TaskStatus;
use App\Http\Requests\CRM\StoreTaskRequest;
use App\Http\Requests\CRM\UpdateTaskRequest;
use App\Models\Customer;
use App\Models\Deal;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Task;
use App\Models\User;
use App\Support\CurrentOrganization;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;
use Inertia\Response;

class TaskController extends Controller
{
    public function index(Request $request): Response
    {
        Gate::authorize('viewAny', Task::class);

        $user = $request->user();

        $tasks = Task::query()
            ->with(['assignedTo:id,first_name,last_name', 'taskable'])
            ->when(
                ! $user->can('tasks.view_all'),
                fn ($query) => $query->where(function ($query) use ($user): void {
                    $query->where('assigned_to', $user->id)
                        ->orWhere('created_by', $user->id);
                }),
            )
            ->when(
                $request->filled('search'),
                function ($query) use ($request): void {
                    $search = $request->string('search')->toString();
                    $query->where(function ($query) use ($search): void {
                        $query->where('title', 'like', "%{$search}%")
                            ->orWhere('description', 'like', "%{$search}%");
                    });
                },
            )
            ->when(
                $request->filled('status'),
                fn ($query) => $query->where('status', $request->string('status')->toString()),
            )
            ->when(
                $request->boolean('today'),
                fn ($query) => $query->whereDate('due_at', today()),
            )
            ->latest('due_at')
            ->latest()
            ->paginate(20)
            ->withQueryString()
            ->through(fn (Task $task) => $this->taskPayload($task));

        return Inertia::render('tasks/index', [
            'tasks' => $tasks,
            'filters' => [
                'search' => $request->string('search')->toString(),
                'status' => $request->string('status')->toString(),
                'today' => $request->boolean('today'),
            ],
            'statuses' => collect(TaskStatus::cases())->map->value,
            'can' => [
                'create' => Gate::allows('create', Task::class),
            ],
        ]);
    }

    public function create(): Response
    {
        Gate::authorize('create', Task::class);

        return Inertia::render('tasks/create', $this->formOptions());
    }

    public function store(StoreTaskRequest $request, CreateTask $createTask): RedirectResponse
    {
        $task = $createTask->execute($request->user(), $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Task created.'),
        ]);

        return to_route('tasks.show', $task);
    }

    public function show(Task $task): Response
    {
        Gate::authorize('view', $task);

        $task->load(['assignedTo:id,first_name,last_name,email', 'createdBy:id,first_name,last_name', 'taskable']);

        return Inertia::render('tasks/show', [
            'task' => $this->taskPayload($task, detailed: true),
            'can' => [
                'update' => Gate::allows('update', $task),
                'delete' => Gate::allows('delete', $task),
                'complete' => Gate::allows('complete', $task),
            ],
        ]);
    }

    public function edit(Task $task): Response
    {
        Gate::authorize('update', $task);

        return Inertia::render('tasks/edit', [
            'task' => [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'status' => $task->status->value,
                'priority' => $task->priority->value,
                'assigned_to' => $task->assigned_to,
                'due_at' => $task->due_at?->format('Y-m-d\TH:i'),
                'taskable_type' => $this->taskableAlias($task->taskable_type),
                'taskable_id' => $task->taskable_id,
            ],
            ...$this->formOptions(),
        ]);
    }

    public function update(
        UpdateTaskRequest $request,
        Task $task,
        UpdateTask $updateTask,
    ): RedirectResponse {
        $updateTask->execute($task, $request->validated());

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Task updated.'),
        ]);

        return to_route('tasks.show', $task);
    }

    public function destroy(Task $task, DeleteTask $deleteTask): RedirectResponse
    {
        Gate::authorize('delete', $task);

        $deleteTask->execute($task);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Task deleted.'),
        ]);

        return to_route('tasks.index');
    }

    public function complete(Task $task, CompleteTask $completeTask): RedirectResponse
    {
        Gate::authorize('complete', $task);

        $completeTask->execute($task);

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => __('Task completed.'),
        ]);

        return back();
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            'statuses' => collect(TaskStatus::cases())->map->value,
            'priorities' => collect(TaskPriority::cases())->map->value,
            'assignees' => $this->assignees(),
            'taskables' => [
                'customers' => Customer::query()->orderBy('name')->get(['id', 'name'])
                    ->map(fn (Customer $customer) => ['id' => $customer->id, 'name' => $customer->name]),
                'leads' => Lead::query()
                    ->where('status', '!=', 'converted')
                    ->orderBy('last_name')
                    ->get(['id', 'first_name', 'last_name', 'company_name'])
                    ->map(fn (Lead $lead) => [
                        'id' => $lead->id,
                        'name' => trim($lead->name.($lead->company_name ? " ({$lead->company_name})" : '')),
                    ]),
                'deals' => Deal::query()->orderBy('title')->get(['id', 'title'])
                    ->map(fn (Deal $deal) => ['id' => $deal->id, 'name' => $deal->title]),
                'invoices' => Invoice::query()->latest()->get(['id', 'number'])
                    ->map(fn (Invoice $invoice) => ['id' => $invoice->id, 'name' => $invoice->number]),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function taskPayload(Task $task, bool $detailed = false): array
    {
        $payload = [
            'id' => $task->id,
            'title' => $task->title,
            'status' => $task->status->value,
            'priority' => $task->priority->value,
            'due_at' => $task->due_at?->toIso8601String(),
            'completed_at' => $task->completed_at?->toIso8601String(),
            'assigned_to' => $task->assignedTo ? [
                'id' => $task->assignedTo->id,
                'name' => $task->assignedTo->name,
            ] : null,
            'taskable' => $this->taskablePayload($task),
        ];

        if ($detailed) {
            $payload['description'] = $task->description;
            $payload['created_by'] = $task->createdBy ? [
                'id' => $task->createdBy->id,
                'name' => $task->createdBy->name,
            ] : null;
        }

        return $payload;
    }

    /**
     * @return array{type: string, id: int, name: string, url: string}|null
     */
    private function taskablePayload(Task $task): ?array
    {
        if ($task->taskable === null) {
            return null;
        }

        $type = $this->taskableAlias($task->taskable_type);

        $name = match ($type) {
            'customer' => $task->taskable->name,
            'lead' => $task->taskable->name,
            'deal' => $task->taskable->title,
            'invoice' => $task->taskable->number,
            default => 'Related record',
        };

        $url = match ($type) {
            'customer' => route('customers.show', $task->taskable_id, false),
            'lead' => route('leads.show', $task->taskable_id, false),
            'deal' => route('deals.show', $task->taskable_id, false),
            'invoice' => route('invoices.show', $task->taskable_id, false),
            default => '#',
        };

        return [
            'type' => $type ?? 'unknown',
            'id' => $task->taskable_id,
            'name' => $name,
            'url' => $url,
        ];
    }

    private function taskableAlias(?string $class): ?string
    {
        return match ($class) {
            Customer::class => 'customer',
            Lead::class => 'lead',
            Deal::class => 'deal',
            Invoice::class => 'invoice',
            default => null,
        };
    }

    /**
     * @return list<array{id: int, name: string}>
     */
    private function assignees(): array
    {
        $organization = app(CurrentOrganization::class)->get();

        if ($organization === null) {
            return [];
        }

        return $organization->users()
            ->orderBy('users.first_name')
            ->get(['users.id', 'users.first_name', 'users.last_name'])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
            ])
            ->all();
    }
}
