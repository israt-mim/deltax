import { createContext, useContext } from "react";

export const VariablesContext = createContext<Record<string, string>>({});

export function useVariables(): Record<string, string> {
	return useContext(VariablesContext);
}
