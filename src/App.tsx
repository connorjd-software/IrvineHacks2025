import React, { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { mapOptions, stateCenters } from './MapOptions.ts'; // Import the options and state centers
import NewsApp from './news'; // Import NewsApp component
import axios from 'axios'; // Import axios for fetching news
import './App.css';

// Define map container styles
const containerStyle = {
    width: '100%',
    height: '100vh',
};

interface Place {
    lat: number,
    lng: number,
    name: string,
    content: string,
    time: number
}

//state markers for initial markers
const statePlaces = stateCenters.map((sc) => {
    return {
        lat: sc.lat,
        lng: sc.lng,
        name: sc.name,
        content: "state description",
        time: 0,
    } as Place
});

// Function to convert full state name to abbreviation
const stateNameToAbbreviation = (stateName: string) => {
    const states: { [key: string]: string } = {
        'Alabama': 'AL',
        'Alaska': 'AK',
        'Arizona': 'AZ',
        'Arkansas': 'AR',
        'California': 'CA',
        'Colorado': 'CO',
        'Connecticut': 'CT',
        'Delaware': 'DE',
        'Florida': 'FL',
        'Georgia': 'GA',
        'Hawaii': 'HI',
        'Idaho': 'ID',
        'Illinois': 'IL',
        'Indiana': 'IN',
        'Iowa': 'IA',
        'Kansas': 'KS',
        'Kentucky': 'KY',
        'Louisiana': 'LA',
        'Maine': 'ME',
        'Maryland': 'MD',
        'Massachusetts': 'MA',
        'Michigan': 'MI',
        'Minnesota': 'MN',
        'Mississippi': 'MS',
        'Missouri': 'MO',
        'Montana': 'MT',
        'Nebraska': 'NE',
        'Nevada': 'NV',
        'New Hampshire': 'NH',
        'New Jersey': 'NJ',
        'New Mexico': 'NM',
        'New York': 'NY',
        'North Carolina': 'NC',
        'North Dakota': 'ND',
        'Ohio': 'OH',
        'Oklahoma': 'OK',
        'Oregon': 'OR',
        'Pennsylvania': 'PA',
        'Rhode Island': 'RI',
        'South Carolina': 'SC',
        'South Dakota': 'SD',
        'Tennessee': 'TN',
        'Texas': 'TX',
        'Utah': 'UT',
        'Vermont': 'VT',
        'Virginia': 'VA',
        'Washington': 'WA',
        'West Virginia': 'WV',
        'Wisconsin': 'WI',
        'Wyoming': 'WY'
    };
    return states[stateName] || '';
};

const App: React.FC = () => {
    // Load the Google Maps script using the hook
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    });

    const [selectedMarker, setSelectedMarker] = useState<Place | null>(null);
    const [center, setCenter] = useState({ lat: 39.8283, lng: -98.5795 });
    const [zoom, setZoom] = useState(4);  // Initialize zoom level
    const [map, setMap] = useState<google.maps.Map | null>(null);  // Store map instance
    const [markers, setMarkers] = useState<Place[]>(statePlaces);
    const [viewing, setViewing] = useState<boolean>(false);
    const [viewedMarker, setViewedMarker] = useState<Place | null>(null);
    const [newsArticles, setNewsArticles] = useState<any[]>([]); // State to store news articles
    const [queryCount, setQueryCount] = useState<{ [key: string]: number }>({}); // State to store query counts
    const [totalQueries, setTotalQueries] = useState(0); // State to store total query count
    const cache = useRef<{ [key: string]: any[] }>({}); // Cache to store fetched news articles
    const mapRef = useRef(null);

    // Handle zoom changes
    const onZoomChanged = useCallback(() => {
        if (map) {
            const newZoom = map.getZoom() || 4; // Get the current zoom level
            setZoom(newZoom); // Update the zoom state
        }
    }, [map]);  // Ensure this depends on `map` state

    // Set map instance on load
    const onLoad = useCallback((mapInstance: google.maps.Map) => {
        setMap(mapInstance);  // Set the map instance when the map is loaded
        mapInstance.addListener("zoom_changed", onZoomChanged);  // Add zoom change listener
    }, [onZoomChanged]); // Only re-create the listener when `onZoomChanged` changes

    // Function to fetch news based on selected marker
    const fetchNews = async (state: string) => {
        const stateAbbreviation = stateNameToAbbreviation(state);
        if (!stateAbbreviation) {
            console.error(`Invalid state name: ${state}`);
            return;
        }

        if (totalQueries >= 5) {
            console.log("Total query limit reached");
            return;
        }

        const cacheKey = stateAbbreviation;
        if (cache.current[cacheKey]) {
            setNewsArticles(cache.current[cacheKey]);
            console.log(`Loaded from cache: ${cacheKey}`, cache.current[cacheKey]);
            return;
        }

        if (queryCount[cacheKey] && queryCount[cacheKey] >= 5) {
            console.log(`Query limit reached for ${cacheKey}`);
            return;
        }

        const apiKey = "02d69c3b-9e5e-4306-bf6b-4dc895d872fe"; // Replace with your actual API key
        const url = `https://api.goperigon.com/v1/all?&country=us&language=en&state=${encodeURIComponent(stateAbbreviation)}&from=2025-01-20&apiKey=${apiKey}`;

        try {
            const response = await axios.get(url);
            if (response.data && response.data.articles && response.data.articles.length > 0) {
                setNewsArticles(response.data.articles); // Set the fetched articles
                cache.current[cacheKey] = response.data.articles; // Cache the articles
                console.log(`Loaded from API: ${cacheKey}`, response.data.articles);
            } else {
                setNewsArticles([]);
                console.log(`No articles found for ${cacheKey}`);
            }
        } catch (err) {
            console.error("Error fetching news:", err);
        }

        setQueryCount((prev) => ({
            ...prev,
            [cacheKey]: (prev[cacheKey] || 0) + 1,
        }));
        setTotalQueries((prev) => prev + 1); // Increment total query count
    };

    return isLoaded ? (
        <div>
            <GoogleMap
                mapContainerStyle={containerStyle}  // Set the container size
                center={center}  // Set the center of the map
                zoom={zoom}  // Adjust zoom level to show the states
                options={mapOptions}  // Pass map options (e.g., disable controls, etc.)
                onLoad={onLoad}  // Handle map load event to get map instance
            >
                {markers.map((m) => (
                    <Marker
                        key={m.name}
                        position={{ lat: m.lat, lng: m.lng }}
                        title={m.name}
                        onClick={() => {
                            setSelectedMarker(m);
                            fetchNews(m.name); // Fetch news for the selected marker
                            setCenter({ lat: m.lat, lng: m.lng }); // Center the map on the selected marker
                            setZoom(8); // Zoom in to the selected marker
                        }}  // Set the selected state on marker click
                    />
                ))}

                {/* Display InfoWindow when a state marker is clicked */}
                {selectedMarker && (
                    <InfoWindow
                        position={{ lat: selectedMarker.lat, lng: selectedMarker.lng }}
                        onCloseClick={() => { setSelectedMarker(null); setViewing(false) }}
                    >
                        <div onClick={() => { setViewing(true); setViewedMarker(selectedMarker) }}>
                            <h3>{selectedMarker.name}</h3>
                            <NewsApp articles={newsArticles} /> {/* Display news articles in InfoWindow */}
                        </div>
                    </InfoWindow>
                )}
            </GoogleMap>
            <div
                style={{
                    position: 'absolute',
                    top: '5vh',
                    right: viewing ? '5vw' : '-40vw',
                    backgroundColor: 'white',
                    padding: 10,
                    height: '80vh',
                    width: '30vw',
                    overflowY: 'scroll',
                    color: "black",
                    transition: '1s'
                }}
            >
                <button onClick={() => setViewing(false)}>exit</button>
                <h3>{viewedMarker?.name}</h3>
                <p>{viewedMarker?.content}</p>
                <NewsApp articles={newsArticles} /> {/* Pass news articles to NewsApp */}
            </div>
        </div>
    ) : (
        <div>Loading...</div>  // Show loading indicator while the map is loading
    );
};

export default App;
