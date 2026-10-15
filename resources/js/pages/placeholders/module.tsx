import { Head } from '@inertiajs/react';
import { Construction } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useT } from '@/lib/i18n';
import { dashboard } from '@/routes';

type Props = {
    module: string;
    stage: number;
};

export default function ModulePlaceholder({ module, stage }: Props) {
    const { t } = useT();

    return (
        <>
            <Head title={t(module)} />

            <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
                <h1 className="hidden text-2xl font-semibold tracking-tight md:block">
                    {t(module)}
                </h1>
                <EmptyState
                    icon={Construction}
                    title={t('Section is being prepared')}
                    description={t(
                        'This module will be available in stage :stage. Navigation is already in place.',
                        { stage },
                    )}
                />
            </div>
        </>
    );
}

ModulePlaceholder.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: props.module, href: '#' },
    ],
});
