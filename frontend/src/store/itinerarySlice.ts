import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Itinerary {
  id: string;
  title: string;
  destination: string;
  startDate: string;
  endDate: string;
  activities: any[];
}

interface ItineraryState {
  itineraries: Itinerary[];
  currentItinerary: Itinerary | null;
  loading: boolean;
  error: string | null;
}

const initialState: ItineraryState = {
  itineraries: [],
  currentItinerary: null,
  loading: false,
  error: null,
};

const itinerarySlice = createSlice({
  name: 'itineraries',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setItineraries: (state, action: PayloadAction<Itinerary[]>) => {
      state.itineraries = action.payload;
      state.loading = false;
    },
    setCurrentItinerary: (state, action: PayloadAction<Itinerary>) => {
      state.currentItinerary = action.payload;
    },
    addItinerary: (state, action: PayloadAction<Itinerary>) => {
      state.itineraries.push(action.payload);
    },
    updateItinerary: (state, action: PayloadAction<Itinerary>) => {
      const index = state.itineraries.findIndex(item => item.id === action.payload.id);
      if (index !== -1) {
        state.itineraries[index] = action.payload;
      }
      if (state.currentItinerary?.id === action.payload.id) {
        state.currentItinerary = action.payload;
      }
    },
    removeItinerary: (state, action: PayloadAction<string>) => {
      state.itineraries = state.itineraries.filter(item => item.id !== action.payload);
      if (state.currentItinerary?.id === action.payload) {
        state.currentItinerary = null;
      }
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setItineraries,
  setCurrentItinerary,
  addItinerary,
  updateItinerary,
  removeItinerary,
  setError,
  clearError,
} = itinerarySlice.actions;

export default itinerarySlice.reducer;
