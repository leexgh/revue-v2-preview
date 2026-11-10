import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';
import { events, totals, variants } from './store/bundle';

test('renders the overview page', () => {
    render(<App />);
    expect(
        screen.getByRole('heading', { name: /variants with unexpected effects/i })
    ).toBeInTheDocument();
});

test('bundle variant ids are unique', () => {
    const ids = variants.map(variant => variant.id);
    expect(new Set(ids).size).toBe(ids.length);
});

test('every variant belongs to an event in the bundle', () => {
    const eventIds = new Set(events.map(event => event.id));
    variants.forEach(variant => expect(eventIds.has(variant.eventId)).toBe(true));
});

test('stats match the loaded records', () => {
    expect(totals.variants).toBe(variants.length);
    expect(totals.events).toBe(events.length);
});
