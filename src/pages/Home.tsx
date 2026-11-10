import React from 'react';
import { Link } from 'react-router-dom';
import {
    bundle,
    cancerTypeUrl,
    curatedCancerTypes,
    eventUrl,
    events,
    totals,
} from '../store/bundle';
import { CancerTypeList, Card, Chip, LevelPill, Notice, Stat } from '../components/ui';

const topEvents = [...events]
    .sort(
        (a, b) =>
            b.counts.somatic + b.counts.germline - (a.counts.somatic + a.counts.germline)
    )
    .slice(0, 8);

// Actionable = OncoKB gives at least one of the event's variants a therapeutic
// level. Curated cancer types say where an event is seen, not whether it is
// actionable.
const levelRank = ['LEVEL_1', 'LEVEL_2', 'LEVEL_3A', 'LEVEL_3B', 'LEVEL_4'];
const actionableEvents = events
    .filter(event => event.highestLevel)
    .sort(
        (a, b) =>
            levelRank.indexOf(a.highestLevel || '') -
                levelRank.indexOf(b.highestLevel || '') ||
            a.name.localeCompare(b.name)
    );

export const Home: React.FC = () => (
    <div className="page stack" style={{ gap: 26 }}>
        <section className="hero">
            <h1>Variants with unexpected effects</h1>
            <p>
                reVUE curates variants whose real effect on the protein differs from what
                annotation tools predict — splice changes that skip, extend or shorten an
                exon, and promoter changes that re-wire expression. Every entry carries its
                revised protein effect, the evidence behind it, and the cancer types it is
                associated with.
            </p>
            <div className="row" style={{ marginTop: 18, gap: 10 }}>
                <Link className="chip chip-accent chip-link" to="/events">
                    Browse {totals.events} events →
                </Link>
                <Link className="chip chip-link chip-neutral" to="/variants">
                    {totals.variants} variants
                </Link>
                <Link className="chip chip-link chip-neutral" to="/cancer-types">
                    {totals.cancerTypes} curated cancer types
                </Link>
            </div>
        </section>

        <div className="stat-grid">
            <Stat value={totals.genes} label="Genes" />
            <Stat
                value={totals.events}
                label="Events (abnormal transcripts)"
                hint="One event = one abnormal transcript, with every variant that causes it"
            />
            <Stat
                value={totals.variants}
                label="Curated variants"
                hint={`${totals.sourceRows} rows in the source data; ${totals.mergedRecords} id collision merged into one record`}
            />
            <Stat
                value={totals.cancerTypes}
                label="Cancer types with curated associations"
            />
            <Stat
                value={totals.occurrences.toLocaleString()}
                label="Cohort occurrences"
                hint="MSK-IMPACT, GENIE and TCGA combined"
            />
            <Stat
                value={totals.actionable}
                label="Events with an OncoKB level"
                hint="At least one variant in the event carries an OncoKB therapeutic level"
            />
        </div>

        <Notice tone="warn">
            <strong>Preview build.</strong> {bundle.notice}
        </Notice>

        <div className="browse-grid">
            <Link className="browse-card" to="/events">
                <div className="count">{totals.events}</div>
                <h3>Events</h3>
                <p>
                    Grouped by abnormal transcript — the unit of curation in v2. Filter by
                    outcome, gene or cancer type.
                </p>
            </Link>
            <Link className="browse-card" to="/variants">
                <div className="count">{totals.variants}</div>
                <h3>Variants</h3>
                <p>
                    Every curated variant with its VEP prediction, the revised effect, and
                    where it has been observed.
                </p>
            </Link>
            <Link className="browse-card" to="/cancer-types">
                <div className="count">{totals.cancerTypes}</div>
                <h3>Cancer types</h3>
                <p>
                    New in v2: curated disease associations on OncoTree codes, next to the
                    distribution actually observed in cohorts.
                </p>
            </Link>
            <Link className="browse-card" to="/genes">
                <div className="count">{totals.genes}</div>
                <h3>Genes</h3>
                <p>
                    Each gene's events, reference transcript and the variants filed under
                    it.
                </p>
            </Link>
        </div>

        <Card
            title={`Actionable: events with an OncoKB therapeutic level (${actionableEvents.length})`}
            actions={
                <Link className="small" to="/cancer-types">
                    All cancer types →
                </Link>
            }
        >
            <div className="stack" style={{ gap: 10 }}>
                {actionableEvents.map(event => (
                    <div key={event.id} className="spread">
                        <div style={{ minWidth: 0 }}>
                            <Link to={eventUrl(event.id)} style={{ fontWeight: 600 }}>
                                {event.name}
                            </Link>
                            <div className="small muted">{event.mechanism}</div>
                        </div>
                        <div className="row">
                            <CancerTypeList entries={event.cancerTypes} limit={2} />
                            <LevelPill level={event.highestLevel} />
                        </div>
                    </div>
                ))}
            </div>
        </Card>

        <div className="two-col">
            <Card title="Most frequently observed events">
                <div className="stack" style={{ gap: 9 }}>
                    {topEvents.map(event => {
                        const total = event.counts.somatic + event.counts.germline;
                        const top = event.observedCancerTypes[0];
                        return (
                            <div key={event.id} className="spread">
                                <div style={{ minWidth: 0 }}>
                                    <Link className="small" to={eventUrl(event.id)}>
                                        {event.name}
                                    </Link>
                                    <div className="tiny muted">
                                        {event.variantCount} variant
                                        {event.variantCount === 1 ? '' : 's'}
                                        {top && ` · mostly ${top.name}`}
                                    </div>
                                </div>
                                <span className="mono small nowrap">
                                    {total.toLocaleString()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </Card>

            <Card title="Curated cancer types">
                <div className="row" style={{ gap: 6 }}>
                    {curatedCancerTypes.map(entry => (
                        <Chip key={entry.code} to={cancerTypeUrl(entry.code)}>
                            {entry.name}
                            <span className="faint" style={{ fontWeight: 500 }}>
                                {entry.events.length}
                            </span>
                        </Chip>
                    ))}
                </div>
            </Card>
        </div>

        <Card title="What is new in this release">
            <div className="kv">
                <dt>Event model</dt>
                <dd>
                    {totals.variants} variants are grouped into {totals.events} events. An
                    event is one abnormal transcript — MET exon 14 skipping, KIT exon 11
                    shortening — and holds the description and cancer types its variants
                    share.
                </dd>
                <dt>Cancer types</dt>
                <dd>
                    {bundle.stats.curatedAssociations} curated cancer types on OncoTree
                    codes, each somatic or germline, shown next to the distribution
                    observed in MSK-IMPACT, GENIE and TCGA.
                </dd>
                <dt>Evidence</dt>
                <dd>
                    Each variant lists evidence items per source, with the assay type, the
                    sample it was seen in, and where in the paper to check it.
                </dd>
                <dt>No confirmed flag</dt>
                <dd>
                    v1 split entries into confirmed and unconfirmed, which acted as an
                    on/off switch in Genome Nexus and hid most of the data. It is gone:
                    everything curated here is a VUE, and every entry's revised effect is
                    applied. What a reader judges it by is the evidence on the variant.
                </dd>
                <dt>Actionability</dt>
                <dd>
                    Comes from OncoKB: {totals.withOncoKbLevel} variants across{' '}
                    {totals.actionable} events carry a therapeutic level.
                </dd>
                <dt>Identifiers</dt>
                <dd>
                    Variants are named by their cDNA change — {' '}
                    <span className="mono">MET:c.3028+1G&gt;A</span> — and events by gene,
                    exon and outcome. Because ids are HGVSc-based, equivalent genomic
                    spellings of one change collapse into a single record: {totals.sourceRows}{' '}
                    source rows become {totals.variants} variants.
                </dd>
                <dt>Versioning</dt>
                <dd>
                    Every event and variant carries a version and an append-only history;
                    the dataset itself is released as{' '}
                    <span className="mono">{bundle.release}</span>.
                </dd>
            </div>
        </Card>
    </div>
);

export default Home;
