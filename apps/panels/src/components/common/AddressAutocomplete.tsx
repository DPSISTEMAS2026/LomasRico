
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
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;

    const { isLoaded, loadError } = useLoadScript({
        googleMapsApiKey: apiKey || '',
        id: 'google-map-script',
        libraries,
    });

    if (!apiKey) return <ManualInput onSelect={onSelect} defaultValue={defaultValue} placeholder={placeholder} />;
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
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10">
                <MapPin size={18} />
            </div>
            <input
                value={value}
                onChange={(e) => {
                    setValue(e.target.value);
                    if (!e.target.value) onSelect({ address: '' });
                }}
                disabled={!ready}
                className="w-full bg-white pl-11 pr-10 py-3 rounded-2xl text-xs font-bold border-2 border-transparent focus:border-slate-900 outline-none transition-all shadow-sm focus:shadow-md"
                placeholder={placeholder}
                onFocus={() => {
                    // Pre-seleccionar texto al enfocar para facilitar el cambio
                    if (value) (document.activeElement as HTMLInputElement)?.select();
                }}
            />

            {status === "OK" && (
                <ul className="absolute z-[100] bottom-full mb-3 w-full bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 overflow-hidden max-h-60 overflow-y-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="p-3 bg-slate-50 border-b border-slate-100 text-[9px] font-black uppercase text-slate-400 tracking-widest italic px-5">Direcciones Sugeridas</div>
                    {data.map(({ place_id, description }) => (
                        <li
                            key={place_id}
                            onClick={() => handleSelect(description)}
                            className="p-4 hover:bg-orange-50 cursor-pointer font-bold text-[11px] text-slate-700 border-b border-slate-50 last:border-none flex items-center gap-3 transition-colors group/item"
                        >
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover/item:bg-orange-500 group-hover/item:text-white transition-all">
                                <MapPin size={14} />
                            </div>
                            <span className="uppercase italic tracking-tighter truncate">{description}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function ManualInput({ onSelect, defaultValue = '', placeholder, error, loading }: Props & { error?: boolean, loading?: boolean }) {
    const [val, setVal] = useState(defaultValue);

    const handleConfirm = () => {
        if (val && val.trim()) {
            onSelect({ address: val });
        }
    };

    return (
        <div className="relative w-full flex gap-2">
            <div className="relative flex-1">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
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
                    placeholder={loading ? 'Cargando mapa...' : (placeholder || 'Ingresa tu dirección manual...')}
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
