'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLoadScript } from '@react-google-maps/api';
import { MapPin, Loader2 } from 'lucide-react';
import { LOCATION } from '@lomasrico/shared-types';
import { quietError } from '../../lib/quietLog';

interface Props {
    onSelect: (data: { address: string; lat?: number; lng?: number }) => void;
    placeholder?: string;
    defaultValue?: string;
}

type SuggestionItem = {
    id: string;
    description: string;
    prediction: google.maps.places.PlacePrediction;
};

const libraries: 'places'[] = ['places'];

function biasToLocal(address: string) {
    const raw = String(address || '').trim();
    if (!raw) return raw;
    if (/concepci[oó]n/i.test(raw)) return raw;
    return `${raw}, Concepción, Chile`;
}

export default function AddressAutocomplete({ onSelect, placeholder = 'Buscar dirección...', defaultValue = '' }: Props) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '';
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: apiKey,
        id: 'google-map-script',
        libraries,
    });

    if (!apiKey) {
        return <ManualInput onSelect={onSelect} defaultValue={defaultValue} placeholder={placeholder} error />;
    }
    if (loadError) return <ManualInput onSelect={onSelect} defaultValue={defaultValue} placeholder={placeholder} error />;
    if (!isLoaded) return <ManualInput onSelect={onSelect} defaultValue={defaultValue} placeholder={placeholder} loading />;

    return <SearchBox onSelect={onSelect} defaultValue={defaultValue} placeholder={placeholder} />;
}

function SearchBox({ onSelect, defaultValue = '', placeholder }: Props) {
    const [value, setValue] = useState(defaultValue);
    const [items, setItems] = useState<SuggestionItem[]>([]);
    const [ready, setReady] = useState(false);
    const [fetchStatus, setFetchStatus] = useState<'idle' | 'ok' | 'empty' | 'error'>('idle');
    const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const requestSeq = useRef(0);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const places = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
                if (cancelled) return;
                sessionTokenRef.current = new places.AutocompleteSessionToken();
                setReady(!!places.AutocompleteSuggestion);
            } catch (e) {
                quietError('Places library init failed', e);
                setReady(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (defaultValue) setValue(defaultValue);
    }, [defaultValue]);

    const refreshToken = useCallback(async () => {
        const places = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
        sessionTokenRef.current = new places.AutocompleteSessionToken();
    }, []);

    const fetchSuggestions = useCallback(async (input: string) => {
        const seq = ++requestSeq.current;
        const q = input.trim();
        if (q.length < 2) {
            setItems([]);
            setFetchStatus('idle');
            return;
        }
        try {
            const places = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
            if (!sessionTokenRef.current) {
                sessionTokenRef.current = new places.AutocompleteSessionToken();
            }
            const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
                input: q,
                includedRegionCodes: ['cl'],
                language: 'es-CL',
                region: 'cl',
                locationBias: {
                    center: { lat: LOCATION.lat, lng: LOCATION.lng },
                    radius: 12000,
                },
                sessionToken: sessionTokenRef.current,
            });
            if (seq !== requestSeq.current) return;

            const mapped: SuggestionItem[] = (suggestions || [])
                .map((s, i) => {
                    const prediction = s.placePrediction;
                    if (!prediction) return null;
                    return {
                        id: prediction.placeId || `s-${i}`,
                        description: prediction.text?.toString?.() || String(prediction.text || ''),
                        prediction,
                    };
                })
                .filter(Boolean) as SuggestionItem[];

            setItems(mapped);
            setFetchStatus(mapped.length ? 'ok' : 'empty');
        } catch (e) {
            if (seq !== requestSeq.current) return;
            setItems([]);
            setFetchStatus('error');
            quietError('AutocompleteSuggestion failed', e);
        }
    }, []);

    const onChange = (next: string) => {
        setValue(next);
        if (!next) {
            setItems([]);
            setFetchStatus('idle');
            onSelect({ address: '' });
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            void fetchSuggestions(next);
        }, 280);
    };

    const handleSelectPrediction = async (item: SuggestionItem) => {
        setValue(item.description);
        setItems([]);
        try {
            const place = item.prediction.toPlace();
            await place.fetchFields({ fields: ['formattedAddress', 'location'] });
            const address = place.formattedAddress || item.description;
            const lat = place.location?.lat?.();
            const lng = place.location?.lng?.();
            onSelect({
                address,
                lat: typeof lat === 'number' ? lat : undefined,
                lng: typeof lng === 'number' ? lng : undefined,
            });
            await refreshToken();
        } catch (e) {
            quietError('Place fetchFields failed', e);
            onSelect({ address: biasToLocal(item.description) });
            await refreshToken();
        }
    };

    const handleManualSubmit = async () => {
        const raw = value.trim();
        if (raw.length <= 3) return;
        setItems([]);
        const query = biasToLocal(raw);
        try {
            const geocoder = new google.maps.Geocoder();
            const { results } = await geocoder.geocode({
                address: query,
                componentRestrictions: { country: 'cl' },
            });
            const first = results?.[0];
            if (first) {
                onSelect({
                    address: first.formatted_address || query,
                    lat: first.geometry.location.lat(),
                    lng: first.geometry.location.lng(),
                });
                return;
            }
        } catch (e) {
            quietError('Error geocoding: ', e);
        }
        onSelect({ address: query });
    };

    return (
        <div className="relative w-full group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900">
                <MapPin size={18} />
            </div>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onBlur={() => {
                    setTimeout(() => {
                        if (items.length === 0) void handleManualSubmit();
                    }, 180);
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleManualSubmit();
                    }
                }}
                disabled={!ready}
                className="w-full p-4 pl-12 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-slate-900 transition-all placeholder:text-slate-900"
                placeholder={ready ? placeholder : 'Cargando sugerencias...'}
            />

            {fetchStatus === 'ok' && items.length > 0 && (
                <ul className="absolute z-50 top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden max-h-60 overflow-y-auto">
                    {items.map((item) => (
                        <li
                            key={item.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => void handleSelectPrediction(item)}
                            className="p-3 hover:bg-slate-50 cursor-pointer font-medium text-xs text-slate-900 border-b border-slate-50 last:border-none flex items-center gap-2"
                        >
                            <MapPin size={14} className="text-slate-900" />
                            {item.description}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function ManualInput({ onSelect, defaultValue, placeholder, error, loading }: Props & { error?: boolean; loading?: boolean }) {
    const [val, setVal] = useState(defaultValue);

    const submit = () => {
        if (val && val.trim().length > 3) {
            onSelect({ address: val.trim() });
        }
    };

    return (
        <div className="relative w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-900">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
            </div>
            <input
                value={val}
                onChange={(e) => setVal(e.target.value)}
                onBlur={submit}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        submit();
                    }
                }}
                className={`w-full p-4 pl-12 rounded-xl bg-slate-50 border font-bold text-sm outline-none transition-all placeholder:text-slate-900 ${error ? 'border-red-200 bg-red-50' : 'border-slate-200 focus:border-slate-900'}`}
                placeholder={loading ? 'Cargando mapa...' : placeholder || 'Ingresa tu dirección manual...'}
                disabled={loading}
            />
        </div>
    );
}
