import React from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';

import AppShell from '../components/AppShell';
import Home from './Home';
import EventsPage from './EventsPage';
import EventDetail from './EventDetail';
import VariantsPage from './VariantsPage';
import VariantDetail from './VariantDetail';
import CancerTypesPage from './CancerTypesPage';
import CancerTypeDetail from './CancerTypeDetail';
import GenesPage from './GenesPage';
import GeneDetail from './GeneDetail';
import DataAccess from './DataAccess';
import About from './About';
import { Empty } from '../components/ui';

export const Main: React.FC = () => (
    <HashRouter>
        <Routes>
            <Route element={<AppShell />}>
                <Route path="/" element={<Home />} />
                <Route path="/events" element={<EventsPage />} />
                <Route path="/event/:id" element={<EventDetail />} />
                <Route path="/variants" element={<VariantsPage />} />
                <Route path="/variant/:id" element={<VariantDetail />} />
                <Route path="/cancer-types" element={<CancerTypesPage />} />
                <Route path="/cancer-type/:code" element={<CancerTypeDetail />} />
                <Route path="/genes" element={<GenesPage />} />
                <Route path="/gene/:gene" element={<GeneDetail />} />
                {/* v1 route kept so old links keep working */}
                <Route path="/vue/:gene" element={<GeneDetail />} />
                <Route path="/data" element={<DataAccess />} />
                <Route path="/usage" element={<DataAccess />} />
                <Route path="/about" element={<About />} />
                <Route
                    path="*"
                    element={
                        <div className="page">
                            <Empty>Page not found.</Empty>
                        </div>
                    }
                />
            </Route>
        </Routes>
    </HashRouter>
);

export default Main;
