<?php

namespace App\Actions\Work;

use App\Enums\TaskStatus;
use App\Models\Customer;
use App\Models\Deal;
use App\Models\Invoice;
use App\Models\Lead;
use App\Models\Task;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CreateTask
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(User $actor, array $data): Task
    {
        return DB::transaction(function () use ($actor, $data): Task {
            [$type, $id] = $this->resolveTaskable(
                $data['taskable_type'] ?? null,
                $data['taskable_id'] ?? null,
            );

            return Task::query()->create([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'status' => $data['status'] ?? TaskStatus::Open,
                'priority' => $data['priority'] ?? 'medium',
                'assigned_to' => $data['assigned_to'] ?? $actor->id,
                'created_by' => $actor->id,
                'due_at' => $data['due_at'] ?? null,
                'completed_at' => null,
                'taskable_type' => $type,
                'taskable_id' => $id,
            ]);
        });
    }

    /**
     * @return array{0: class-string|null, 1: int|null}
     */
    public static function resolveTaskable(?string $type, mixed $id): array
    {
        if ($type === null || $type === '' || $id === null || $id === '') {
            return [null, null];
        }

        $map = [
            'customer' => Customer::class,
            'lead' => Lead::class,
            'deal' => Deal::class,
            'invoice' => Invoice::class,
        ];

        if (! isset($map[$type])) {
            throw new InvalidArgumentException('Invalid taskable type.');
        }

        $class = $map[$type];
        $model = $class::query()->findOrFail($id);

        return [$class, $model->getKey()];
    }
}
