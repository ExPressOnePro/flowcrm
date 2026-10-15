<?php

namespace App\Actions\Work;

use App\Enums\TaskStatus;
use App\Models\Task;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class CompleteTask
{
    public function execute(Task $task): Task
    {
        if ($task->isCompleted()) {
            throw new InvalidArgumentException('Task is already completed.');
        }

        return DB::transaction(function () use ($task): Task {
            $task->update([
                'status' => TaskStatus::Completed,
                'completed_at' => now(),
            ]);

            return $task->refresh();
        });
    }
}
