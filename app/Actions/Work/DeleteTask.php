<?php

namespace App\Actions\Work;

use App\Models\Task;
use Illuminate\Support\Facades\DB;

class DeleteTask
{
    public function execute(Task $task): void
    {
        DB::transaction(function () use ($task): void {
            $task->delete();
        });
    }
}
