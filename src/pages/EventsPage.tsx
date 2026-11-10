import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable, { Column } from '../components/DataTable';
import { CancerTypeList, Card, Chip, LevelPill } from '../components/ui';
import { VueEvent } from '../model/v2';
import {
    curatedCancerTypes,
    eventUrl,
    events,
    geneUrl,
    genes,
    outcomeLabel,
} from '../store/bundle';

const OUTCOMES = Array.from(new Set(events.map(event => event.outcomeCode)));

export const EventsPage: React.FC = () => {
    const [text, setText] = useState('');
    const [gene, setGene] = useState('');
    const [outcome, setOutcome] = useState('');
    const [cancerType, setCancerType] = useState('');

    const rows = useMemo(() => {
        const needle = text.trim().toLowerCase();
        return events.filter(event => {
            if (gene && event.gene !== gene) {
                return false;
            }
            if (outcome && event.outcomeCode !== outcome) {
                return false;
            }
            if (
                cancerType &&
                !event.cancerTypes.some(entry => entry.code === cancerType)
            ) {
                return false;
            }
            if (!needle) {
                return true;
            }
            return `${event.id} ${event.name} ${event.gene} ${event.outcome} ${
                event.mechanism
            } ${event.location} ${event.cancerTypes
                .map(entry => entry.name)
                .join(' ')}`
                .toLowerCase()
                .includes(needle);
        });
    }, [text, gene, outcome, cancerType]);

    const columns: Column<VueEvent>[] = [
        {
            id: 'id',
            header: 'Event',
            value: event => event.name,
            render: event => (
                <>
                    <Link to={eventUrl(event.id)} style={{ fontWeight: 600 }}>
                        {event.name}
                    </Link>
                    {event.warnings.length > 0 && (
                        <span
                            className="placeholder-tag"
                            style={{ marginLeft: 6 }}
                            title={event.warnings.join('\n\n')}
                        >
                            check grouping
                        </span>
                    )}
                    <div className="tiny muted" style={{ maxWidth: 380 }}>
                        {event.mechanism}
                    </div>
                    <div className="tiny faint mono">{event.id}</div>
                </>
            ),
        },
        {
            id: 'gene',
            header: 'Gene',
            value: event => event.gene,
            render: event => (
                <Link className="mono" to={geneUrl(event.gene)}>
                    {event.gene}
                </Link>
            ),
            width: 90,
        },
        {
            id: 'outcome',
            header: 'Outcome',
            value: event => event.outcome,
            render: event => <Chip>{event.outcome}</Chip>,
        },
        {
            id: 'variants',
            header: 'Variants',
            value: event => event.variantCount,
            align: 'right',
            width: 90,
        },
        {
            id: 'cancerTypes',
            header: 'Curated cancer types',
            value: event => event.cancerTypes.map(entry => entry.name).join(', '),
            render: event => <CancerTypeList entries={event.cancerTypes} limit={3} />,
        },
        {
            id: 'observed',
            header: 'Mostly observed in',
            value: event => event.observedCancerTypes[0]?.name || '',
            render: event => {
                const top = event.observedCancerTypes[0];
                if (!top) {
                    return <span className="faint">—</span>;
                }
                return (
                    <span className="small">
                        {top.name}{' '}
                        <span className="faint">{Math.round(top.fraction * 100)}%</span>
                    </span>
                );
            },
        },
        {
            id: 'level',
            header: 'OncoKB',
            value: event => event.highestLevel || '',
            render: event => <LevelPill level={event.highestLevel} />,
            width: 100,
        },
        {
            id: 'occurrences',
            header: 'Occurrences',
            value: event => event.counts.somatic + event.counts.germline + event.counts.unknown,
            align: 'right',
            render: event => (
                <span className="mono">
                    {(
                        event.counts.somatic +
                        event.counts.germline +
                        event.counts.unknown
                    ).toLocaleString()}
                </span>
            ),
            width: 110,
        },
    ];

    return (
        <div className="page stack">
            <div className="spread">
                <div>
                    <h1>Events</h1>
                    <p className="muted" style={{ marginTop: 6 }}>
                        One event is one abnormal transcript and every curated variant that
                        causes it.
                    </p>
                </div>
            </div>

            <Card
                title={`${rows.length} of ${events.length} events`}
                pad={false}
                actions={
                    <div className="filters">
                        <input
                            className="filter-input"
                            placeholder="Filter events…"
                            value={text}
                            onChange={event => setText(event.target.value)}
                        />
                        <select
                            className="filter-select"
                            value={gene}
                            onChange={event => setGene(event.target.value)}
                        >
                            <option value="">All genes</option>
                            {genes.map(entry => (
                                <option key={entry.gene} value={entry.gene}>
                                    {entry.gene}
                                </option>
                            ))}
                        </select>
                        <select
                            className="filter-select"
                            value={outcome}
                            onChange={event => setOutcome(event.target.value)}
                        >
                            <option value="">All outcomes</option>
                            {OUTCOMES.map(code => (
                                <option key={code} value={code}>
                                    {outcomeLabel[code] || code}
                                </option>
                            ))}
                        </select>
                        <select
                            className="filter-select"
                            value={cancerType}
                            onChange={event => setCancerType(event.target.value)}
                        >
                            <option value="">All cancer types</option>
                            {curatedCancerTypes.map(entry => (
                                <option key={entry.code} value={entry.code}>
                                    {entry.name}
                                </option>
                            ))}
                        </select>
                        {(text || gene || outcome || cancerType) && (
                            <button
                                className="ghost-button"
                                onClick={() => {
                                    setText('');
                                    setGene('');
                                    setOutcome('');
                                    setCancerType('');
                                }}
                            >
                                Clear
                            </button>
                        )}
                    </div>
                }
            >
                <DataTable
                    rows={rows}
                    columns={columns}
                    rowKey={event => event.id}
                    initialSort={{ id: 'occurrences', desc: true }}
                    sortLast={event => event.gene === 'TERT'}
                />
            </Card>
        </div>
    );
};

export default EventsPage;
