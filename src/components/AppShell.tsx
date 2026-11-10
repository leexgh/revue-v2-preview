import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import GlobalSearch from './GlobalSearch';
import { bundle } from '../store/bundle';
import vueLogo from '../images/vue_logo.png';

const GOOGLE_FORM_URL =
    'https://docs.google.com/forms/d/e/1FAIpQLSemX-RHhbMhDcrvA5xT44QbK3PiBAiZNP1qhOT72wketzbw_g/viewform';

const NAV = [
    { to: '/', label: 'Overview', end: true },
    { to: '/genes', label: 'Genes' },
    { to: '/events', label: 'Events' },
    { to: '/variants', label: 'Variants' },
    { to: '/cancer-types', label: 'Cancer types' },
    { to: '/data', label: 'Data & API' },
    { to: '/about', label: 'About' },
];

type Theme = 'light' | 'dark' | 'system';

const THEME_ORDER: Theme[] = ['light', 'dark', 'system'];

const useTheme = () => {
    // Light is the default; the toggle cycles light -> dark -> system.
    const [theme, setTheme] = useState<Theme>(
        () => (localStorage.getItem('revue-theme') as Theme) || 'light'
    );
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'system') {
            root.removeAttribute('data-theme');
        } else {
            root.setAttribute('data-theme', theme);
        }
        localStorage.setItem('revue-theme', theme);
    }, [theme]);
    return { theme, setTheme };
};

export const AppShell: React.FC = () => {
    const { theme, setTheme } = useTheme();
    const location = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    const nextTheme =
        THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];

    return (
        <>
            <header className="shell-header">
                <div className="shell-header-inner">
                    <Link className="brand" to="/">
                        <img src={vueLogo} alt="" />
                        reVUE
                        <span className="brand-tag">v2 preview</span>
                    </Link>
                    <nav className="shell-nav">
                        {NAV.map(item => (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                className={({ isActive }) => (isActive ? 'active' : '')}
                            >
                                {item.label}
                            </NavLink>
                        ))}
                    </nav>
                    <div className="shell-spacer" />
                    <GlobalSearch />
                    <button
                        className="icon-button"
                        title={`Theme: ${theme}. Click for ${nextTheme}.`}
                        onClick={() => setTheme(nextTheme)}
                    >
                        {theme === 'dark' ? '☾' : theme === 'light' ? '☀' : '◐'}
                    </button>
                </div>
            </header>

            <main>
                <Outlet />
            </main>

            <footer className="shell-footer">
                <div className="shell-footer-inner">
                    <div>
                        <strong>reVUE</strong> — a repository for Variants with Unexpected
                        Effects in cancer.
                        <br />
                        Data release <span className="mono">{bundle.release}</span> ·
                        schema v{bundle.schemaVersion} · built from{' '}
                        <span className="mono">{bundle.source.file}</span>
                    </div>
                    <div>
                        <a href={GOOGLE_FORM_URL} target="_blank" rel="noreferrer">
                            Contribute a variant ↗
                        </a>
                        <br />
                        <a
                            href="https://github.com/knowledgesystems/reVUE-data"
                            target="_blank"
                            rel="noreferrer"
                        >
                            reVUE-data on GitHub ↗
                        </a>
                    </div>
                    <div className="faint">
                        All genomic positions are GRCh37 (hg19) unless stated.
                    </div>
                </div>
            </footer>
        </>
    );
};

export default AppShell;
