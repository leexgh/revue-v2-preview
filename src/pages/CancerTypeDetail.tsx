import React from 'react';
import { Link, useParams } from 'react-router-dom';
import DataTable, { Column } from '../components/DataTable';
import {
    BarRow,
    Breadcrumbs,
    Card,
    Chip,
    Empty,
    LevelPill,
    Notice,
} from '../components/ui';
import { Variant } from '../model/v2';
import {
    bundle,
    cancerTypeUrl,
    eventUrl,
    eventsForCancerType,
    geneUrl,
    getEvent,
    observedCount,
    variantUrl,
    variantsObservedIn,
} from '../store/bundle';

export const CancerTypeDetail: React.FC = () => {
    const code = decodeURIComponent(useParams().code || '');
    const node = bundle.oncotree[code];
    const summary = bundle.cancerTypeIndex[code];
    const curatedEvents = eventsForCancerType(code);
    const observed = variantsObservedIn(code);

    if (!node && !summary) {
        return (
            <div className="page">
                <Empty>No cancer type with code “{code}”.</Empty>
            </div>
        );
    }

    const name = node?.name || summary?.name || code;
    const totalOccurrences = observed.reduce(
        (sum, variant) => sum + observedCount(variant, code),
        0
    );

    const byGene = new Map<string, number>();
    observed.forEach(variant => {
        byGene.set(
            variant.gene,
            (byGene.get(variant.gene) || 0) + observedCount(variant, code)
        );
    });
    const geneRows = Array.from(byGene.entries()).sort((a, b) => b[1] - a[1]);
    const maxGene = geneRows[0]?.[1] || 0;

    const columns: Column<Variant>[] = [
        {
            id: 'id',
            header: 'Variant',
            value: variant => variant.id,
            render: variant => (
                <Link className="mono" to={variantUrl(variant.id)}>
                    {variant.id}
                </Link>
            ),
        },
        {
            id: 'gene',
            header: 'Gene',
            value: variant => variant.gene,
            render: variant => (
                <Link className="mono" to={geneUrl(variant.gene)}>
                    {variant.gene}
                </Link>
            ),
            width: 80,
        },
        {
            id: 'revised',
            header: 'Revised effect',
            value: variant => variant.revisedProteinEffect || '',
            render: variant => (
                <span className="mono small">{variant.revisedProteinEffect || '—'}</span>
            ),
        },
        {
            id: 'event',
            header: 'Event',
            value: variant => variant.eventId,
            render: variant => (
                <Link className="small" to={eventUrl(variant.eventId)}>
                    {getEvent(variant.eventId)?.name || variant.eventId}
                </Link>
            ),
        },
        {
            id: 'level',
            header: 'OncoKB',
            value: variant => variant.oncokb.highestLevel || '',
            render: variant => <LevelPill level={variant.oncokb.highestLevel} />,
            width: 96,
        },
        {
            id: 'here',
            header: 'In this cancer type',
            value: variant => observedCount(variant, code),
            align: 'right',
            render: variant => (
                <span className="mono">
                    {observedCount(variant, code).toLocaleString()}
                </span>
            ),
            width: 150,
        },
    ];

    return (
        <div className="page stack">
            <div className="detail-header">
                <Breadcrumbs
                    items={[
                        { label: 'Cancer types', to: '/cancer-types' },
                        { label: name },
                    ]}
                />
                <div className="detail-title">
                    <h1>{name}</h1>
                    <span className="chip chip-neutral mono">{code}</span>
                    {node?.inOncoTree ? (
                        <a
                            className="small"
                            href={`https://oncotree.mskcc.org/#/home?search=${encodeURIComponent(
                                code
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                        >
                            OncoTree ↗
                        </a>
                    ) : (
                        <span className="placeholder-tag">not mapped to OncoTree</span>
                    )}
                </div>
                <div className="row small muted">
                    {node?.mainType && <span>Main type: {node.mainType}</span>}
                    {node?.tissue && <span>· Tissue: {node.tissue}</span>}
                    {node?.parent && node.parent !== 'TISSUE' && (
                        <span>
                            · Parent:{' '}
                            <Link to={cancerTypeUrl(node.parent)}>{node.parent}</Link>
                        </span>
                    )}
                </div>
            </div>

            <div className="stat-grid">
                <div className="stat">
                    <div className="stat-value">{curatedEvents.length}</div>
                    <div className="stat-label">Curated events</div>
                </div>
                <div className="stat">
                    <div className="stat-value">{observed.length}</div>
                    <div className="stat-label">Variants observed here</div>
                </div>
                <div className="stat">
                    <div className="stat-value">{totalOccurrences.toLocaleString()}</div>
                    <div className="stat-label">Occurrences in cohorts</div>
                </div>
                <div className="stat">
                    <div className="stat-value">{geneRows.length}</div>
                    <div className="stat-label">Genes involved</div>
                </div>
            </div>

            {curatedEvents.length === 0 && (
                <Notice tone="warn">
                    No curated association points at {name}. Everything below is observed
                    data: reVUE variants that happen to occur in this cancer type in the
                    cohorts.
                </Notice>
            )}

            {curatedEvents.length > 0 && (
                <Card title="Curated cancer type associations">
                    <div className="stack" style={{ gap: 14 }}>
                        {curatedEvents.map(event => {
                            const entry = event.cancerTypes.find(
                                item => item.code === code
                            )!;
                            return (
                                <div key={event.id} className="spread">
                                    <div style={{ minWidth: 0 }}>
                                        <div className="row">
                                            <Link
                                                to={eventUrl(event.id)}
                                                style={{ fontWeight: 600 }}
                                            >
                                                {event.name}
                                            </Link>
                                            <Chip>{entry.origin}</Chip>
                                            {entry.placeholder && (
                                                <span className="placeholder-tag">
                                                    needs curator
                                                </span>
                                            )}
                                        </div>
                                        <div className="small muted">
                                            {event.mechanism}
                                            {entry.note && ` — ${entry.note}`}
                                        </div>
                                        {entry.sources.length > 0 && (
                                            <div className="tiny faint">
                                                Sources: {entry.sources.join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <div className="row">
                                        <Link
                                            className="chip chip-neutral chip-link mono"
                                            to={geneUrl(event.gene)}
                                        >
                                            {event.gene}
                                        </Link>
                                        <LevelPill level={event.highestLevel} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            )}

            {geneRows.length > 0 && (
                <Card title="Occurrences by gene">
                    {geneRows.map(([gene, count]) => (
                        <BarRow
                            key={gene}
                            label={
                                <Link className="mono" to={geneUrl(gene)}>
                                    {gene}
                                </Link>
                            }
                            value={count}
                            max={maxGene}
                        />
                    ))}
                </Card>
            )}

            <Card title={`Variants observed in ${name} in cohorts`} pad={false}>
                <DataTable
                    rows={observed}
                    columns={columns}
                    rowKey={variant => variant.id}
                    initialSort={{ id: 'here', desc: true }}
                    emptyMessage="No reVUE variant has been observed in this cancer type."
                />
            </Card>
        </div>
    );
};

export default CancerTypeDetail;
