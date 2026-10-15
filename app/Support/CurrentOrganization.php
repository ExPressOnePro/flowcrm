<?php

namespace App\Support;

use App\Models\Organization;

class CurrentOrganization
{
    public function __construct(
        public ?Organization $organization = null,
    ) {}

    public function set(Organization $organization): void
    {
        $this->organization = $organization;
    }

    public function clear(): void
    {
        $this->organization = null;
    }

    public function get(): ?Organization
    {
        return $this->organization;
    }

    public function id(): ?int
    {
        return $this->organization?->id;
    }

    public function exists(): bool
    {
        return $this->organization !== null;
    }
}
