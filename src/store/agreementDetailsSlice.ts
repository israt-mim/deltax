import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import { getAgreementDetails, type AgreementDetailsResponse } from "../api/services/agreementDetails";

export interface AgreementDetailsState {
	data: AgreementDetailsResponse | null;
	status: "idle" | "loading" | "succeeded" | "failed";
	error: string | null;
}

const initialState: AgreementDetailsState = {
	data: null,
	status: "idle",
	error: null,
};

export const fetchAgreementDetailsOnAppLoad = createAsyncThunk<
	AgreementDetailsResponse,
	void,
	{
		rejectValue: string;
		state: { agreementDetails: AgreementDetailsState };
	}
>(
	"agreementDetails/fetchOnAppLoad",
	async (_unused, { rejectWithValue }) => {
		try {
			return await getAgreementDetails({ active_only: true });
		} catch (error) {
			const message = error instanceof Error ? error.message : "Could not load agreement details.";
			return rejectWithValue(message);
		}
	},
	{
		condition: (_unused, { getState }) => {
			const status = getState().agreementDetails.status;
			return status === "idle";
		},
	}
);

const agreementDetailsSlice = createSlice({
	name: "agreementDetails",
	initialState,
	reducers: {},
	extraReducers: (builder) => {
		builder
			.addCase(fetchAgreementDetailsOnAppLoad.pending, (state) => {
				state.status = "loading";
				state.error = null;
			})
			.addCase(fetchAgreementDetailsOnAppLoad.fulfilled, (state, action) => {
				state.status = "succeeded";
				state.data = action.payload;
				state.error = null;
			})
			.addCase(fetchAgreementDetailsOnAppLoad.rejected, (state, action) => {
				state.status = "failed";
				state.error = action.payload ?? action.error.message ?? "Could not load agreement details.";
			});
	},
});

export const agreementDetailsReducer = agreementDetailsSlice.reducer;
