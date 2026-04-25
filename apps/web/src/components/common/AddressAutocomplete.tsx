
'use client';

import { useState, useEffect } from 'react';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { useLoadScript } from '@react-google-maps/api';
import { MapPin, Loader2 } from 'lucide-react';

interface Props {
    onSelect: (data: { address: string; lat?: number; lng?: number }) => void;
    placeholder?: string;
    defaultValue?: string;
}

const libraries: ("places")[] = ["places"];

export default function AddressAutocomplete({ onSelect, placeholder = "Buscar dirección...", defaultValue = "" }: Props) {
    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || '',
        libraries,
    });

    if (loadError) return <ManualInput onSelect={onSelect} defaultValue={defaultValue} placeholder={placeholder} error />;
    if (!isLoaded) return <ManualInput onSelect={onSelect} defaultValue={defaultValue} placeholder={placeholder} loading />;

    return <SearchBox onSelect={onSelect} defaultValue={defaultValue} placeholder={placeholder} />;
}

function SearchBox({ onSelect, defaultValue, placeholder }: Props) {
    const {
        ready,
        value,
        setValue,
        suggestions: { status, data },
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            componentRestrictions: { country: "cl" }, // Chile only
            locationBias: "IP_BIAS",
        },
        defaultValue,
        debounce: 300,
    });

    useEffect(() => {
        if (defaultValue) setValue(defaultValue, false);
    }, [defaultValue, setValue]);

    const handleSelect = async (address: string) => {
        setValue(address, false);
        clearSuggestions();

        try {
            const results = await getGeocode({ address });
            const { lat, lng } = await getLatLng(results[0]);
            onSelect({ address, lat, lng });
        } catch (error) {
            console.error("Error geocoding: ", error);
            // Fallback to text only
            onSelect({ address });
        }
    };

    return (
        <div className="relative w-full group">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <MapPin size={18} />
            </div>
            <input
                value={value}
                onChange={(e) => {
                    setValue(e.target.value);
                    if (!e.target.value) onSelect({ address: '' });
                }}
                disabled={!ready}
                className="w-full p-4 pl-12 rounded-xl bg-slate-50 border border-slate-200 font-bold text-sm outline-none focus:border-slate-900 transition-all placeholder:text-slate-400"
                placeholder={placeholder}
            />

            {status === "OK" && (
                <ul className="absolute z-50 top-full mt-2 w-full bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden max-h-60 overflow-y-auto">
                    {data.map(({ place_id, description }) => (
                        <li
                            key={place_id}
                            onClick={() => handleSelect(description)}
                            className="p-3 hover:bg-slate-50 cursor-pointer font-medium text-xs text-slate-700 border-b border-slate-50 last:border-none flex items-center gap-2"
                        >
                            <MapPin size={14} className="text-slate-400" />
                            {description}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function ManualInput({ onSelect, defaultValue, placeholder, error, loading }: Props & { error?: boolean, loading?: boolean }) {
    const [val, setVal] = useState(defaultValue);

    return (
        <div className="relative w-full">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                {loading ? <Loader2 size={18} className="animate-spin" /> : <MapPin size={18} />}
            </div>
            <input
                value={val}
                onChange={(e) => {
                    setVal(e.target.value);
                    onSelect({ address: e.target.value });
                }}
                className={`w-full p-4 pl-12 rounded-xl bg-slate-50 border font-bold text-sm outline-none transition-all placeholder:text-slate-400 ${error ? 'border-red-200 bg-red-50' : 'border-slate-200 focus:border-slate-900'}`}
                placeholder={loading ? 'Cargando mapa...' : (placeholder || 'Ingresa tu dirección manual...')}
                disabled={loading}
            />
        </div>
    );
}
