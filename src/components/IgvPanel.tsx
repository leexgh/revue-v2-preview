import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Variant } from '../model/v2';

const PADDING = 60;

/** chr / start / end parsed from the MAF-style genomicLocation. */
const parseLocus = (genomicLocation: string) => {
    const parts = (genomicLocation || '').split(',');
    if (parts.length < 3) {
        return null;
    }
    const chromosome = parts[0];
    const start = Number(parts[1]);
    const end = Number(parts[2]);
    if (!chromosome || !Number.isFinite(start) || !Number.isFinite(end)) {
        return null;
    }
    return {
        chr: `chr${chromosome}`,
        start,
        end,
        locus: `chr${chromosome}:${Math.max(1, start - PADDING)}-${end + PADDING}`,
    };
};

export const IgvPanel: React.FC<{ variant: Variant }> = ({ variant }) => {
    const container = useRef<HTMLDivElement>(null);
    // Shown by default; the button hides it.
    const [open, setOpen] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Memoised so the effect below does not re-run on every render.
    const position = useMemo(
        () => parseLocus(variant.genomicLocation),
        [variant.genomicLocation]
    );
    const label = variant.revisedProteinEffect || variant.id;

    useEffect(() => {
        const host = container.current;
        if (!open || !host || !position) {
            return;
        }
        let browser: any;
        let cancelled = false;
        setLoading(true);
        setError(null);

        // Each effect run gets its own node inside the host, so a run that is
        // torn down mid-load (React StrictMode mounts twice in development)
        // removes only its own browser, never the one that replaced it.
        const mount = document.createElement('div');
        host.appendChild(mount);

        // The UMD build interops cleanly with webpack; the ESM one resolves to an
        // empty namespace here. igv.js is ~1.5 MB and pulls the hg19 reference
        // from igv.org, so it stays a lazy import even though the panel opens by
        // default: the chunk is fetched once and cached across variant pages.
        import('igv/dist/igv.min.js')
            .then((mod: any) => {
                // The UMD bundle attaches itself to window.igv; webpack's module
                // namespace for it comes back empty, so check both.
                const igv = [mod?.default, mod, (window as any).igv].find(
                    candidate => typeof candidate?.createBrowser === 'function'
                );
                if (!igv) {
                    throw new Error('igv.js did not expose createBrowser.');
                }
                return igv.createBrowser(mount, {
                    genome: 'hg19',
                    locus: position.locus,
                    showChromosomeWidget: false,
                    roi: [
                        {
                            name: variant.id,
                            color: 'rgba(63, 78, 224, 0.25)',
                            features: [
                                {
                                    chr: position.chr,
                                    start: position.start - 1,
                                    end: position.end,
                                    name: label,
                                },
                            ],
                        },
                    ],
                });
            })
            .then((created: any) => {
                if (cancelled) {
                    created?.dispose?.();
                    mount.remove();
                    return;
                }
                browser = created;
                setLoading(false);
            })
            .catch((reason: any) => {
                if (!cancelled) {
                    setLoading(false);
                    setError(
                        reason?.message ||
                            'IGV could not load; it needs network access to fetch the hg19 reference.'
                    );
                }
            });

        return () => {
            cancelled = true;
            browser?.dispose?.();
            mount.remove();
        };
    }, [open, position, variant.id, label]);

    if (!position) {
        return null;
    }

    return (
        <div>
            <div className="spread" style={{ marginBottom: open ? 12 : 0 }}>
                <div className="small muted">
                    <span className="mono">{position.locus}</span> on GRCh37 (hg19)
                </div>
                <div className="row">
                    <button className="ghost-button" onClick={() => setOpen(!open)}>
                        {open ? 'Hide IGV' : 'Show in IGV'}
                    </button>
                    <a
                        className="small"
                        href={`https://igv.org/app/?genome=hg19&locus=${encodeURIComponent(
                            position.locus
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                    >
                        Open igv.org ↗
                    </a>
                </div>
            </div>

            {open && (
                <>
                    {loading && (
                        <div className="small faint">Loading the hg19 reference…</div>
                    )}
                    {error && (
                        <div className="small faint">
                            {error} Use the igv.org link instead.
                        </div>
                    )}
                    <div className="igv-host" ref={container} />
                </>
            )}
        </div>
    );
};

export default IgvPanel;
