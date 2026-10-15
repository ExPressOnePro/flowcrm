<?php

namespace App\Actions\Work;

use App\Enums\TaskStatus;
use App\Models\Task;
use Illuminate\Support\Facades\DB;

class UpdateTask
{
    /**
     * @param  array<string, mixed>  $data
     */
    public function execute(Task $task, array $data): Task
    {
        return DB::transaction(function () use ($task, $data): Task {
            [$type, $id] = CreateTask::resolveTaskable(
                $data['taskable_type'] ?? null,
                array_key_exists('taskable_id', $data) ? $data['taskable_id'] : null,
            );

            $status = $data['status'] ?? $task->status;
            $completedAt = $task->completed_at;

            if ($status === TaskStatus::Completed || $status === TaskStatus::Completed->value) {
                $completedAt = $completedAt ?? now();
            } else {
                $completedAt = null;
            }

            $task->update([
                'title' => $data['title'],
                'description' => $data['description'] ?? null,
                'status' => $status,
                'priority' => $data['priority'],
                'assigned_to' => $data['assigned_to'] ?? null,
                'due_at' => $data['due_at'] ?? null,
                'completed_at' => $completedAt,
                'taskable_type' => $type,
                'taskable_id' => $id,
            ]);

            return $task->refresh();
        });
    }
}
