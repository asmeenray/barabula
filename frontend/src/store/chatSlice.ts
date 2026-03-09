import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';

interface ChatMessage {
  id: string;
  message: string;
  response: string;
  timestamp: string;
  isUser: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  loading: boolean;
  error: string | null;
  typing: boolean;
}

export const fetchChatHistory = createAsyncThunk(
  'chat/fetchHistory',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: { token: string | null } };
      const token = state.auth.token;
      if (!token) throw new Error('No token');
      const response = await fetch('http://localhost:8000/api/v1/chat/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch history');
      return await response.json();
    } catch (error: any) {
      return rejectWithValue(error.message);
    }
  }
);

const initialState: ChatState = {
  messages: [],
  loading: false,
  error: null,
  typing: false,
};

const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    addMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.messages.push(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setTyping: (state, action: PayloadAction<boolean>) => {
      state.typing = action.payload;
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearError: (state) => {
      state.error = null;
    },
    clearMessages: (state) => {
      state.messages = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchChatHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchChatHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.messages = action.payload;
      })
      .addCase(fetchChatHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  addMessage,
  setLoading,
  setTyping,
  setError,
  clearError,
  clearMessages,
} = chatSlice.actions;

export default chatSlice.reducer;
