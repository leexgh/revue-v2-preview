import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { search, SearchItem } from '../store/bundle';

const KIND_LABEL: { [key in SearchItem['kind']]: string } = {
    gene: 'Gene',
    event: 'Event',
    variant: 'Variant',
    cancerType: 'Cancer type',
};

const KIND_TONE: { [key in SearchItem['kind']]: string } = {
    gene: 'chip-accent',
    event: 'chip-neutral',
    variant: 'chip-neutral',
    cancerType: 'chip-RECURRENT',
};

export const GlobalSearch: React.FC = () => {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [cursor, setCursor] = useState(0);
    const wrapRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    const results = useMemo(() => search(query), [query]);

    useEffect(() => {
        const onClick = (event: MouseEvent) => {
            if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        const onKey = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
                event.preventDefault();
                inputRef.current?.focus();
                setOpen(true);
            }
            if (event.key === 'Escape') {
                setOpen(false);
                inputRef.current?.blur();
            }
        };
        document.addEventListener('mousedown', onClick);
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('mousedown', onClick);
            document.removeEventListener('keydown', onKey);
        };
    }, []);

    const go = (item: SearchItem) => {
        navigate(item.url);
        setQuery('');
        setOpen(false);
        inputRef.current?.blur();
    };

    const onKeyDown = (event: React.KeyboardEvent) => {
        if (!results.length) {
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setCursor(current => (current + 1) % results.length);
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            setCursor(current => (current - 1 + results.length) % results.length);
        } else if (event.key === 'Enter') {
            event.preventDefault();
            go(results[Math.min(cursor, results.length - 1)]);
        }
    };

    return (
        <div className="search" ref={wrapRef}>
            <div className="search-input-wrap">
                <span className="faint" aria-hidden="true">
                    ⌕
                </span>
                <input
                    ref={inputRef}
                    value={query}
                    placeholder="Search genes, variants, events, cancer types"
                    onChange={event => {
                        setQuery(event.target.value);
                        setCursor(0);
                        setOpen(true);
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={onKeyDown}
                    aria-label="Search reVUE"
                />
                <kbd>⌘K</kbd>
            </div>
            {open && query.trim() !== '' && (
                <div className="search-results">
                    {results.map((item, index) => (
                        <div
                            key={`${item.kind}-${item.id}`}
                            className={`search-result${index === cursor ? ' active' : ''}`}
                            onMouseEnter={() => setCursor(index)}
                            onClick={() => go(item)}
                        >
                            <span className={`chip ${KIND_TONE[item.kind]}`}>
                                {KIND_LABEL[item.kind]}
                            </span>
                            <span style={{ minWidth: 0 }}>
                                <div className="search-result-label mono">{item.label}</div>
                                <div className="search-result-sub">{item.sublabel}</div>
                            </span>
                        </div>
                    ))}
                    {!results.length && (
                        <div className="search-empty">No match for “{query}”.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
