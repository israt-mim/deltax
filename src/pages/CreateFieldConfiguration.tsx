import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Switch } from "antd";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { CardMain } from "../components/base/CardMain";
import { Title } from "../components/base/Title";
import { Stepper, type StepperStep } from "../components/base/Stepper";
import { Button } from "../components/base/Button";
import { FormInput } from "../components/form-input/FormInput";
import { FormCreatableSelect } from "../components/form-input/FormCreatableSelect";

const STEPS: StepperStep[] = [
	{ key: "details", label: "Details" },
	{ key: "type", label: "Type" },
	{ key: "mapping", label: "Mapping" },
];

const GROUP_OPTIONS = [
	{ value: "testGroup", label: "testGroup" },
	{ value: "sales", label: "Sales" },
	{ value: "procurement", label: "Procurement" },
	{ value: "hr", label: "HR" },
];

const CONTEXT_OPTIONS = [
	{ value: "Global", label: "Global" },
	{ value: "Sales", label: "Sales - Contracts" },
	{ value: "PublicSector", label: "Public Sector - Projects" },
];

interface ToggleFieldProps {
	label: string;
	checked: boolean;
	onChange: (val: boolean) => void;
	icon?: React.ReactNode;
}

const ToggleField = ({ label, checked, onChange, icon }: ToggleFieldProps) => (
	<div className="flex flex-col gap-1.5">
		<span className="text-xs text-neutral-500 dark:text-neutral-400">{label}</span>
		<div className="flex items-center gap-2">
			{icon ? (
				<button
					onClick={() => onChange(!checked)}
					className={`w-8 h-5 rounded-full flex items-center justify-center transition-colors ${checked ? "bg-success-500 text-white" : "bg-neutral-200 dark:bg-black-500 text-neutral-400"}`}
				>
					{icon}
				</button>
			) : (
				<Switch
					size="small"
					checked={checked}
					onChange={onChange}
					className={checked ? "!bg-success-500" : ""}
				/>
			)}
			<span className="text-sm text-neutral-700 dark:text-neutral-300">
				{checked ? "Yes" : "No"}
			</span>
		</div>
	</div>
);

const DetailsStep = () => {
	const [name, setName] = useState("test");
	const [group, setGroup] = useState<string>("testGroup");
	const [groupTechName, setGroupTechName] = useState("testgroup");
	const [context, setContext] = useState("Global");
	const [tags, setTags] = useState<string[]>([]);
	const [tooltip, setTooltip] = useState("");
	const [visible, setVisible] = useState(true);
	const [required, setRequired] = useState(false);
	const [disabled, setDisabled] = useState(false);
	const [locked, setLocked] = useState(false);

	return (
		<div className="flex flex-col gap-5">
			<div className="grid grid-cols-2 gap-x-8 gap-y-4">
				<FormInput
					label="Name"
					required
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Enter name"
				/>
				<FormCreatableSelect
					label="Group"
					required
					allowCreate
					value={group}
					onChange={(val) => setGroup(String(val ?? ""))}
					options={GROUP_OPTIONS}
					placeholder="Select group"
				/>
				<FormInput
					label="Group technical name"
					value={groupTechName}
					onChange={(e) => setGroupTechName(e.target.value)}
					placeholder="Enter group technical name"
				/>
				<FormCreatableSelect
					label="Context"
					allowCreate
					value={context}
					onChange={(val) => setContext(String(val ?? ""))}
					options={CONTEXT_OPTIONS}
					placeholder="Select context or type to create"
				/>
			</div>

			<FormCreatableSelect
				label="Tags"
				tags
				multiple
				value={tags}
				onChange={(val) => setTags(val as string[])}
				placeholder="Select an option or create one"
				options={[
					{ value: "REQUIRED", label: "REQUIRED" },
					{ value: "CUSTOM", label: "CUSTOM" },
					{ value: "SYSTEM", label: "SYSTEM" },
				]}
			/>

			<FormInput
				label="Tooltip"
				value={tooltip}
				onChange={(e) => setTooltip(e.target.value)}
				placeholder="Enter tooltip"
			/>

			<div className="grid grid-cols-4 gap-6 pt-2">
				<ToggleField label="Visible" checked={visible} onChange={setVisible} />
				<ToggleField label="Required" checked={required} onChange={setRequired} />
				<ToggleField label="Disabled" checked={disabled} onChange={setDisabled} />
				<ToggleField
					label="Locked"
					checked={locked}
					onChange={setLocked}
					icon={<LockOutlinedIcon sx={{ fontSize: 12 }} />}
				/>
			</div>
		</div>
	);
};

const TypeStep = () => (
	<div className="text-sm text-neutral-500 dark:text-neutral-400 py-8 text-center">
		Type configuration will go here.
	</div>
);

const MappingStep = () => (
	<div className="text-sm text-neutral-500 dark:text-neutral-400 py-8 text-center">
		Mapping configuration will go here.
	</div>
);

const STEP_CONTENT = [DetailsStep, TypeStep, MappingStep];

const CreateFieldConfiguration = () => {
	const navigate = useNavigate();
	const [activeStep, setActiveStep] = useState(0);
	const isFirst = activeStep === 0;
	const isLast = activeStep === STEPS.length - 1;

	const StepComponent = STEP_CONTENT[activeStep];

	return (
		<CardMain className="flex flex-col h-full">
			<div className="flex flex-col gap-6 flex-1">
				<Title>New Field Configuration</Title>
				<Stepper steps={STEPS} activeStep={activeStep} className="max-w-3xl mx-auto w-full" />

				<div className="flex-1 pt-2">
					<StepComponent />
				</div>
			</div>

			<div className="flex items-center justify-between border-t border-neutral-200 dark:border-black-600 pt-4 mt-6 -mx-6 px-6">
				<button
					onClick={() => navigate(-1)}
					className="text-sm font-medium text-primary-500 hover:text-primary-600 dark:text-primary-300 dark:hover:text-primary-200 transition-colors"
				>
					Cancel
				</button>

				<div className="flex items-center gap-3">
					{!isFirst && (
						<Button
							size="md"
							status="secondary-neutral"
							appearance="outlined"
							onClick={() => setActiveStep((s) => s - 1)}
						>
							Back
						</Button>
					)}
					<Button
						size="md"
						onClick={() => {
							if (isLast) {
								navigate("/configure/fields");
							} else {
								setActiveStep((s) => s + 1);
							}
						}}
					>
						{isLast ? "Save" : "Next"}
					</Button>
				</div>
			</div>
		</CardMain>
	);
};

export default CreateFieldConfiguration;
