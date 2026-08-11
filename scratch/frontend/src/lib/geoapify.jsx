/**
 * geoapify.jsx
 *
 * Shared Geoapify utilities used across PostRequirement and ManageRequirements.
 * API key is always read from the environment — never hardcoded.
 *
 * Exports:
 *   reverseGeocode(lat, lon) → Promise<string>   human-readable address
 *   GeoapifyAutocomplete     → React component   location search with dropdown
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader } from 'lucide-react';

// ─── Reverse geocoding ────────────────────────────────────────────────────────

/**
 * Reverse-geocodes a lat/lon pair using the Geoapify Reverse Geocoding API.
 * Returns the best available human-readable address string.
 *
 * Throws an Error (with a user-friendly message) when:
 *   - the API returns no results
 *   - the network request fails
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<string>}
 */
export async function reverseGeocode(lat, lon) {
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;
  const url =
    `https://api.geoapify.com/v1/geocode/reverse` +
    `?lat=${lat}&lon=${lon}&format=json&apiKey=${apiKey}`;

  let data;
  try {
    const res = await fetch(url);
    data = await res.json();
  } catch {
    throw new Error(
      'Reverse geocoding failed: unable to reach the location service. ' +
      'Check your internet connection and try again.'
    );
  }

  const results = data?.results ?? [];
  if (results.length === 0) {
    throw new Error(
      'No address found for these coordinates. ' +
      'Please verify the values or use the location search instead.'
    );
  }

  const r = results[0];
  // Prefer the most specific label available
  return (
    r.formatted ||
    r.address_line1 ||
    r.name ||
    r.city ||
    `${lat.toFixed(6)}, ${lon.toFixed(6)}`
  );
}

// ─── Autocomplete component ───────────────────────────────────────────────────

/**
 * GeoapifyAutocomplete
 *
 * Props:
 *   value              {string}   controlled input value (location name)
 *   onChange           {fn}       called with new text string on every keystroke
 *   onSuggestionSelect {fn}       called with { address, lat, lon } on selection
 */
export const GeoapifyAutocomplete = ({ value, onChange, onSuggestionSelect }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [noResults, setNoResults] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const apiKey = import.meta.env.VITE_GEOAPIFY_API_KEY;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(
    async (text) => {
      if (!text.trim() || text.trim().length < 3) {
        setSuggestions([]);
        setNoResults(false);
        setOpen(false);
        return;
      }
      setSearching(true);
      setNoResults(false);
      try {
        const url =
          `https://api.geoapify.com/v1/geocode/autocomplete` +
          `?text=${encodeURIComponent(text)}&limit=5&format=json&apiKey=${apiKey}`;
        const res = await fetch(url);
        const data = await res.json();
        const results = data?.results ?? [];
        if (results.length === 0) {
          setSuggestions([]);
          setNoResults(true);
          setOpen(true);
        } else {
          setSuggestions(results);
          setNoResults(false);
          setOpen(true);
        }
      } catch {
        setSuggestions([]);
        setNoResults(false);
      } finally {
        setSearching(false);
      }
    },
    [apiKey]
  );

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const handleSelect = (result) => {
    const address = result.formatted || result.address_line1 || result.city || '';
    onSuggestionSelect({ address, lat: result.lat, lon: result.lon });
    setSuggestions([]);
    setNoResults(false);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => (suggestions.length > 0 || noResults) && setOpen(true)}
          placeholder="Search event location..."
          autoComplete="off"
          className="w-full px-3 py-2 pr-8 border border-brand-border rounded-md text-sm text-brand-dark outline-none focus:ring-1 focus:ring-brand-primary"
        />
        {searching && (
          <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
            <Loader className="w-3.5 h-3.5 text-gray-400 animate-spin" />
          </span>
        )}
      </div>

      {open && (
        <ul className="absolute z-50 mt-1 w-full bg-white border border-brand-border rounded-md shadow-md overflow-hidden text-sm">
          {noResults ? (
            <li className="px-4 py-3 text-xs text-gray-500 italic">
              No matching location found.
            </li>
          ) : (
            suggestions.map((result, idx) => (
              <li
                key={idx}
                onMouseDown={() => handleSelect(result)}
                className="px-4 py-2.5 flex items-start space-x-2 hover:bg-brand-secondary cursor-pointer border-b border-brand-border last:border-b-0"
              >
                <MapPin className="w-3.5 h-3.5 text-brand-primary flex-shrink-0 mt-0.5" />
                <span className="text-xs text-brand-dark leading-snug">
                  {result.formatted || result.address_line1 || result.city}
                </span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
};
