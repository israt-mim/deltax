import { configureStore } from "@reduxjs/toolkit";
import { agreementDetailsReducer } from "./agreementDetailsSlice";

export const store = configureStore({
	reducer: {
		agreementDetails: agreementDetailsReducer,
	},
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
