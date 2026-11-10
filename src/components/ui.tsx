import React from 'react';
import { Link } from 'react-router-dom';
import { CuratedCancerType, ObservedCancerType } from '../model/v2';
import { cancerTypeUrl } from '../store/bundle';

/* ---------------------------------------------------------------- chips */

export const Chip: React.FC<{
    tone?: 'neutral' | 'accent' | 'ok' | 'warn' | 'danger' | 'curated';
    to?: string;
    title?: string;
    children: React.ReactNode;
}> = ({ tone = 'neutral', to, title, children }) => {
    const className = `chip chip-${tone}${to ? ' chip-link' : ''}`;
    if (to) {
        return (
            <Link className={className} to={to} title={title}>
                {children}
            </Link>
        );
    }
    return (
        <span className={className} title={title}>
            {children}
        </span>
    );
};

export const CancerTypeChip: React.FC<{
    entry: CuratedCancerType;
    /** Set false inside another link — nested anchors are invalid HTML. */
    linked?: boolean;
}> = ({ entry, linked = true }) => (
    <Chip
        tone="curated"
        to={linked ? cancerTypeUrl(entry.code) : undefined}
        title={`${entry.name} (${entry.code}), ${entry.origin}${
            entry.note ? `. ${entry.note}` : ''
        }${entry.placeholder ? '. Placeholder: needs curator review.' : ''}`}
    >
        <span className="chip-dot" />
        {entry.name}
        {entry.placeholder && <span style={{ opacity: 0.8 }}>?</span>}
    </Chip>
);

export const ObservedChip: React.FC<{ row: ObservedCancerType }> = ({ row }) => (
    <Chip
        to={cancerTypeUrl(row.code)}
        title={`${row.count} occurrence${row.count === 1 ? '' : 's'} (${Math.round(
            row.fraction * 100
        )}% of this record's cohort occurrences)`}
    >
        {row.name}
        <span className="faint" style={{ fontWeight: 500 }}>
            {row.count}
        </span>
    </Chip>
);

export const CancerTypeList: React.FC<{
    entries: CuratedCancerType[];
    limit?: number;
    linked?: boolean;
}> = ({ entries, limit, linked = true }) => {
    if (!entries.length) {
        return <span className="faint small">—</span>;
    }
    const shown = limit ? entries.slice(0, limit) : entries;
    const rest = entries.length - shown.length;
    return (
        <span className="row" style={{ gap: 4 }}>
            {shown.map(entry => (
                <CancerTypeChip key={entry.code} entry={entry} linked={linked} />
            ))}
            {rest > 0 && <span className="faint tiny">+{rest}</span>}
        </span>
    );
};

export const LevelPill: React.FC<{ level: string | null }> = ({ level }) =>
    level ? (
        <span className={`level-pill level-${level}`}>
            {level.replace('LEVEL_', 'Level ')}
        </span>
    ) : (
        <span className="faint">—</span>
    );

export const PlaceholderTag: React.FC<{ label?: string; title?: string }> = ({
    label = 'placeholder',
    title = 'Not curated data. The v1 source has no value for this field; the v2 preview fills it in.',
}) => (
    <span className="placeholder-tag" title={title}>
        {label}
    </span>
);

/* -------------------------------------------------------------- layout */

export const Card: React.FC<{
    title?: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
    pad?: boolean;
    id?: string;
}> = ({ title, actions, children, pad = true, id }) => (
    <section className="card" id={id}>
        {title && (
            <div className="card-head">
                <h2>{title}</h2>
                {actions}
            </div>
        )}
        {pad ? <div className="card-pad">{children}</div> : children}
    </section>
);

export const Stat: React.FC<{
    value: React.ReactNode;
    label: string;
    hint?: string;
}> = ({ value, label, hint }) => (
    <div className="stat" title={hint}>
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
    </div>
);

export const Notice: React.FC<{
    tone?: 'info' | 'warn';
    children: React.ReactNode;
}> = ({ tone = 'info', children }) => (
    <div className={`notice notice-${tone}`}>
        <span aria-hidden="true">{tone === 'warn' ? '!' : 'i'}</span>
        <div>{children}</div>
    </div>
);

export const Breadcrumbs: React.FC<{
    items: { label: string; to?: string }[];
}> = ({ items }) => (
    <nav className="breadcrumbs">
        {items.map((item, index) => (
            <React.Fragment key={`${item.label}-${index}`}>
                {index > 0 && <span className="faint">/</span>}
                {item.to ? <Link to={item.to}>{item.label}</Link> : <span>{item.label}</span>}
            </React.Fragment>
        ))}
    </nav>
);

export const BarRow: React.FC<{
    label: React.ReactNode;
    value: number;
    max: number;
    suffix?: string;
    tone?: 'somatic' | 'germline';
}> = ({ label, value, max, suffix, tone = 'somatic' }) => (
    <div className="bar-row">
        <div className="nowrap" style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {label}
        </div>
        <div className="bar-track">
            <div
                className={`bar-fill ${tone}`}
                style={{ width: `${max ? Math.max(2, (value / max) * 100) : 0}%` }}
            />
        </div>
        <div className="right mono tiny">
            {value}
            {suffix}
        </div>
    </div>
);

export const Tabs: React.FC<{
    tabs: { id: string; label: React.ReactNode }[];
    active: string;
    onChange: (id: string) => void;
}> = ({ tabs, active, onChange }) => (
    <div className="tab-bar">
        {tabs.map(tab => (
            <button
                key={tab.id}
                className={`tab${tab.id === active ? ' active' : ''}`}
                onClick={() => onChange(tab.id)}
            >
                {tab.label}
            </button>
        ))}
    </div>
);

export const ExternalLink: React.FC<{
    href: string;
    children: React.ReactNode;
}> = ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer">
        {children}
        <span aria-hidden="true" style={{ fontSize: '0.8em', marginLeft: 3 }}>
            ↗
        </span>
    </a>
);

export const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="empty">{children}</div>
);
