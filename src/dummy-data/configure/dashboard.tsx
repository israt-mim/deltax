import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import InputOutlinedIcon from "@mui/icons-material/InputOutlined";

/** Configure landing cards (counts are supplied at runtime from API / local data). */
export const configureDashboardCards = [
	{
		name: "Agreement",
		icon: <DescriptionOutlinedIcon sx={{ fontSize: 24 }} />,
		to: "/configure/agreements" as const,
	},
	{
		name: "Field",
		icon: <InputOutlinedIcon sx={{ fontSize: 24 }} />,
		to: "/configure/fields" as const,
	},
] as const;
