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

const IGV_SRC = 'https://cdn.jsdelivr.net/npm/igv@3.8.10/dist/igv.min.js';

let igvLoader: Promise<any> | null = null;

/** Load igv.js once per page and resolve with the global it installs. */
const loadIgv = (): Promise<any> => {
    if ((window as any).igv?.createBrowser) {
        return Promise.resolve((window as any).igv);
    }
    if (igvLoader) {
        return igvLoader;
    }
    igvLoader = new Promise((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>(
            `script[src="${IGV_SRC}"]`
        );
        const script = existing || document.createElement('script');
        const done = () => {
            const igv = (window as any).igv;
            if (igv?.createBrowser) {
                resolve(igv);
            } else {
                reject(new Error('igv.js loaded but did not expose createBrowser.'));
            }
        };
        script.addEventListener('load', done);
        script.addEventListener('error', () =>
            reject(new Error('igv.js could not be loaded from the CDN.'))
        );
        if (!existing) {
            script.src = IGV_SRC;
            script.async = true;
            document.head.appendChild(script);
        }
    });
    igvLoader.catch(() => {
        igvLoader = null;        // let a later mount retry
    });
    return igvLoader;
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

        // igv.js is loaded from its CDN rather than bundled. The npm UMD build
        // takes a CommonJS path once webpack optimises it for production and
        // throws "require is not defined"; the ESM build resolves to an empty
        // namespace under CRA. A script tag sidesteps both, and igv.js already
        // needs the network for the hg19 reference.
        loadIgv()
            .then(igv => {
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
