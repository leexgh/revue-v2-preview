import React from 'react';
import { Link, useParams } from 'react-router-dom';
import DataTable, { Column } from '../components/DataTable';
import {
    Breadcrumbs,
    CancerTypeList,
    Card,
    Chip,
    Empty,
    ExternalLink,
    LevelPill,
} from '../components/ui';
import { Variant } from '../model/v2';
import {
    eventUrl,
    eventsForGene,
    getEvent,
    getGene,
    variantTotal,
    variantUrl,
    variantsForGene,
} from '../store/bundle';

export const GeneDetail: React.FC = () => {
    const symbol = decodeURIComponent(useParams().gene || '');
    const gene = getGene(symbol);
    const events = eventsForGene(symbol);
    const variants = variantsForGene(symbol);

    if (!gene) {
        return (
            <div className="page">
                <Empty>No gene “{symbol}” in this release.</Empty>
            </div>
        );
    }

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
            id: 'vep',
            header: 'VEP predicts',
            value: variant => variant.vepPredictedProteinEffect || '',
            render: variant => (
                <span className="mono small">
                    {variant.vepPredictedProteinEffect || '—'}
                </span>
            ),
        },
        {
            id: 'revised',
            header: 'Revised to',
            value: variant => variant.revisedProteinEffect || '',
            render: variant => (
                <span className="mono small" style={{ fontWeight: 600 }}>
                    {variant.revisedProteinEffect || '—'}
                </span>
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
            id: 'count',
            header: 'Occurrences',
            value: variant => variantTotal(variant),
            align: 'right',
            render: variant => (
                <span className="mono">{variantTotal(variant).toLocaleString()}</span>
            ),
            width: 110,
        },
    ];

    return (
        <div className="page stack">
            <div className="detail-header">
                <Breadcrumbs items={[{ label: 'Genes', to: '/genes' }, { label: symbol }]} />
                <div className="detail-title">
                    <h1 className="mono">{symbol}</h1>
                    <Chip>{events.length} events</Chip>
                    <Chip>{variants.length} variants</Chip>
                    <span className="mono small faint">{gene.transcriptId}</span>
                    <ExternalLink
                        href={`https://www.genomenexus.org/gene/${symbol}`}
                    >
                        Genome Nexus
                    </ExternalLink>
                    <ExternalLink href={`https://www.oncokb.org/gene/${symbol}`}>
                        OncoKB
                    </ExternalLink>
                </div>
            </div>

            <div className="browse-grid">
                {events.map(event => (
                    <Link key={event.id} className="browse-card" to={eventUrl(event.id)}>
                        <h3>{event.name}</h3>
                        <div className="tiny faint mono" style={{ marginBottom: 6 }}>
                            {event.id}
                        </div>
                        <p style={{ marginBottom: 8 }}>{event.mechanism}</p>
                        <div className="row" style={{ gap: 6 }}>
                            <Chip tone="accent">{event.outcome}</Chip>
                            <Chip>
                                {event.variantCount} variant
                                {event.variantCount === 1 ? '' : 's'}
                            </Chip>
                            <LevelPill level={event.highestLevel} />
                        </div>
                        <div style={{ marginTop: 8 }}>
                            <CancerTypeList
                                entries={event.cancerTypes}
                                limit={3}
                                linked={false}
                            />
                        </div>
                    </Link>
                ))}
            </div>

            <Card title={`All ${variants.length} variants in ${symbol}`} pad={false}>
                <DataTable
                    rows={variants}
                    columns={columns}
                    rowKey={variant => variant.id}
                    initialSort={{ id: 'count', desc: true }}
                />
            </Card>
        </div>
    );
};

export default GeneDetail;
