<?php

namespace App\Notifications\Contracts;

interface BelongsToOrganization
{
    public function organizationId(): int;
}
