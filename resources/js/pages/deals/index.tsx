import { Head, Link } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';

import {
    PipelineBoard,
    type BoardColumn,
} from '@/components/deals/pipeline-board';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import { dashboard } from '@/routes';
import deals from '@/routes/deals';

type Props = {
    pipeline: {
        id: number;
        name: string;
    };
    columns: BoardColumn[];
    can: {
        create: boolean;
        change_stage: boolean;
    };
};

export default function DealsIndex({ pipeline, columns, can }: Props) {
    const [boardColumns, setBoardColumns] = useState(columns);

    useEffect(() => {
        setBoardColumns(columns);
    }, [columns]);

    return (
        <>
            <Head title="Deals" />

            <div className="flex h-full flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <Heading
                        title="Deals"
                        description={pipeline.name}
                    />
                    {can.create && (
                        <Button asChild>
                            <Link href={deals.create()}>
                                <Plus />
                                New deal
                            </Link>
                        </Button>
                    )}
                </div>

                <PipelineBoard
                    columns={boardColumns}
                    canChangeStage={can.change_stage}
                />
            </div>
        </>
    );
}

DealsIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Deals', href: deals.index() },
    ],
};
