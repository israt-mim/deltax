import type { CSSProperties } from "react";
import type { SelectProps } from "antd";

export const FORM_SELECT_POPUP_CLASS = "app-form-select-popup";

const popupRootStyle: CSSProperties = {
	zIndex: 2100,
};

/** Defaults so select menus stack above modals and hide form fields beneath. */
export function mergeFormSelectPopupProps(props: SelectProps): SelectProps {
	const { getPopupContainer, classNames, styles, ...rest } = props;

	return {
		...rest,
		getPopupContainer: getPopupContainer ?? (() => document.body),
		classNames: {
			...classNames,
			popup: {
				...classNames?.popup,
				root: [FORM_SELECT_POPUP_CLASS, classNames?.popup?.root].filter(Boolean).join(" "),
			},
		},
		styles: {
			...styles,
			popup: {
				...styles?.popup,
				root: {
					...popupRootStyle,
					...styles?.popup?.root,
				},
			},
		},
	};
}
