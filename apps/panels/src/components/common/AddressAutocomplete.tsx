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

    if (!apiKey) return <ManualInput onSelect={onSelect} defaultValue={defaultValue} placeholder={placeholder} error />;
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

    return (
        <div className="relative w-full group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800 z-10">
                <MapPin size={18} />
            </div>
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={!ready}
                className="w-full bg-white pl-11 pr-10 py-3 rounded-2xl text-xs font-bold border-2 border-transparent focus:border-slate-900 outline-none transition-all shadow-sm focus:shadow-md"
                placeholder={ready ? placeholder : 'Cargando sugerencias...'}
                onFocus={() => {
                    if (value) (document.activeElement as HTMLInputElement)?.select();
                }}
            />

            {fetchStatus === 'ok' && items.length > 0 && (
                <ul className="absolute z-[100] bottom-full mb-3 w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="p-3 bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase text-slate-800 tracking-widest italic px-5">
                        Direcciones Sugeridas
                    </div>
                    {items.map((item) => (
                        <li
                            key={item.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => void handleSelectPrediction(item)}
                            className="p-4 hover:bg-orange-50 cursor-pointer font-bold text-[11px] text-slate-700 border-b border-slate-50 last:border-none flex items-center gap-3 transition-colors group/item"
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover/item:bg-orange-500 group-hover/item:text-white transition-all">
                                <MapPin size={14} />
                            </div>
                            <span className="uppercase italic tracking-tighter truncate">{item.description}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function ManualInput({ onSelect, defaultValue = '', placeholder, error, loading }: Props & { error?: boolean; loading?: boolean }) {
    const [val, setVal] = useState(defaultValue);

    const handleConfirm = () => {
        if (val && val.trim()) {
            onSelect({ address: val });
        }
    };

    return (
        <div className="relative w-full flex gap-2">
            <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-800">
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
                </div>
                <input
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirm();
                    }}
                    onBlur={handleConfirm}
                    className={`w-full bg-white pl-11 pr-4 py-3 rounded-2xl text-xs font-bold border-2 outline-none transition-all shadow-sm ${error ? 'border-red-200 bg-red-50' : 'border-transparent focus:border-slate-900'}`}
                    placeholder={loading ? 'Cargando mapa...' : placeholder || 'Ingresa tu dirección manual...'}
                    disabled={loading}
                />
            </div>
            {!loading && (
                <button
                    onClick={handleConfirm}
                    className="bg-slate-900 text-white px-4 rounded-2xl text-[10px] font-black uppercase italic hover:bg-orange-500 transition-colors"
                >
                    Calcular
                </button>
            )}
        </div>
    );
}
