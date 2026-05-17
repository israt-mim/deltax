export type PasswordChecks = {
	minLength: boolean;
	hasNumber: boolean;
	hasSpecial: boolean;
};

export function getPasswordChecks(password: string): PasswordChecks {
	return {
		minLength: password.length >= 8,
		hasNumber: /\d/.test(password),
		hasSpecial: /[^A-Za-z0-9]/.test(password),
	};
}

export function isPasswordValid(password: string): boolean {
	const checks = getPasswordChecks(password);
	return checks.minLength && checks.hasNumber && checks.hasSpecial;
}
