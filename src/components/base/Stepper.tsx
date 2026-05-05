import cn from "classnames";

export interface StepperStep {
	key: string;
	label: string;
}

export interface StepperProps {
	steps: StepperStep[];
	activeStep: number;
	className?: string;
	/** When set, clicking a step moves the wizard to that index. */
	onStepClick?: (index: number) => void;
}

export const Stepper = ({ steps, activeStep, className, onStepClick }: StepperProps) => {
	return (
		<div className={cn("flex items-center w-full", className)}>
			{steps.map((step, i) => {
				const isCompleted = i < activeStep;
				const isActive = i === activeStep;
				const isLast = i === steps.length - 1;

				const circle = (
					<div
						className={cn(
							"w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors",
							isCompleted && "bg-primary-500 text-white",
							isActive && "bg-primary-500 text-white",
							!isCompleted && !isActive && "bg-neutral-200 dark:bg-black-500 text-neutral-500 dark:text-neutral-400"
						)}
					>
						{isCompleted ? (
							<svg width="12" height="12" viewBox="0 0 12 12" fill="none">
								<path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						) : (
							i + 1
						)}
					</div>
				);

				const label = (
					<span
						className={cn(
							"text-sm font-medium whitespace-nowrap",
							(isActive || isCompleted)
								? "text-primary-600 dark:text-primary-300"
								: "text-neutral-500 dark:text-neutral-400"
						)}
					>
						{step.label}
					</span>
				);

				const stepHead = onStepClick ? (
					<button
						type="button"
						onClick={() => onStepClick(i)}
						className="flex items-center gap-2 shrink-0 rounded-md border-0 bg-transparent p-0 text-left transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40"
					>
						{circle}
						{label}
					</button>
				) : (
					<div className="flex items-center gap-2 shrink-0">
						{circle}
						{label}
					</div>
				);

				return (
					<div key={step.key} className={cn("flex items-center", !isLast && "flex-1")}>
						{stepHead}

						{!isLast && (
							<div
								className={cn(
									"h-0.5 flex-1 mx-3 rounded-full transition-colors",
									i < activeStep
										? "bg-primary-500"
										: "bg-neutral-200 dark:bg-black-500"
								)}
							/>
						)}
					</div>
				);
			})}
		</div>
	);
};
