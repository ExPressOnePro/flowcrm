import { router } from '@inertiajs/react';
import {
    DndContext,
    DragOverlay,
    PointerSensor,
    closestCorners,
    useSensor,
    useSensors,
    type DragEndEvent,
    type DragOverEvent,
    type DragStartEvent,
    useDroppable,
} from '@dnd-kit/core';
import {
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Link } from '@inertiajs/react';
import { useMemo, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import deals from '@/routes/deals';

export type BoardDeal = {
    id: number;
    title: string;
    value: string;
    currency: string;
    probability: number;
    status: string;
    pipeline_stage_id: number;
    customer: { id: number; name: string } | null;
    assigned_to: { id: number; name: string } | null;
};

export type BoardColumn = {
    id: number;
    name: string;
    position: number;
    probability: number;
    is_won: boolean;
    is_lost: boolean;
    total_value: number;
    deals: BoardDeal[];
};

type Props = {
    columns: BoardColumn[];
    canChangeStage: boolean;
};

function formatMoney(value: number | string, currency = 'EUR'): string {
    const amount = typeof value === 'string' ? Number(value) : value;

    if (Number.isNaN(amount)) {
        return String(value);
    }

    return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(amount);
}

export function PipelineBoard({ columns: initialColumns, canChangeStage }: Props) {
    const [columns, setColumns] = useState(initialColumns);
    const [activeDeal, setActiveDeal] = useState<BoardDeal | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        }),
    );

    const dealIdsByColumn = useMemo(() => {
        const map: Record<number, number[]> = {};

        for (const column of columns) {
            map[column.id] = column.deals.map((deal) => deal.id);
        }

        return map;
    }, [columns]);

    function findColumnId(dealId: number): number | null {
        for (const column of columns) {
            if (column.deals.some((deal) => deal.id === dealId)) {
                return column.id;
            }
        }

        return null;
    }

    function handleDragStart(event: DragStartEvent) {
        const dealId = Number(event.active.id);
        const deal = columns
            .flatMap((column) => column.deals)
            .find((item) => item.id === dealId);

        setActiveDeal(deal ?? null);
    }

    function handleDragOver(event: DragOverEvent) {
        if (!canChangeStage) {
            return;
        }

        const { active, over } = event;

        if (!over) {
            return;
        }

        const activeId = Number(active.id);
        const overId = Number(over.id);

        const activeColumnId = findColumnId(activeId);
        const overColumnId =
            columns.find((column) => column.id === overId)?.id ??
            findColumnId(overId);

        if (!activeColumnId || !overColumnId || activeColumnId === overColumnId) {
            return;
        }

        setColumns((current) => {
            const next = current.map((column) => ({
                ...column,
                deals: [...column.deals],
            }));

            const fromColumn = next.find((column) => column.id === activeColumnId);
            const toColumn = next.find((column) => column.id === overColumnId);

            if (!fromColumn || !toColumn) {
                return current;
            }

            const dealIndex = fromColumn.deals.findIndex(
                (deal) => deal.id === activeId,
            );

            if (dealIndex === -1) {
                return current;
            }

            const [deal] = fromColumn.deals.splice(dealIndex, 1);
            const moved = {
                ...deal,
                pipeline_stage_id: toColumn.id,
            };

            const overDealIndex = toColumn.deals.findIndex(
                (item) => item.id === overId,
            );

            if (overDealIndex >= 0) {
                toColumn.deals.splice(overDealIndex, 0, moved);
            } else {
                toColumn.deals.push(moved);
            }

            return next.map((column) => ({
                ...column,
                total_value: column.deals.reduce(
                    (sum, item) => sum + Number(item.value),
                    0,
                ),
            }));
        });
    }

    function handleDragEnd(event: DragEndEvent) {
        setActiveDeal(null);

        if (!canChangeStage) {
            return;
        }

        const { active, over } = event;

        if (!over) {
            setColumns(initialColumns);

            return;
        }

        const dealId = Number(active.id);
        const destinationColumnId =
            columns.find((column) => column.id === Number(over.id))?.id ??
            findColumnId(Number(over.id));

        const originalColumnId = initialColumns.find((column) =>
            column.deals.some((deal) => deal.id === dealId),
        )?.id;

        if (
            !destinationColumnId ||
            !originalColumnId ||
            destinationColumnId === originalColumnId
        ) {
            return;
        }

        const stage = columns.find((column) => column.id === destinationColumnId);
        let lostReason: string | undefined;

        if (stage?.is_lost) {
            lostReason =
                window.prompt('Lost reason (optional):') ?? undefined;
        }

        router.patch(
            deals.stage.url(dealId),
            {
                pipeline_stage_id: destinationColumnId,
                lost_reason: lostReason || null,
            },
            {
                preserveScroll: true,
                onError: () => setColumns(initialColumns),
                onSuccess: () => {
                    // Keep optimistic board; backend is source of truth on next visit.
                },
            },
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="flex gap-4 overflow-x-auto pb-4">
                {columns.map((column) => (
                    <DealColumn
                        key={column.id}
                        column={column}
                        dealIds={dealIdsByColumn[column.id] ?? []}
                        canChangeStage={canChangeStage}
                    />
                ))}
            </div>

            <DragOverlay>
                {activeDeal ? <DealCard deal={activeDeal} overlay /> : null}
            </DragOverlay>
        </DndContext>
    );
}

function DealColumn({
    column,
    dealIds,
    canChangeStage,
}: {
    column: BoardColumn;
    dealIds: number[];
    canChangeStage: boolean;
}) {
    const { setNodeRef, isOver } = useDroppable({
        id: column.id,
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'flex w-72 shrink-0 flex-col rounded-xl border bg-muted/20',
                isOver && 'border-primary/40 bg-muted/40',
            )}
        >
            <div className="border-b px-3 py-3">
                <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-medium">{column.name}</h3>
                    <Badge variant="secondary">{column.deals.length}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                    {formatMoney(column.total_value)} · {column.probability}%
                </p>
            </div>

            <SortableContext
                items={dealIds}
                strategy={verticalListSortingStrategy}
                disabled={!canChangeStage}
            >
                <div className="flex min-h-40 flex-1 flex-col gap-2 p-2">
                    {column.deals.map((deal) => (
                        <SortableDealCard
                            key={deal.id}
                            deal={deal}
                            disabled={!canChangeStage}
                        />
                    ))}
                </div>
            </SortableContext>
        </div>
    );
}

function SortableDealCard({
    deal,
    disabled,
}: {
    deal: BoardDeal;
    disabled: boolean;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: deal.id,
        disabled,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <DealCard deal={deal} dragging={isDragging} />
        </div>
    );
}

function DealCard({
    deal,
    dragging = false,
    overlay = false,
}: {
    deal: BoardDeal;
    dragging?: boolean;
    overlay?: boolean;
}) {
    return (
        <div
            className={cn(
                'rounded-lg border bg-background p-3 shadow-xs',
                dragging && 'opacity-40',
                overlay && 'shadow-lg',
            )}
        >
            <Link
                href={deals.show(deal.id)}
                className="font-medium hover:underline"
                onClick={(event) => {
                    if (dragging) {
                        event.preventDefault();
                    }
                }}
            >
                {deal.title}
            </Link>
            <p className="mt-1 text-sm text-muted-foreground">
                {deal.customer?.name ?? 'No customer'}
            </p>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                <span className="font-medium">
                    {formatMoney(deal.value, deal.currency)}
                </span>
                <span className="text-muted-foreground">
                    {deal.assigned_to?.name ?? 'Unassigned'}
                </span>
            </div>
        </div>
    );
}
